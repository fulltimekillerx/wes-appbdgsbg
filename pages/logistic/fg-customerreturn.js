
import { useState } from 'react';
import { supabase } from '../../supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';

const CustomerReturnPage = () => {
    const { user } = useAuth(); // Get user from auth hook
    const [formData, setFormData] = useState({
        so_number: '',
        so_item: '',
        customer_name: '',
        print_design: '',
        quantity: '',
        weight: '',
        plant: '' // Added plant field
    });
    const [newItem, setNewItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateLmgNumber = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `LMG-${timestamp}-${random}`.toUpperCase();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!user) {
            setError("You must be logged in to perform this action.");
            setLoading(false);
            return;
        }

        const lmg_number = generateLmgNumber();

        // Data for fg_stock table, aligned with fg_stock.sql
        const stockData = {
            lmg_number,
            so_number: formData.so_number,
            so_item: formData.so_item,
            customer_name: formData.customer_name,
            print_design: formData.print_design, // Corrected from product_name
            quantity: formData.quantity, // Corrected from qty
            weight: formData.weight,
            plant: formData.plant, // Added plant
            user_id: user.id // Added user_id
        };
        
        // Data for fg_stock_movements table, aligned with fg_stock_movements.sql
        const movementData = {
            lmg_number,
            movement_type: '991', // Customer Return
            so_number: formData.so_number,
            so_item: formData.so_item,
            customer_name: formData.customer_name,
            print_design: formData.print_design,
            quantity: formData.quantity,
            plant: formData.plant, // Added plant
            user_id: user.id // Corrected from user_display_name
        };

        try {
            // 1. Insert into fg_stock
            const { error: stockError } = await supabase
                .from('fg_stock')
                .insert([stockData]);

            if (stockError) throw stockError;

            // 2. Insert into fg_stock_movements
            const { error: movementError } = await supabase
                .from('fg_stock_movements')
                .insert([movementData]);

            if (movementError) {
                // Attempt to rollback stock insertion if movement fails
                await supabase.from('fg_stock').delete().eq('lmg_number', lmg_number);
                throw movementError;
            }

            // 3. Set state to display the label
            setNewItem(stockData); // Use the corrected stockData object

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // If a new item has been created, show the label
    if (newItem) {
        return (
            <div className="label-container">
                <div className="label">
                    <div className="label-header"><b>CUSTOMER RETURN TAG</b></div>
                    <div className="label-content">
                        <div className="label-details">
                            <table>
                                <tbody>
                                    <tr><td>SO Number</td><td>:</td><td>{newItem.so_number}</td></tr>
                                    <tr><td>Customer</td><td>:</td><td>{newItem.customer_name}</td></tr>
                                    <tr><td>Product</td><td>:</td><td>{newItem.print_design}</td></tr>
                                    <tr><td>Quantity</td><td>:</td><td>{newItem.quantity}</td></tr>
                                     <tr><td>Weight</td><td>:</td><td>{newItem.weight} kg</td></tr>
                                    <tr><td>Date</td><td>:</td><td>{new Date().toLocaleDateString()}</td></tr>
                                    <tr>
                                        <div className="qr-code-container">
                                            <div className="qr-code">
                                                <QRCodeSVG value={newItem.lmg_number} size={110} />
                                            </div>
                                            <span className="qr-code-text">{newItem.lmg_number}</span>
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
                <button onClick={() => setNewItem(null)} className="submit-button">
                    Enter Another Return
                </button>
            </div>
        );
    }

    // Default view: Show the form
    return (
        <div className="container">
            <h2>Customer Return</h2>
            <form onSubmit={handleSubmit} className="form-grid">
                 <div className="form-group">
                    <label>Plant</label>
                    <input type="text" name="plant" value={formData.plant} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>SO Number</label>
                    <input type="text" name="so_number" value={formData.so_number} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>SO Item</label>
                    <input type="text" name="so_item" value={formData.so_item} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Customer Name</label>
                    <input type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Print Design</label>
                    <input type="text" name="print_design" value={formData.print_design} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required />
                </div>
                <div className="form-goup">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} required />
                </div>
                
                {loading && <p>Submitting...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                <div className="form-group">
                    <button type="submit" disabled={loading} className="submit-button">Submit and Generate Label</button>
                </div>
            </form>
        </div>
    );
};

export default CustomerReturnPage;
