
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const PrintLabelPage = () => {
    const router = useRouter();
    const { roll_id } = router.query;
    const [roll, setRoll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inputId, setInputId] = useState('');

    useEffect(() => {
        if (!roll_id) {
            setLoading(false);
            return;
        }

        const fetchRollData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('pr_stock')
                    .select('*')
                    .eq('roll_id', roll_id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error(`Roll ID ${roll_id} not found.`);
                
                setRoll(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRollData();
    }, [roll_id]);

    const handleInputChange = (e) => {
        setInputId(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputId.trim()) {
            router.push(`/paper-roll/pr-printlabel?roll_id=${inputId.trim()}`);
        }
    };

    if (loading) return <div>Loading label data...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!roll) {
        return (
            <div className="label-container">
                
                <div className="form-container">
                    <h2>Print Paper Roll Label</h2>
                    <p>Please enter the Paper Roll ID to generate the label.</p>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={inputId}
                            onChange={handleInputChange}
                            placeholder="Enter Paper Roll ID"
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
                <div className="label-header"><b>PAPER ROLL TAG</b></div>
                <div className="label-content">
                    <div className="label-details">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Kind</td><td>:</td><td>{roll.kind}</td>
                                </tr>
                                <tr>
                                    <td>GSM</td><td>:</td><td>{roll.gsm}</td>
                                </tr>
                                <tr>
                                    <td>Width</td><td>:</td><td>{roll.width} mm</td>
                                </tr>
                                <tr>
                                    <td>Diameter</td><td>:</td><td>{roll.diameter} mm</td>
                                </tr>
                                <tr>
                                    <td>Weight</td><td>:</td><td>{roll.weight} kg</td>
                                </tr>
                                <tr>
                                    <td>Batch</td><td>:</td><td>{roll.batch}</td>
                                </tr>
                                <tr>
                                    <td>Goods Received Date</td><td>:</td><td>{new Date(roll.goods_receive_date || roll.created_at).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>
                                        <div className="qr-code-container">
                                            <div className="qr-code">
                                                <QRCodeSVG value={roll.roll_id} size={110} />
                                            </div>
                                            <span className="qr-code-text">{roll.roll_id}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                </div>
            </div>

            <button className="print-button" onClick={() => window.print()}>
                Print Label
            </button>
        </div>
    );
};

export default PrintLabelPage;
