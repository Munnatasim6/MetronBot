import React, { useEffect, useState } from 'react';
// কম্পোনেন্ট ইম্পোর্ট
import SentimentWidget from './Widgets/SentimentWidget';
import RecentTrades from './Widgets/RecentTrades';
import ArbitrageMonitor from './Widgets/ArbitrageMonitor';
import TradingChart from './Widgets/TradingChart';
import OrderBook from './Widgets/OrderBook';

// সার্ভিস ইম্পোর্ট (Step 3)
import { socketService } from '../services/api/socketService';

const Dashboard = () => {
    // স্টেট ভেরিয়েবল
    const [sentimentData, setSentimentData] = useState<any>(null);
    const [arbitrageData, setArbitrageData] = useState<any[]>([]);
    const [recentTradesData, setRecentTradesData] = useState<any[]>([]);
    const [currentStrategy, setCurrentStrategy] = useState<string>("Loading...");

    // কানেকশন স্ট্যাটাস
    const [socketStatus, setSocketStatus] = useState<string>("Connecting...");
    const [isLoading, setIsLoading] = useState(true);

    // ১. ইনিশিয়াল ডাটা লোড (HTTP) - পেজ লোড হওয়ার সাথে সাথে একবার কল হবে
    const fetchInitialData = async () => {
        try {
            const [strategyRes, arbitrageRes] = await Promise.all([
                fetch('http://localhost:8000/api/strategy'),
                fetch('http://localhost:8000/api/arbitrage?symbol=BTC/USDT')
            ]);

            if (strategyRes.ok) {
                const sData = await strategyRes.json();
                setCurrentStrategy(sData.strategy.toUpperCase());
            }

            if (arbitrageRes.ok) {
                const aData = await arbitrageRes.json();
                setArbitrageData(aData.data);
            }
        } catch (error) {
            console.error("Initial Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ২. ওয়েব সকেট ইন্টিগ্রেশন (Real-time Data)
    useEffect(() => {
        // প্রথমে একবার রেস্ট API কল
        fetchInitialData();

        // সকেট কানেকশন শুরু
        socketService.connect();
        setSocketStatus("Live Socket 🟢");

        // ডাটা লিসেনার সাবস্ক্রাইব করা
        const unsubscribe = socketService.subscribe((data) => {

            // সেন্টিমেন্ট আপডেট
            if (data.type === 'SENTIMENT') {
                setSentimentData(data.payload);
            }

            // ট্রেড আপডেট
            if (data.type === 'TRADES') {
                // আমরা সার্ভার থেকে পুরো লিস্ট পাচ্ছি, তাই স্টেট রিপ্লেস করছি
                setRecentTradesData(data.payload);
            }
        });

        // ক্লিনআপ (কম্পোনেন্ট বন্ধ হলে ডিসকানেক্ট হবে)
        return () => {
            unsubscribe();
            socketService.disconnect();
            setSocketStatus("Disconnected 🔴");
        };
    }, []);

    // ৩. আরবিট্রেজ এর জন্য আলাদা পোলিং (কারণ এটি সকেটে নেই)
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('http://localhost:8000/api/arbitrage?symbol=BTC/USDT');
                if (res.ok) {
                    const data = await res.json();
                    setArbitrageData(data.data);
                }
            } catch (e) {
                console.error("Arbitrage Poll Error", e);
            }
        }, 5000); // প্রতি ৫ সেকেন্ডে চেক করবে (ধীরগতিতে, কারণ সকেট মেইন কাজ করছে)

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '20px', background: '#131722', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

            {/* হেডার এবং স্ট্যাটাস */}
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#d1d4dc', margin: 0, fontSize: '18px' }}>🚀 Metron Hybrid Dashboard</h2>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                    {isLoading ? (
                        <span style={{ color: '#ffb300' }}>● Initializing...</span>
                    ) : (
                        <span style={{ color: '#00c853' }}>● {socketStatus}</span>
                    )}
                </div>
            </div>

            {/* টপ সেকশন: মেইন চার্ট এবং সাইড প্যানেল */}
            <div style={{ display: 'grid', gridTemplateColumns: '75% 24%', gap: '1%', marginBottom: '20px' }}>

                {/* বামে: চার্ট এরিয়া */}
                <div style={{ height: '500px' }}>
                    <TradingChart symbol="BTCUSDT" />
                </div>

                {/* ডানে: অর্ডার বুক এবং ট্রেড হিস্ট্রি */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '500px' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <OrderBook />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <RecentTrades data={recentTradesData} />
                    </div>
                </div>
            </div>

            {/* বটম সেকশন: অ্যানালাইসিস উইজেট */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                {/* ১. সেন্টিমেন্ট উইজেট (সকেট থেকে লাইভ ডাটা) */}
                <SentimentWidget data={sentimentData} />

                {/* ২. আরবিট্রেজ মনিটর (৫ সেকেন্ড পোলিং) */}
                <ArbitrageMonitor data={arbitrageData} />

                {/* ৩. সিস্টেম ইনফো প্যানেল */}
                <div style={{ background: '#1e222d', borderRadius: '8px', padding: '15px', border: '1px solid #2a2e39', color: '#787b86', fontSize: '12px' }}>
                    <h4 style={{ color: '#d1d4dc', marginBottom: '10px' }}>System Health</h4>
                    <p style={{ margin: '5px 0' }}>Core Engine: <span style={{ color: '#00c853' }}>Python Signal Engine</span></p>
                    <p style={{ margin: '5px 0' }}>Connection: <span style={{ color: '#2962ff' }}>WebSocket (Real-time)</span></p>
                    {/* ডায়নামিক স্ট্র্যাটেজি ডিসপ্লে */}
                    <p style={{ margin: '5px 0' }}>Strategy: <span style={{ color: '#ffb300', fontWeight: 'bold' }}>{currentStrategy}</span></p>

                    <div style={{ marginTop: '10px', padding: '8px', background: '#2a2e39', borderRadius: '4px', borderLeft: '3px solid #00e676' }}>
                        Optimization: <strong>Active (i3 Compatible)</strong>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
