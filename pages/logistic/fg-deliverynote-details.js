import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';

const FGDeliveryNoteDetails = ({ plant }) => {
  const router = useRouter();
  const { loading_no } = router.query;
  const [shipmentDetails, setShipmentDetails] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShipmentDetails = async () => {
      if (!loading_no) return;
      try {
        const { data, error } = await supabase
          .from('fg_loading')
          .select('*')
          .eq('loading_no', loading_no);

        if (error) throw error;
        setShipmentDetails(data);
      } catch (err) {
        setError(`Error fetching shipment details: ${err.message}`);
      }
    };

    fetchShipmentDetails();
  }, [loading_no]);

  return (
    <div>
      <h2>Delivery Note Details</h2>
      <h4>Loading No: {loading_no}</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      {shipmentDetails.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>LMG Number</th>
                  <th>SO Number</th>
                  <th>SO Item</th>
                  <th>Customer</th>
                  <th>Design</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {shipmentDetails.map((item) => (
                  <tr key={item.id}>
                    <td>{item.lmg_number}</td>
                    <td>{item.so_number}</td>
                    <td>{item.so_item}</td>
                    <td>{item.customer_name}</td>
                    <td>{item.print_design}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p>No details found for this shipment.</p>
      )}
    </div>
  );
};

export default FGDeliveryNoteDetails;
