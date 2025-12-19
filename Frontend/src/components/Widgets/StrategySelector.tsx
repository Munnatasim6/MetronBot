import React, { useState } from 'react';

const StrategySelector = () => {
    const [mode, setMode] = useState('conservative');

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = e.target.value;
        setMode(newMode);

        // এখানে ব্যাকএন্ডে সিগন্যাল পাঠাতে হবে
        // socket.emit('change_strategy', newMode); 
        console.log(`Strategy Changed to: ${newMode}`);
    };

    const getModeColor = () => {
        if (mode === 'aggressive') return '#ff3d00'; // লাল (রিস্কি)
        if (mode === 'sniper') return '#00e5ff';     // ব্লু (ফোকাসড)
        return '#00c853';                            // গ্রিন (সেফ)
    };

    return (
        <div style={{ background: '#1e222d', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: `4px solid ${getModeColor()}` }}>
            <h4 style={{ color: '#d1d4dc', margin: '0 0 10px 0', fontSize: '14px' }}>🛡️ Quick Strategy Mode</h4>
            <select
                value={mode}
                onChange={handleModeChange}
                style={{
                    width: '100%', padding: '8px', borderRadius: '4px',
                    background: '#2a2e39', color: '#fff', border: 'none', cursor: 'pointer',
                    outline: 'none'
                }}
            >
                <option value="conservative">🛡️ Conservative (Low Risk)</option>
                <option value="aggressive">🚀 Aggressive (High Profit)</option>
                <option value="sniper">🎯 Sniper (Perfect Entry)</option>
            </select>
            <p style={{ fontSize: '11px', color: '#787b86', marginTop: '5px' }}>
                Status: {mode === 'aggressive' ? 'High Risk allowed' : mode === 'sniper' ? 'Waiting for confirmation' : 'Safety First'}
            </p>
        </div>
    );
};

export default StrategySelector;
