import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

const FGDeliveryNote = ({ plant }) => {
  const { user } = useAuth();
  const [loadedData, setLoadedData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLoadedData = async () => {
    if (!plant) return;

    try {
      const { data, error } = await supabase
        .from('fg_loading')
        .select('*')
        .eq('plant', plant)
        .eq('status', 'Loaded');

      if (error) throw error;

      const groupedByLoadingNo = data.reduce((acc, item) => {
        const key = item.loading_no;
        if (!acc[key]) {
          acc[key] = {
            truck_no: item.truck_no,
            items: [],
          };
        }
        acc[key].items.push(item);
        return acc;
      }, {});

      setLoadedData(groupedByLoadingNo);
    } catch (err) {
      setError(`Error fetching loaded data: ${err.message}`);
    }
  };

  useEffect(() => {
    if (plant) {
      fetchLoadedData();
      const channel = supabase.channel('fg_loading_changes_deliverynote');
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fg_loading' }, () => {
          fetchLoadedData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [plant]);

  const handleUpdateStatus = async (loadingNo, newStatus) => {
    setError('');
    setSuccess('');
    
    try {
      const { data: itemsToUpdate, error: fetchError } = await supabase
        .from('fg_loading')
        .select('*')
        .eq('loading_no', loadingNo);

      if (fetchError) throw fetchError;

      if (!itemsToUpdate || itemsToUpdate.length === 0) {
        throw new Error(`No shipment found with Loading No: ${loadingNo}`);
      }

      const { error: updateError } = await supabase
        .from('fg_loading')
        .update({ status: newStatus })
        .eq('loading_no', loadingNo);

      if (updateError) throw updateError;

      if (newStatus === 'Completed') {
        const quantityUpdates = itemsToUpdate.reduce((acc, item) => {
          const key = `${item.so_number}-${item.so_item}`;
          if (!acc[key]) {
            acc[key] = { so_number: item.so_number, so_item: item.so_item, quantity: 0, truck_no: item.truck_no };
          }
          acc[key].quantity += item.quantity;
          return acc;
        }, {});

        for (const update of Object.values(quantityUpdates)) {
          const shippedQty = update.quantity;

          const { data: schedules, error: scheduleError } = await supabase
            .from('fg_delivery_schedule')
            .select('*')
            .eq('so_number', update.so_number)
            .eq('so_item', update.so_item)
            .in('delivery_status', ['Scheduled', 'Loading', 'PartialCarryover'])
            .order('id', { ascending: true })
            .limit(1);

          if (scheduleError) throw scheduleError;
          if (!schedules || schedules.length === 0) {
            console.warn(`No active schedule found for SO ${update.so_number}-${update.so_item}.`);
            continue;
          }
          const originalSchedule = schedules[0];

          const { error: updateScheduleError } = await supabase
            .from('fg_delivery_schedule')
            .update({
              delivery_status: 'Shipped',
              delivery_quantity: shippedQty,
              user_name: user?.email,
              truck_no: update.truck_no,
            })
            .eq('id', originalSchedule.id);

          if (updateScheduleError) throw updateScheduleError;

          if (shippedQty < originalSchedule.outstanding_qty) {
            const { id, created_at, delivery_status, delivery_quantity, outstanding_qty, ...carryoverData } = originalSchedule;
            const newOutstandingQty = originalSchedule.outstanding_qty - shippedQty;

            const { error: carryoverError } = await supabase
              .from('fg_delivery_schedule')
              .insert([{
                ...carryoverData,
                outstanding_qty: newOutstandingQty,
                delivery_status: 'PartialCarryover',
              }]);

            if (carryoverError) throw carryoverError;
          }
        }
      }

      setSuccess(`Shipment ${loadingNo} has been updated to ${newStatus}.`);
      fetchLoadedData(); // Refresh data

    } catch (err) {
      setError(`Error updating shipment: ${err.message}`);
    }
  };

  return (
    <div>
      <h2>FG Delivery Note</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <h3>Shipments Ready for Delivery Note</h3>
      {Object.keys(loadedData).length > 0 ? (
        <div className="card">
          <div className="card-body">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Loading No</th>
                  <th>Truck No</th>
                  <th>LMG Number</th>
                  <th>SO Number</th>
                  <th>SO Item</th>
                  <th>Customer</th>
                  <th>Design</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(loadedData).map(([loadingNo, data]) => (
                  data.items.map((item, index) => (
                    <tr key={item.id}>
                      {index === 0 && (
                        <td rowSpan={data.items.length} style={{ verticalAlign: 'middle' }}>{loadingNo}</td>
                      )}
                      {index === 0 && (
                        <td rowSpan={data.items.length} style={{ verticalAlign: 'middle' }}>{data.truck_no}</td>
                      )}
                      <td>{item.lmg_number}</td>
                      <td>{item.so_number}</td>
                      <td>{item.so_item}</td>
                      <td>{item.customer_name}</td>
                      <td>{item.print_design}</td>
                      <td>{item.quantity}</td>
                      {index === 0 && (
                        <td rowSpan={data.items.length} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => handleUpdateStatus(loadingNo, 'Completed')}
                          >
                            DN Completed
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p>No shipments are currently marked as 'Loaded'.</p>
      )}
    </div>
  );
};

export default FGDeliveryNote;
