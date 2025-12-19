
import React, { useEffect, useState } from 'react';

const RecentTrades = () => {
    const [trades, setTrades] = useState<any[]>([]);

    // ডামি সকেট সিমুলেশন (আপনার লাইভ সকেট দিয়ে রিপ্লেস করবেন)
    useEffect(() => {
        const interval = setInterval(() => {
            const isBuy = Math.random() > 0.5;
            const newTrade = {
                id: Date.now(),
                price: (98000 + Math.random() * 50).toFixed(2),
                amount: (Math.random() * 0.5).toFixed(4),
                side: isBuy ? 'buy' : 'sell',
                time: new Date().toLocaleTimeString('en-US', { hour12: false })
            };

            // মেমোরি সেফটি: ১৫ টির বেশি আইটেম রাখব না
            setTrades(prev => [newTrade, ...prev].slice(0, 15));
        }, 800);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ background: '#1e222d', padding: '12px', borderRadius: '8px', height: '100%', border: '1px solid #2a2e39' }}>
            <h4 style={{ color: '#d1d4dc', fontSize: '12px', margin: '0 0 10px 0' }}>⚡ Market Trades</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px', color: '#5d606b', marginBottom: '8px' }}>
                <span>Price (USDT)</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Time</span>
            </div>

            <div style={{ overflow: 'hidden' }}>
                {trades.map((trade) => (
                    <div key={trade.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        fontSize: '11px', marginBottom: '4px',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <span style={{ color: trade.side === 'buy' ? '#00c853' : '#ff3d00', fontWeight: '600' }}>
                            {trade.price}
                        </span>
                        <span style={{ textAlign: 'center', color: '#d1d4dc' }}>{trade.amount}</span>
                        <span style={{ textAlign: 'right', color: '#787b86' }}>{trade.time}</span>
                    </div>
                ))}
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(5px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
    );
};

export default RecentTrades;
