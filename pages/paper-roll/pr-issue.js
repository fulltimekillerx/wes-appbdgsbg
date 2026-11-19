import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

const PRIssue = ({ plant }) => {
  const router = useRouter();
  const { user } = useAuth() || {};

  // State for the settings form
  const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineNumber, setMachineNumber] = useState('C1');
  const [group, setGroup] = useState('A');
  const [shift, setShift] = useState('1');
  const [areSettingsLocked, setAreSettingsLocked] = useState(false);

  // State for the consumption form
  const [unitName, setUnitName] = useState('CL');
  const [rollId, setRollId] = useState('');
  
  // State for data and UI feedback
  const [productionRolls, setProductionRolls] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetches all rolls with the on_production flag set to true for the current plant
  const fetchProductionRolls = async () => {
    if (!plant) return;
    const { data, error } = await supabase
      .from('pr_stock')
      .select('*')
      .eq('plant', plant)
      .eq('on_production', true);

    if (error) {
      setError(`Failed to fetch production rolls: ${error.message}`);
    } else {
      setProductionRolls(data);
    }
  };

  // Refreshes the list of production rolls whenever the component loads or the plant changes
  useEffect(() => {
    if (plant) {
      fetchProductionRolls();
    }
  }, [plant]);

  // Handles the consumption of a paper roll (moving it to the production line)
  const handleConsume = async (e) => {
    e.preventDefault();
    if (!rollId || !user || !plant) {
      setError('Roll ID, user, and plant are required.');
      return;
    }

    setMessage('');
    setError('');

    try {
      // Retrieve the stock data for the given roll ID and plant
      const { data: stockData, error: fetchError } = await supabase
        .from('pr_stock')
        .select('*')
        .eq('roll_id', rollId)
        .eq('plant', plant)
        .single();

      if (fetchError || !stockData) {
        throw new Error(`Roll ID ${rollId} not found in plant ${plant}.`);
      }

      // Check if the roll is already on a production line
      if (stockData.on_production) {
        throw new Error(`Roll ${stockData.roll_id} is already on a production line.`);
      }

      const destination = `${machineNumber} - ${unitName} - ${group}`;

      // Update the bin location and set the on_production flag to true
      const { error: updateError } = await supabase
        .from('pr_stock')
        .update({ bin_location: destination, on_production: true })
        .eq('roll_id', rollId)
        .eq('plant', plant);

      if (updateError) {
        throw new Error(`Failed to update roll location: ${updateError.message}. Manual correction may be needed.`);
      }

      await fetchProductionRolls();
      setMessage(`Roll ${rollId} successfully moved to production at ${destination}.`);
      setRollId('');
    } catch (error) {
      setError(error.message);
    }
  };

  // Handles returning a roll to the warehouse
  const handleReturn = (roll) => {
    router.push(`/paper-roll/pr-return?roll_id=${roll.roll_id}&bin_location=${roll.bin_location}&plant=${plant}`);
  };

  // Handles marking a roll as fully used up
  const handleUsedUp = async (roll) => {
    try {
        const destination = `${machineNumber} - ${unitName} - ${group}`;

      // Create a 'used up' movement record
      const { error: movementError } = await supabase.from('pr_stock_movements').insert([
        {
          roll_id: roll.roll_id,
          plant: plant,
          movement_type: '201',
          initial_loc: roll.bin_location,
          destination_loc: destination,
          prod_order_no: roll.prod_order_no,
          batch: roll.batch,
          post_date: postDate,
          machine_no: machineNumber,
          group_name: group,
          shift: shift,
          user_id: user.id,
          weight_in: roll.weight,
          diameter_in: roll.diameter,
          length_in: roll.length,
          weight_out: 0,
          diameter_out: 0,
          length_out: 0,
          weight: -roll.weight,
          diameter: -roll.diameter,
          length: -roll.length,
        },
      ]);

      if (movementError) {
        throw new Error(`Failed to record 'used up' movement: ${movementError.message}`);
      }

      // Delete the roll from the pr_stock table as it no longer exists
      const { error: deleteError } = await supabase
        .from('pr_stock')
        .delete()
        .eq('roll_id', roll.roll_id)
        .eq('plant', plant);

      if (deleteError) {
        throw new Error(`Failed to remove roll from stock: ${deleteError.message}.`);
      }

      await fetchProductionRolls();
      setMessage(`Roll ${roll.roll_id} marked as used up and removed from stock.`);
    } catch (error) {
      setError(`Error marking roll as used up: ${error.message}`);
    }
  };
  
  return (
    <div>
      <h1>Issue Paper Roll</h1>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Settings</h5>
          <fieldset disabled={areSettingsLocked}>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label htmlFor="postDate">Post Date</label>
                <input
                  type="date"
                  id="postDate"
                  className="form-control"
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                />
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="machineNumber">Machine Number</label>
                <select
                  id="machineNumber"
                  className="form-control"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                >
                  <option>C1</option>
                  <option>C2</option>
                </select>
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="group">Group</label>
                <select id="group" className="form-control" value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>D</option>
                </select>
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="shift">Shift</label>
                <select id="shift" className="form-control" value={shift} onChange={(e) => setShift(e.target.value)}>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                </select>
              </div>
            </div>
          </fieldset>
          <button 
            className={`btn ${areSettingsLocked ? 'btn-outline-danger' : 'btn-primary'}`}
            onClick={() => setAreSettingsLocked(!areSettingsLocked)}
          >
            {areSettingsLocked ? 'Unlock Settings' : 'Lock Settings'}
          </button>
        </div>
      </div>

      <form onSubmit={handleConsume}>
        <fieldset disabled={!areSettingsLocked}>
          <legend>Consume Roll</legend>
          <div className="form-group">
            <label htmlFor="unitName">Unit Name</label>
            <select
              id="unitName"
              className="form-control"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            >
              <option>CL</option>
              <option>CM</option>
              <option>BL</option>
              <option>BM</option>
              <option>DB</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rollId">Scan Roll ID</label>
            <input
              type="text"
              id="rollId"
              className="form-control"
              value={rollId}
              onChange={(e) => setRollId(e.target.value)}
              placeholder="Scan roll barcode"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Consume Roll
          </button>
        </fieldset>
      </form>

      <h2 className="mt-5">Roll on Production</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Roll ID</th>
            <th>Kind</th>
            <th>GSM</th>
            <th>Width</th>
            <th>Weight</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {productionRolls.length > 0 ? (
            productionRolls.map((roll) => (
              <tr key={roll.roll_id}>
                <td>{roll.roll_id}</td>
                <td>{roll.kind}</td>
                <td>{roll.gsm}</td>
                <td>{roll.width}</td>
                <td>{roll.weight}</td>
                <td>{roll.bin_location}</td>
                <td>
                  <button className="btn btn-sm btn-info mr-2" onClick={() => handleReturn(roll)}>Return</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleUsedUp(roll)}>Used Up</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center">No rolls found in production.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PRIssue;
