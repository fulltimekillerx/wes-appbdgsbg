import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plant, setPlant] = useState('');
  const [plants, setPlants] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('login'); // 'login' or 'plant'
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const { error: loginError } = await login(email, password);
    if (loginError) {
      setError(loginError.message);
    } else {
      // On successful login, fetch plants
      const { data: plantsData, error: plantsError } = await supabase
        .from('plant')
        .select('plant_code');

      if (plantsError) {
        setError('Failed to fetch plants. Please try again.');
      } else if (plantsData && plantsData.length > 0) {
        setPlants(plantsData);
        setPlant(plantsData[0].plant_code); // Pre-select the first plant
        setStep('plant'); // Move to plant selection step
      } else {
        setError('No plants found for your account.');
      }
    }
  };

  const handlePlantSelection = (e) => {
    e.preventDefault();
    if (!plant) {
      setError("Please select a plant.");
      return;
    }
    localStorage.setItem('plant', plant);
    router.push('/');
  };

  if (step === 'plant') {
    return (
      <div>
        <h1>Select Plant</h1>
        <form onSubmit={handlePlantSelection}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'inline-block', width: '80px' }}>Plant</label>
            <select value={plant} onChange={(e) => setPlant(e.target.value)}>
              {plants.map(p => (
                <option key={p.plant_code} value={p.plant_code}>{p.plant_code}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit">Confirm</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '80px' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '80px' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
      <Link href="/forgot-password">
        <a>Forgot Password?</a>
      </Link>
    </div>
  );
}
