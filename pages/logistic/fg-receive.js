
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';
import BarcodeScanner from '../../components/BarcodeScanner';

const FGReceive = ({ plant }) => {
  const { user } = useAuth();

  // Form state
  const [lmgNumber, setLmgNumber] = useState('');
  const [binLocation, setBinLocation] = useState('');
  
  // Data & UI state
  const [stockIdentity, setStockIdentity] = useState(null);
  const [existingStock, setExistingStock] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Scanner visibility
  const [showLmgScanner, setShowLmgScanner] = useState(false);
  const [showBinScanner, setShowBinScanner] = useState(false);

  // Debounce effect for LMG number input to fetch data automatically
  useEffect(() => {
    const handler = setTimeout(() => {
      if (lmgNumber && plant) {
        fetchStockData(lmgNumber, plant);
      } else if (!lmgNumber) {
        // Clear details if LMG number is removed
        setStockIdentity(null);
        setExistingStock(null);
      }
    }, 500); // 500ms delay after user stops typing

    return () => {
      clearTimeout(handler);
    };
  }, [lmgNumber, plant]);

  // Function to fetch data from both identity and stock tables
  const fetchStockData = useCallback(async (lmg, currentPlant) => {
    setLoading(true);
    setError(null);
    setStockIdentity(null);
    setExistingStock(null);

    // 1. Fetch from fg_stock_identity (the master data)
    const { data: identityData, error: identityError } = await supabase
      .from('fg_stock_identity')
      .select('*')
      .eq('lmg_number', lmg)
      .eq('plant', currentPlant)
      .single();

    if (identityError && identityError.code !== 'PGRST116') {
      setError(`Error fetching stock identity: ${identityError.message}`);
    } else {
      setStockIdentity(identityData); // This will be null if not found
      if (!identityData) {
          setError('No master data found for this LMG. Please upload it first.');
      }
    }

    // 2. Fetch from fg_stock to see if it's already been received
    const { data: stockData, error: stockError } = await supabase
      .from('fg_stock')
      .select('*')
      .eq('lmg_number', lmg)
      .single();

    if (stockError && stockError.code !== 'PGRST116') {
      setError(prev => prev ? `${prev}, Error fetching existing stock: ${stockError.message}` : `Error fetching existing stock: ${stockError.message}`);
    } else {
      setExistingStock(stockData);
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
      setError('No plant selected. Please select a plant before submitting.');
      setSubmitting(false);
      return;
    }

    // This is the critical check to prevent submission
    if (!stockIdentity) {
      setError('Cannot submit. No identity data found for this LMG number.');
      setSubmitting(false);
      return;
    }

    const movementType = existingStock ? '413' : '101'; // 413 for transfer, 101 for new receipt
    const userDisplayName = user?.user_metadata?.display_name || user?.email;

    // Prepare the full record using data from the fetched identity
    const dataToUpsert = {
        ...existingStock, 
        lmg_number: stockIdentity.lmg_number,
        plant: stockIdentity.plant,
        so_number: stockIdentity.so_number,
        so_item: stockIdentity.so_item,
        customer_name: stockIdentity.customer_name,
        print_design: stockIdentity.print_design,
        quantity: stockIdentity.quantity,
        weight: stockIdentity.weight,
        bin_location: binLocation,
        updated_at: new Date(),
        user_id: userDisplayName
    };

    // Upsert the record into the main fg_stock table
    const { error: upsertError } = await supabase.from('fg_stock').upsert(dataToUpsert, { onConflict: 'lmg_number' });

    if (upsertError) {
      setError(`Failed to save stock data: ${upsertError.message}`);
      setSubmitting(false);
      return;
    }

    // Record the movement in the history table
    const { error: movementError } = await supabase.from('fg_stock_movements').insert({
        lmg_number: stockIdentity.lmg_number,
        movement_type: movementType,
        initial_loc: existingStock?.bin_location || null,
        destination_loc: binLocation,
        user_id: userDisplayName,
        plant: stockIdentity.plant,
        so_number: stockIdentity.so_number,
        customer_name: stockIdentity.customer_name,
        print_design: stockIdentity.print_design,
    });

    if (movementError) {
        setError(`Stock saved, but failed to record movement: ${movementError.message}`);
    } else {
        setMessage(`Success! Stock ${movementType === '101' ? 'received' : 'transferred'} to ${binLocation}.`);
        // Reset form completely for the next scan
        setLmgNumber('');
        setBinLocation('');
        setStockIdentity(null);
        setExistingStock(null);
    }

    setSubmitting(false);
  };

  return (
    <div>
      <h2>FG Receive / Transfer</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Conditionally render scanner overlays */}
      {showLmgScanner && 
        <BarcodeScanner 
          onScanSuccess={(txt) => { 
            setLmgNumber(txt.toUpperCase()); 
            setShowLmgScanner(false); 
          }}
          onScanError={(err) => setError(err)} // Display error but DON'T close
          onCancel={() => setShowLmgScanner(false)} // Close button handler
        />
      }
      {showBinScanner && 
        <BarcodeScanner 
          onScanSuccess={(txt) => { 
            setBinLocation(txt.toUpperCase()); 
            setShowBinScanner(false); 
          }}
          onScanError={(err) => setError(err)} // Display error but DON'T close
          onCancel={() => setShowBinScanner(false)} // Close button handler
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
            <label htmlFor="binLocation">Bin Location</label>
            <input
              type="text"
              id="binLocation"
              value={binLocation}
              onChange={(e) => setBinLocation(e.target.value.toUpperCase())}
              required
              disabled={submitting || !stockIdentity} // Disabled until a valid LMG is identified
            />
            <button type="button" onClick={() => setShowBinScanner(true)} disabled={submitting || !stockIdentity}>
              Scan Bin
            </button>
          </div>
          
          <button type="submit" disabled={submitting || loading || !stockIdentity || !binLocation}>
            {submitting ? 'Submitting...' : (existingStock ? 'Transfer Stock' : 'Receive Stock')}
          </button>
        </div>

        <div>
          {/* Data Display Column */}
          <h3>Stock Details</h3>
          {loading ? <p>Loading...</p> : stockIdentity ? (
            <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
              {existingStock?.bin_location && <p style={{color: 'orange', fontWeight:'bold'}}>Item already in stock. This will be a transfer.</p>}
              <p><strong>LMG Number:</strong> {stockIdentity.lmg_number}</p>
              <p><strong>SO Number:</strong> {stockIdentity.so_number || 'N/A'}</p>
              <p><strong>SO Item:</strong> {stockIdentity.so_item || 'N/A'}</p>
              <p><strong>Customer:</strong> {stockIdentity.customer_name || 'N/A'}</p>
              <p><strong>Design:</strong> {stockIdentity.print_design || 'N/A'}</p>
              <p><strong>Quantity:</strong> {stockIdentity.quantity || 'N/A'}</p>
              <p><strong>Weight:</strong> {stockIdentity.weight || 'N/A'}</p>
              <p><strong>Current Location:</strong> {existingStock?.bin_location || 'Not yet received'}</p>
            </div>
          ) : (
            <p>Enter an LMG number to see details.</p>
          )}
        </div>
      </form>
    </div>
  );
};

export default FGReceive;
