import React, { useEffect, useState } from 'react';
// কম্পোনেন্ট ইম্পোর্ট
import SentimentWidget from './Widgets/SentimentWidget';
import RecentTrades from './Widgets/RecentTrades';
import ArbitrageMonitor from './Widgets/ArbitrageMonitor';
import TradingChart from './Widgets/TradingChart';
import OrderBook from './Widgets/OrderBook'; // ✅ মিসিং ফাইল ইম্পোর্ট করা হলো

const Dashboard = () => {
    // স্টেট ভেরিয়েবল
    const [sentimentData, setSentimentData] = useState<any>(null);
    const [arbitrageData, setArbitrageData] = useState<any[]>([]);
    const [recentTradesData, setRecentTradesData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false); // সেফটি লক

    // ১. ডাটা ফেচিং ফাংশন (সেফটি লক সহ)
    const fetchMarketData = async () => {
        // যদি আগের রিকোয়েস্ট শেষ না হয়, তবে নতুন করে পাঠাবে না
        if (isFetching) return;

        setIsFetching(true); // লক করা হলো
        try {
            // প্যারালাল রিকোয়েস্ট (একই সাথে তিনটা API কল)
            const [sentimentRes, arbitrageRes, tradesRes] = await Promise.all([
                fetch('http://localhost:8000/api/sentiment?symbol=BTC/USDT'),
                fetch('http://localhost:8000/api/arbitrage?symbol=BTC/USDT'),
                fetch('http://localhost:8000/api/trades?symbol=BTC/USDT')
            ]);

            if (sentimentRes.ok) {
                const sData = await sentimentRes.json();
                setSentimentData(sData);
            }

            if (arbitrageRes.ok) {
                const aData = await arbitrageRes.json();
                setArbitrageData(aData.data);
            }

            if (tradesRes.ok) {
                const tData = await tradesRes.json();
                setRecentTradesData(tData);
            }

        } catch (error) {
            console.error("Failed to fetch market data:", error);
        } finally {
            setIsLoading(false); // ✅ ফিক্স: এরর হলেও লোডিং বন্ধ হবে
            setIsFetching(false); // কাজ শেষ, আনলক করা হলো
        }
    };

    // ২. ইফেক্ট হুক (টাইমার সেটআপ - ২ সেকেন্ড)
    useEffect(() => {
        fetchMarketData();

        // ⚠️ নিরাপদ টাইমার: ২০০০ms = ২ সেকেন্ড (i3 অপ্টিমাইজড)
        const interval = setInterval(fetchMarketData, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '20px', background: '#131722', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

            {/* হেডার এবং স্ট্যাটাস */}
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#d1d4dc', margin: 0, fontSize: '18px' }}>🚀 Metron Hybrid Dashboard</h2>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                    {isLoading ? (
                        <span style={{ color: '#ffb300' }}>● Syncing Data...</span>
                    ) : (
                        <span style={{ color: '#00c853' }}>● System Online (2s Pulse)</span>
                    )}
                </div>
            </div>

            {/* টপ সেকশন: মেইন চার্ট এবং সাইড প্যানেল */}
            <div style={{ display: 'grid', gridTemplateColumns: '75% 24%', gap: '1%', marginBottom: '20px' }}>

                {/* বামে: চার্ট এরিয়া */}
                <div style={{ height: '500px' }}>
                    <TradingChart symbol="BTCUSDT" />
                </div>

                {/* ডানে: অর্ডার বুক এবং ট্রেড হিস্ট্রি (Stacked) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '500px' }}>
                    {/* ✅ ফিক্স: অর্ডার বুক উপরে */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <OrderBook />
                    </div>
                    {/* ✅ ফিক্স: ট্রেড হিস্ট্রি নিচে */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <RecentTrades data={recentTradesData} />
                    </div>
                </div>
            </div>

            {/* বটম সেকশন: অ্যানালাইসিস উইজেট */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                {/* ১. সেন্টিমেন্ট উইজেট (২০টি ইন্ডিকেটর - লাইভ ডাটা) */}
                <SentimentWidget data={sentimentData} />

                {/* ২. আরবিট্রেজ মনিটর (লাইভ ডাটা) */}
                <ArbitrageMonitor data={arbitrageData} />

                {/* ৩. সিস্টেম ইনফো প্যানেল */}
                <div style={{ background: '#1e222d', borderRadius: '8px', padding: '15px', border: '1px solid #2a2e39', color: '#787b86', fontSize: '12px' }}>
                    <h4 style={{ color: '#d1d4dc', marginBottom: '10px' }}>System Health</h4>
                    <p style={{ margin: '5px 0' }}>Core Engine: <span style={{ color: '#00c853' }}>Python Signal Engine</span></p>
                    <p style={{ margin: '5px 0' }}>Update Rate: <span style={{ color: '#2962ff' }}>2 Seconds (Safe Mode)</span></p>
                    <p style={{ margin: '5px 0' }}>Strategy: <span style={{ color: '#ffb300' }}>Multi-Indicator Consensus</span></p>

                    <div style={{ marginTop: '10px', padding: '8px', background: '#2a2e39', borderRadius: '4px', borderLeft: '3px solid #00e676' }}>
                        Optimization: <strong>Active (i3 Compatible)</strong>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
