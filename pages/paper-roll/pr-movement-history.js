import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';

const PRMovementHistory = ({ plant }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [movementType, setMovementType] = useState('');

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('pr_stock_movements')
        .select(`
          *, 
          profiles (display_name)
        `)
        .eq('plant', plant);

      // Apply filters
      if (startDate) {
        query = query.gte('timestamp', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('timestamp', `${endDate}T23:59:59`);
      }
      if (userId) {
        // This assumes you want to filter by display name now
        query = query.ilike('profiles.display_name', `%${userId}%`);
      }
      if (movementType) {
        query = query.eq('movement_type', movementType);
      }

      // Apply sorting
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'ascending' });

      const { data, error } = await query;

      if (error) {
        // If the join fails, it's likely because the relationship isn't set up.
        // We log the error and can fall back to fetching without the join.
        console.error('Error fetching movements with user profiles:', error.message);
        throw new Error(`Could not fetch user data. Please ensure a relationship exists between 'pr_stock_movements' and 'profiles'.`);
      }

      setMovements(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial load or when dependencies change
  useEffect(() => {
    if (plant) {
        fetchMovements();
    }
  }, [plant, sortConfig, startDate, endDate, userId, movementType]);

  // Handler to update sorting state
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Helper to visually indicate sorting direction
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  return (
    <div>
      <h1>Paper Roll Movement History</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginRight: '10px', padding: '5px' }} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ marginRight: '10px', padding: '5px' }} />
        <input
          type="text"
          placeholder="Search by User Name"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <select value={movementType} onChange={e => setMovementType(e.target.value)} style={{ marginRight: '10px', padding: '5px' }}>
            <option value="">All Types</option>
            <option value="200">200</option>
            <option value="201">201</option>
            <option value="202">202</option>
            <option value="101">101</option>
            <option value="102">102</option>
            <option value="999">999</option>
        </select>
        {/* The button is no longer needed as useEffect handles filtering */}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <table>
        <thead>
          <tr>
            <th onClick={() => requestSort('timestamp')}>Timestamp{getSortIndicator('timestamp')}</th>
            <th onClick={() => requestSort('roll_id')}>Roll ID{getSortIndicator('roll_id')}</th>
            <th onClick={() => requestSort('batch')}>Batch{getSortIndicator('batch')}</th>
            <th onClick={() => requestSort('movement_type')}>Movement Type{getSortIndicator('movement_type')}</th>
            <th onClick={() => requestSort('initial_loc')}>Initial Location{getSortIndicator('initial_loc')}</th>
            <th onClick={() => requestSort('destination_loc')}>Destination Location{getSortIndicator('destination_loc')}</th>
            <th onClick={() => requestSort('profiles.display_name')}>User{getSortIndicator('profiles.display_name')}</th>
            <th onClick={() => requestSort('diameter')}>Diameter{getSortIndicator('diameter')}</th>
            <th onClick={() => requestSort('length')}>Length{getSortIndicator('length')}</th>
            <th onClick={() => requestSort('weight')}>Weight{getSortIndicator('weight')}</th>
          </tr>
        </thead>
        <tbody>
          {movements.map(movement => (
            <tr key={movement.id}>
              <td>{new Date(movement.timestamp).toLocaleString()}</td>
              <td>{movement.roll_id}</td>
              <td>{movement.batch}</td>
              <td>{movement.movement_type}</td>
              <td>{movement.initial_loc}</td>
              <td>{movement.destination_loc}</td>
              <td>{movement.profiles ? movement.profiles.display_name : movement.user_id}</td>
              <td>{movement.diameter}</td>
              <td>{movement.length}</td>
              <td>{movement.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PRMovementHistory;
