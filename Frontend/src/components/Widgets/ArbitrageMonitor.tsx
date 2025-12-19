
import React from 'react';

// ডামি ডাটা (ব্যাকএন্ড API থেকে আপডেট হবে)
const prices = [
    { exchange: 'Binance', price: 98150.20, logo: '🟡' },
    { exchange: 'KuCoin', price: 98190.50, logo: '🟢' },
    { exchange: 'Bybit', price: 98140.00, logo: '⚫' },
];

const ArbitrageMonitor = () => {
    const minPrice = Math.min(...prices.map(p => p.price));

    return (
        <div style={{ background: '#1e222d', padding: '12px', borderRadius: '8px', border: '1px solid #2a2e39' }}>
            <h4 style={{ color: '#d1d4dc', fontSize: '12px', margin: '0 0 10px 0' }}>⚖️ Arbitrage Monitor</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {prices.map((ex, i) => {
                        const diff = ex.price - minPrice;
                        const percent = ((diff / minPrice) * 100).toFixed(2);
                        const isBest = ex.price === minPrice;

                        return (
                            <tr key={i} style={{ borderBottom: '1px solid #2a2e39' }}>
                                <td style={{ padding: '6px 0', color: '#9db2bd', fontSize: '11px' }}>{ex.logo} {ex.exchange}</td>
                                <td style={{ textAlign: 'right', color: '#fff', fontSize: '12px' }}>${ex.price.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontSize: '10px' }}>
                                    {isBest ?
                                        <span style={{ color: '#00c853', background: '#003300', padding: '2px 4px', borderRadius: '3px' }}>BEST</span> :
                                        <span style={{ color: '#ff3d00' }}>+{percent}%</span>
                                    }
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ArbitrageMonitor;
