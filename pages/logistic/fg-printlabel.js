
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const PrintLabelPage = () => {
    const router = useRouter();
    const { lmg_number } = router.query;
    const [fgItem, setFgItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inputId, setInputId] = useState('');

    useEffect(() => {
        if (!lmg_number) {
            setLoading(false);
            return;
        }

        const fetchFgData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('fg_stock')
                    .select('*')
                    .eq('lmg_number', lmg_number)
                    .single();

                if (error) throw error;
                if (!data) throw new Error(`LMG Number ${lmg_number} not found.`);
                
                setFgItem(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFgData();
    }, [lmg_number]);

    const handleInputChange = (e) => {
        setInputId(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputId.trim()) {
            router.push(`/logistic/fg-printlabel?lmg_number=${inputId.trim()}`);
        }
    };

    if (loading) return <div>Loading label data...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!fgItem) {
        return (
            <div className="label-container">
                <div className="form-container">
                    <h2>Print Finished Good Label</h2>
                    <p>Please enter the LMG Number to generate the label.</p>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={inputId}
                            onChange={handleInputChange}
                            placeholder="Enter LMG Number"
                            className="input-field"
                        />
                        <button type="submit" className="submit-button">
                            Generate Label
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="label-container">
            <div className="label">
                <div className="label-header"><b>FINISHED GOOD TAG</b></div>
                <div className="label-content">
                    <div className="label-details">
                        <table>
                            <tbody>
                                <tr>
                                    <td>SO Number</td><td>:</td><td>{fgItem.so_number}</td>
                                </tr>
                                <tr>
                                    <td>Customer</td><td>:</td><td>{fgItem.customer_name}</td>
                                </tr>
                                <tr>
                                    <td>Product</td><td>:</td><td>{fgItem.print_design}</td>
                                </tr>
                                <tr>
                                    <td>Quantity</td><td>:</td><td>{fgItem.quantity}</td>
                                </tr>
                                 <tr>
                                    <td>Weight</td><td>:</td><td>{fgItem.weight} kg</td>
                                </tr>
                                <tr>
                                    <td>Plant</td><td>:</td><td>{fgItem.plant}</td>
                                </tr>
                                <tr>
                                    <td>Date</td><td>:</td><td>{new Date(fgItem.updated_at).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <div className="qr-code-container">
                                        <div className="qr-code">
                                            <QRCodeSVG value={fgItem.lmg_number} size={110} />
                                        </div>
                                    <span className="qr-code-text">{fgItem.lmg_number}</span>
                                    </div>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <button className="print-button" onClick={() => window.print()}>
                Print Label
            </button>
             <button onClick={() => setFgItem(null)} className="submit-button">
                    Scan Another Item
            </button>
        </div>
    );
};

export default PrintLabelPage;
