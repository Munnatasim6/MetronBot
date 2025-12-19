import React, { useState, useEffect, useRef } from 'react';
import DashboardPanel from '../components/Panels/DashboardPanel';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import SEO from '../components/common/SEO';
import { socketService } from '../services/api/socketService';

const MonitorPage: React.FC = () => {
  const {
    metrics,
    positions,
    logs,
    logFilter,
    setLogFilter,
    clearLogs,
    closePosition,
    closeAllPositions,
    updatePositionSize,
    addLog, // লগ অ্যাড করার জন্য
  } = useAppStore();

  const { riskConfig } = useSettingsStore();

  // --- নতুন ফিচার: স্টেট ম্যানেজমেন্ট ---
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('binance');
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT');
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);



  // ১. এক্সচেঞ্জ লিস্ট লোড করা
  useEffect(() => {
    fetch('http://localhost:8000/api/exchanges')
      .then((res) => res.json())
      .then((data) => setExchanges(data.exchanges || []))
      .catch((err) => console.error('Exchange load failed', err));
  }, []);

  // ২. মার্কেট পেয়ার লোড করা
  useEffect(() => {
    if (!selectedExchange) return;
    setIsLoadingMarkets(true);
    setMarkets([]); // ক্লিয়ার
    fetch(`http://localhost:8000/api/markets/${selectedExchange}`)
      .then((res) => res.json())
      .then((data) => {
        setMarkets(data.markets || []);
        setIsLoadingMarkets(false);
      })
      .catch((err) => {
        console.error('Market load failed', err);
        setIsLoadingMarkets(false);
      });
  }, [selectedExchange]);

  // ৩. WebSocket কানেকশন
  useEffect(() => {
    // কানেক্ট
    socketService.connect();

    // ডাটা সাবস্ক্রাইব
    const unsubscribe = socketService.subscribe((data: any) => {
      setLatestPrice(data.price);
    });

    // ইনিশিয়াল পেয়ার সাবস্ক্রিপশন (Wait for connection)
    const subscribeInit = () => {
      if (socketService['socket']?.readyState === WebSocket.OPEN) {
        socketService.send({ type: 'SUBSCRIBE', exchange: selectedExchange, pair: selectedPair });
      } else {
        setTimeout(subscribeInit, 500);
      }
    };
    subscribeInit();

    return () => {
      unsubscribe();
    };
  }, []); // Mount এর সময় একবারই কল হবে

  const handleExchangeChange = (newExchange: string) => {
    setSelectedExchange(newExchange);
    // এক্সচেঞ্জ পাল্টালে পেয়ার রিসেট না করলে কনফিউশন হতে পারে।
    // আমরা আপাতত পেয়ার "BTC/USDT" ডিফল্ট হিসেবে রাখতে পারি যদি সেটা সব এক্সচেঞ্জে কমন থাকে,
    // কিন্তু সেফটির জন্য আমরা প্রথম পেয়ার সিলেক্ট হওয়া পর্যন্ত অপেক্ষা করতে পারি।
    // এখানে আমরা সিম্পল লজিক রাখছি: আগের পেয়ারই থাকছে, ইউজার ম্যানুয়ালি চেঞ্জ করবে। 
    // তবে প্রাইস লোডিং দেখানোর জন্য নাল করা হচ্ছে।
    setLatestPrice(null);
  };

  const handlePairChange = (newPair: string) => {
    setSelectedPair(newPair);
    setLatestPrice(null); // লোডিং ইন্ডিকেটর
    socketService.send({
      type: 'SUBSCRIBE',
      exchange: selectedExchange,
      pair: newPair
    });
  };

  return (
    <>
      <SEO title="Monitor" description="Real-time system monitoring" />
      <DashboardPanel
        // --- বিদ্যমান প্রপস ---
        metrics={metrics}
        positions={positions}
        riskConfig={riskConfig}
        logs={logs}
        logFilter={logFilter}
        setLogFilter={setLogFilter}
        clearLogs={clearLogs}
        onClosePosition={closePosition}
        onCloseAllPositions={closeAllPositions}
        onEditPosition={(pos) => {
          const newSize = prompt(`Update size for ${pos.pair}`, pos.size.toString());
          if (newSize) {
            const size = parseFloat(newSize);
            if (!isNaN(size)) updatePositionSize(pos.id, size);
          }
        }}

        // --- নতুন প্রপস (New Features) ---
        exchanges={exchanges}
        markets={markets}
        selectedExchange={selectedExchange}
        onExchangeChange={handleExchangeChange}
        selectedPair={selectedPair}
        onPairChange={handlePairChange}
        latestPrice={latestPrice}
        isLoadingMarkets={isLoadingMarkets}
      />
    </>
  );
};

export default MonitorPage;
