
import React, { useEffect, useState } from 'react';
// কম্পোনেন্ট ইম্পোর্ট
import SentimentWidget from './Widgets/SentimentWidget';
import RecentTrades from './Widgets/RecentTrades';
import ArbitrageMonitor from './Widgets/ArbitrageMonitor';
import TradingChart from './Widgets/TradingChart'; // আপনার আগের চার্ট

const Dashboard = () => {
    const [sentimentData, setSentimentData] = useState<any>(null); // Type 'any' used for flexibility with dummy data

    // সিমুলেশন: ব্যাকএন্ড থেকে ২০টি ইন্ডিকেটরের ডাটা আনা
    useEffect(() => {
        // এখানে আপনি fetch('/api/sentiment') কল করবেন
        // আমি উদাহরণের জন্য একটি ডামি ডাটা সেট করছি যা ব্যাকএন্ড স্ট্রাকচারের মতো
        const dummyData = {
            verdict: "STRONG BUY 🚀",
            color: "#00c853",
            summary: { buy: 14, sell: 4, neutral: 2 },
            details: [
                { name: "SMA (50)", signal: "BUY" }, { name: "EMA (20)", signal: "BUY" },
                { name: "MACD", signal: "BUY" }, { name: "RSI (14)", signal: "NEUTRAL" },
                { name: "Bollinger Bands", signal: "BUY" }, { name: "Stochastic", signal: "SELL" },
                // ... বাকি ইন্ডিকেটরগুলো ব্যাকএন্ড থেকে আসবে
            ]
        };
        setSentimentData(dummyData);
    }, []);

    return (
        <div style={{ padding: '20px', background: '#131722', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

            {/* টপ সেকশন: মেইন চার্ট এবং লাইভ ট্রেড */}
            <div style={{ display: 'grid', gridTemplateColumns: '75% 24%', gap: '1%', marginBottom: '20px' }}>

                {/* চার্ট এরিয়া (বড়) */}
                <div style={{ height: '450px' }}>
                    <TradingChart symbol="BTCUSDT" />
                </div>

                {/* ট্রেড হিস্ট্রি (ডানপাশে স্ক্রল হবে) */}
                <div style={{ height: '450px' }}>
                    <RecentTrades />
                </div>
            </div>

            {/* বটম সেকশন: অ্যানালাইসিস উইজেট */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                {/* ১. সেন্টিমেন্ট উইজেট (২০টি ইন্ডিকেটর) */}
                <SentimentWidget data={sentimentData} />

                {/* ২. আরবিট্রেজ মনিটর */}
                <ArbitrageMonitor />

                {/* ৩. অন্য কোনো উইজেট বা স্ট্র্যাটেজি সিলেক্টর (আপনার আগের রিকোয়েস্ট থেকে) */}
                <div style={{ background: '#1e222d', borderRadius: '8px', padding: '15px', border: '1px solid #2a2e39', color: '#787b86', fontSize: '12px' }}>
                    <h4>System Status</h4>
                    <p>Core Engine: <span style={{ color: '#00c853' }}>Online</span></p>
                    <p>Memory Usage: <span style={{ color: '#00e676' }}>Optimized (Low)</span></p>
                    <p>Indicators Active: 20/20</p>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
