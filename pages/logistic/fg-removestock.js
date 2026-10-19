
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';
import BarcodeScanner from '../../components/BarcodeScanner';

const FGRemoveStock = ({ plant }) => {
  const { user } = useAuth();

  // Form state
  const [lmgNumber, setLmgNumber] = useState('');
  const [destination, setDestination] = useState(''); // New state for destination
  
  // Data & UI state
  const [existingStock, setExistingStock] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Scanner visibility
  const [showLmgScanner, setShowLmgScanner] = useState(false);

  // Debounce effect for LMG number input to fetch data automatically
  useEffect(() => {
    const handler = setTimeout(() => {
      if (lmgNumber && plant) {
        fetchStockData(lmgNumber, plant);
      } else if (!lmgNumber) {
        setExistingStock(null);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [lmgNumber, plant]);

  // Function to fetch existing stock data
  const fetchStockData = useCallback(async (lmg, currentPlant) => {
    setLoading(true);
    setError(null);
    setExistingStock(null);

    const { data, error } = await supabase
      .from('fg_stock')
      .select('*')
      .eq('lmg_number', lmg)
      // .eq('plant', currentPlant) // Plant check might be needed depending on requirements
      .single();

    if (error && error.code !== 'PGRST116') {
      setError(`Error fetching stock: ${error.message}`);
    } else if (!data) {
      setError('This LMG number does not exist in the stock.');
    } else {
      setExistingStock(data);
    }

    setLoading(false);
  }, []);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
          setMessage(null);
          setError(null);
        }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!plant) {
      setError('No plant selected.');
      setSubmitting(false);
      return;
    }
    
    if (!existingStock) {
      setError('Cannot submit. This LMG is not in stock.');
      setSubmitting(false);
      return;
    }

    if (!destination) {
      setError('Please select a destination.');
      setSubmitting(false);
      return;
    }

    // Determine movement type based on destination
    const movementTypeMap = {
        'Production': '701',
        'Slitter': '702',
        'Ballpress': '703',
    };
    const movementType = movementTypeMap[destination];
    const userDisplayName = user?.user_metadata?.display_name || user?.email;

    // 1. Record the movement in the history table
    const { error: movementError } = await supabase.from('fg_stock_movements').insert({
        lmg_number: existingStock.lmg_number,
        movement_type: movementType,
        initial_loc: existingStock.bin_location,
        destination_loc: destination,
        user_id: userDisplayName,
        plant: existingStock.plant,
        so_number: existingStock.so_number,
        customer_name: existingStock.customer_name,
        print_design: existingStock.print_design,
    });
    
    if (movementError) {
        setError(`Failed to record movement: ${movementError.message}`);
        setSubmitting(false);
        return;
    }

    // 2. Remove the record from the main fg_stock table
    const { error: deleteError } = await supabase
      .from('fg_stock')
      .delete()
      .eq('lmg_number', existingStock.lmg_number);

    if (deleteError) {
        // Here you might want to handle the inconsistency, e.g., by trying to delete the movement record
        setError(`Movement recorded, but failed to remove stock: ${deleteError.message}`);
    } else {
        setMessage(`Success! Stock removed to ${destination}.`);
        // Reset form completely
        setLmgNumber('');
        setDestination('');
        setExistingStock(null);
    }

    setSubmitting(false);
  };

  return (
    <div>
      <h2>FG Remove Stock</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {showLmgScanner && 
        <BarcodeScanner 
          onScanSuccess={(txt) => { 
            setLmgNumber(txt.toUpperCase()); 
            setShowLmgScanner(false); 
          }}
          onScanError={(err) => setError(err)}
          onCancel={() => setShowLmgScanner(false)}
        />
      }

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          {/* Input Column */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="lmgNumber">LMG Number</label>
            <input
              type="text"
              id="lmgNumber"
              value={lmgNumber}
              onChange={(e) => setLmgNumber(e.target.value.toUpperCase())}
              required
              disabled={submitting}
            />
            <button type="button" onClick={() => setShowLmgScanner(true)} disabled={submitting}>
              Scan LMG
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="destination">Destination</label>
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              disabled={submitting || !existingStock}
            >
              <option value="" disabled>Select a destination</option>
              <option value="Production">Production</option>
              <option value="Slitter">Slitter</option>
              <option value="Ballpress">Ballpress</option>
            </select>
          </div>
          
          <button type="submit" disabled={submitting || loading || !existingStock || !destination}>
            {submitting ? 'Submitting...' : 'Remove Stock'}
          </button>
        </div>

        <div>
          {/* Data Display Column */}
          <h3>Stock Details</h3>
          {loading ? <p>Loading...</p> : existingStock ? (
            <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
              <p><strong>LMG Number:</strong> {existingStock.lmg_number}</p>
              <p><strong>SO Number:</strong> {existingStock.so_number || 'N/A'}</p>
              <p><strong>Customer:</strong> {existingStock.customer_name || 'N/A'}</p>
              <p><strong>Design:</strong> {existingStock.print_design || 'N/A'}</p>
              <p><strong>Quantity:</strong> {existingStock.quantity || 'N/A'}</p>
              <p><strong>Weight:</strong> {existingStock.weight || 'N/A'}</p>
              <p><strong>Current Location:</strong> {existingStock.bin_location}</p>
            </div>
          ) : (
            <p>Enter an LMG number to see details.</p>
          )}
        </div>
      </form>
    </div>
  );
};

export default FGRemoveStock;
