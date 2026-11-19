import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

const PRReturn = ({ plant }) => {
  const router = useRouter();
  const { roll_id: queryRollId, bin_location } = router.query;
  const [rollId, setRollId] = useState('');
  const [location, setLocation] = useState('');
  const [diameter, setDiameter] = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  const [initialDiameter, setInitialDiameter] = useState('');
  const [initialGsm, setInitialGsm] = useState('');
  const [initialWidth, setInitialWidth] = useState('');
  const [initialLength, setInitialLength] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth() || {};

  const fetchRollData = async (currentRollId) => {
    if (!currentRollId || !plant) return;

    setError('');
    const { data, error } = await supabase
      .from('pr_stock')
      .select('*')
      .eq('roll_id', currentRollId)
      .eq('plant', plant)
      .single();

    if (error) {
      setError(`Roll ID ${currentRollId} not found in plant ${plant}.`);
      setInitialWeight('');
      setInitialDiameter('');
      setInitialGsm('');
      setInitialWidth('');
      setInitialLength('');
    } else if (data) {
      setRollId(data.roll_id);
      setInitialWeight(data.weight);
      setInitialDiameter(data.diameter);
      setInitialGsm(data.gsm);
      setInitialWidth(data.width);
      setInitialLength(data.length);
    }
  };

  useEffect(() => {
    if (queryRollId && plant) {
      setRollId(queryRollId);
      fetchRollData(queryRollId);
    }
  }, [queryRollId, plant]);

  const handleRollIdBlur = () => {
    if (!queryRollId && rollId) {
      fetchRollData(rollId);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleRollIdBlur();
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!user || !plant || !diameter || !location) {
        setError('All fields are required and you must be logged in.');
        return;
    }

    setMessage('');
    setError('');

    try {
        const coreDiameter = 10; // cm
        const returnDiameter = parseFloat(diameter);
        const initialDia = parseFloat(initialDiameter);
        const initialWt = parseFloat(initialWeight);
        const initialLen = parseFloat(initialLength);
        const gsm = parseFloat(initialGsm);
        const width = parseFloat(initialWidth);

        if (returnDiameter >= initialDia) {
            throw new Error('Return diameter must be smaller than the initial diameter.');
        }

        const numerator = (returnDiameter ** 2) - (coreDiameter ** 2);
        const denominator = (initialDia ** 2) - (coreDiameter ** 2);

        if (denominator <= 0) {
            throw new Error('Initial diameter is too small for calculation.');
        }

        const newWeightRaw = (numerator / denominator) * initialWt;
        const newWeight = parseFloat(newWeightRaw.toFixed(2));
        const consumedWeight = initialWt - newWeight;

        const areaDensityKgM2 = gsm / 1000;
        const widthM = width / 100;
        
        const newLength = Math.ceil(newWeightRaw / (areaDensityKgM2 * widthM));
        const consumedLength = initialLen - newLength;

        // Record the return movement
        const { error: movementError } = await supabase.from('pr_stock_movements').insert([
            {
                roll_id: rollId,
                plant: plant,
                movement_type: '202',
                initial_loc: bin_location,
                destination_loc: location,
                weight_in: initialWt,
                diameter_in: initialDia,
                length_in: initialLen,
                weight_out: newWeight,
                diameter_out: returnDiameter,
                length_out: newLength,
                weight: -consumedWeight,
                length: -consumedLength,
                diameter: -(initialDia - returnDiameter),
                batch: 'OLD',
                user_id: user.id,
            },
        ]);

        if (movementError) {
            throw new Error(`Failed to record return movement: ${movementError.message}`);
        }

        // Update the stock record with new values
        const { error: updateError } = await supabase
            .from('pr_stock')
            .update({
                bin_location: location,
                weight: newWeight,
                diameter: returnDiameter,
                length: newLength,
                batch: 'OLD',
                on_production: false,
            })
            .eq('roll_id', rollId)
            .eq('plant', plant);

        if (updateError) {
            throw new Error(`Failed to update stock: ${updateError.message}.`);
        }

        setMessage(`Roll ${rollId} returned to ${location}. New weight: ${newWeight}kg, New length: ${newLength}m.`);
        setTimeout(() => router.push(`/paper-roll/pr-issue?plant=${plant}`), 3000);

    } catch (error) {
        setError(error.message);
    }
  };

  return (
    <div>
      <h1>Return Paper Roll</h1>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleReturn}>
        <div className="form-group">
          <label htmlFor="rollId">Roll ID</label>
          <input
            id="rollId"
            type="text"
            className="form-control"
            value={rollId}
            onChange={(e) => setRollId(e.target.value)}
            onBlur={handleRollIdBlur}
            onKeyDown={handleKeyDown}
            readOnly={!!queryRollId}
            placeholder="Scan or enter Roll ID"
          />
        </div>

        <div className="form-row">
            <div className="form-group col-md-4">
                <label>Initial Weight (kg)</label>
                <input type="text" className="form-control" value={initialWeight} readOnly />
            </div>
            <div className="form-group col-md-4">
                <label>Initial Diameter (cm)</label>
                <input type="text" className="form-control" value={initialDiameter} readOnly />
            </div>
            <div className="form-group col-md-4">
                <label>Initial Length (m)</label>
                <input type="text" className="form-control" value={initialLength} readOnly />
            </div>
        </div>

        <hr />

        <div className="form-group">
          <label htmlFor="diameter">Return Diameter (cm)</label>
          <input
            id="diameter"
            type="number"
            className="form-control"
            value={diameter}
            onChange={(e) => setDiameter(e.target.value)}
            placeholder="Enter remaining diameter in cm"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="location">Return to Location</label>
          <input
            id="location"
            type="text"
            className="form-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter storage bin location"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Confirm Return
        </button>
        <button type="button" className="btn btn-secondary ml-2" onClick={() => router.back()}>
          Cancel
        </button>
      </form>
    </div>
  );
};

export default PRReturn;
