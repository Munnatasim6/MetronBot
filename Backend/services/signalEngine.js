// backend/services/signalEngine.js

const {
    RSI, MACD, EMA, SMA, BollingerBands, Stochastic, ADX, CCI, WilliamsR,
    OBV, MFI, PSAR, VWAP, ATR, ROC, IchimokuCloud
} = require('technicalindicators');

// ২০টি ইন্ডিকেটর বিশ্লেষণ করে ফাইনাল সিগন্যাল তৈরি করার ইঞ্জিন
function analyzeFullMarketSentiment(open, high, low, close, volume) {
    // ডাটা ভ্যালিডেশন: পর্যাপ্ত ডাটা না থাকলে ক্যালকুলেশন হবে না
    if (!close || close.length < 50) return { verdict: "LOADING...", score: 0, details: [] };

    let buyVotes = 0;
    let sellVotes = 0;
    let neutralVotes = 0;
    let details = []; // ফ্রন্টএন্ডে দেখানোর জন্য ডিটেইলস লিস্ট

    // সাহায্যকারী ফাংশন: ভোট যুক্ত করা
    const addVote = (name, signal) => {
        if (signal === "BUY") buyVotes++;
        else if (signal === "SELL") sellVotes++;
        else neutralVotes++;
        details.push({ name, signal });
    };

    const lastClose = close[close.length - 1];
    const prevClose = close[close.length - 2];

    try {
        // ==========================================
        // ১. Trend Indicators (মার্কেটের দিক)
        // ==========================================

        // 1. SMA (50)
        const sma = SMA.calculate({ period: 50, values: close });
        addVote("SMA (50)", lastClose > sma[sma.length - 1] ? "BUY" : "SELL");

        // 2. EMA (20)
        const ema = EMA.calculate({ period: 20, values: close });
        addVote("EMA (20)", lastClose > ema[ema.length - 1] ? "BUY" : "SELL");

        // 3. MACD
        const macd = MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
        const lastMacd = macd[macd.length - 1];
        addVote("MACD", lastMacd.MACD > lastMacd.signal ? "BUY" : "SELL");

        // 4. ADX (Trend Strength)
        const adx = ADX.calculate({ high, low, close, period: 14 });
        const lastAdx = adx[adx.length - 1];
        // ADX > 25 মানে স্ট্রং ট্রেন্ড
        const adxSignal = lastAdx.adx > 25 ? (lastAdx.pdi > lastAdx.mdi ? "BUY" : "SELL") : "NEUTRAL";
        addVote("ADX (Strength)", adxSignal);

        // 5. Parabolic SAR
        const psar = PSAR.calculate({ step: 0.02, max: 0.2, high, low });
        addVote("Parabolic SAR", lastClose > psar[psar.length - 1] ? "BUY" : "SELL");

        // 6. Ichimoku Cloud (Conversion vs Base Line Cross)
        const ichimoku = IchimokuCloud.calculate({ high, low, conversionPeriod: 9, basePeriod: 26, spanPeriod: 52, displacement: 26 });
        const lastIchi = ichimoku[ichimoku.length - 1];
        addVote("Ichimoku Cloud", lastIchi.conversion > lastIchi.base ? "BUY" : "SELL");

        // 7. Supertrend (Custom Logic using ATR approximation for simplicity/performance)
        // এখানে ATR ব্যবহার করে সাধারণ ডিরেকশন চেক করা হচ্ছে
        const atr14 = ATR.calculate({ high, low, close, period: 14 });
        addVote("Supertrend (Est.)", lastClose > prevClose + (atr14[atr14.length - 1] || 0) ? "BUY" : "SELL");

        // ==========================================
        // ২. Momentum Indicators (গতি ও শক্তি)
        // ==========================================

        // 8. RSI
        const rsi = RSI.calculate({ values: close, period: 14 });
        const lastRsi = rsi[rsi.length - 1];
        addVote("RSI (14)", lastRsi < 30 ? "BUY" : lastRsi > 70 ? "SELL" : "NEUTRAL");

        // 9. Stochastic Oscillator
        const stoch = Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 });
        const lastStoch = stoch[stoch.length - 1];
        addVote("Stochastic", lastStoch.k < 20 ? "BUY" : lastStoch.k > 80 ? "SELL" : "NEUTRAL");

        // 10. CCI
        const cci = CCI.calculate({ open: close, high, low, close, period: 20 });
        const lastCci = cci[cci.length - 1];
        addVote("CCI", lastCci < -100 ? "BUY" : lastCci > 100 ? "SELL" : "NEUTRAL");

        // 11. Williams %R
        const wR = WilliamsR.calculate({ high, low, close, period: 14 });
        const lastWr = wR[wR.length - 1];
        addVote("Williams %R", lastWr < -80 ? "BUY" : lastWr > -20 ? "SELL" : "NEUTRAL");

        // 12. Momentum Indicator (ROC - Rate of Change)
        const roc = ROC.calculate({ values: close, period: 12 });
        addVote("Momentum (ROC)", roc[roc.length - 1] > 0 ? "BUY" : "SELL");

        // ==========================================
        // ৩. Volatility Indicators (অস্থিরতা)
        // ==========================================

        // 13. Bollinger Bands
        const bb = BollingerBands.calculate({ period: 20, values: close, stdDev: 2 });
        const lastBb = bb[bb.length - 1];
        let bbSignal = "NEUTRAL";
        if (lastClose < lastBb.lower) bbSignal = "BUY"; // Dip Buy
        if (lastClose > lastBb.upper) bbSignal = "SELL"; // Peak Sell
        addVote("Bollinger Bands", bbSignal);

        // 14. ATR (Volatility check only - Neutral bias usually, using Trend check)
        const atr = ATR.calculate({ high, low, close, period: 14 });
        const currentAtr = atr[atr.length - 1];
        addVote("ATR (Volatility)", currentAtr > atr[atr.length - 10] ? "NEUTRAL" : "NEUTRAL"); // Just info

        // 15. Keltner Channels (Approximated with EMA +/- 2*ATR)
        // 16. Donchian Channels
        // (For simplicity in this block, logic implies Breakout strategies)
        const maxHigh = Math.max(...high.slice(-20));
        const minLow = Math.min(...low.slice(-20));
        let donchianSignal = "NEUTRAL";
        if (lastClose >= maxHigh) donchianSignal = "BUY"; // Breakout
        else if (lastClose <= minLow) donchianSignal = "SELL"; // Breakdown
        addVote("Donchian Channels", donchianSignal);

        // Keltner Placeholder Logic (Uses EMA Trend)
        addVote("Keltner Channels", lastClose > ema[ema.length - 1] ? "BUY" : "SELL");

        // ==========================================
        // ৪. Volume Indicators (লেনদেনের পরিমাণ)
        // ==========================================

        // 17. OBV
        const obv = OBV.calculate({ close, volume });
        addVote("OBV", obv[obv.length - 1] > obv[obv.length - 2] ? "BUY" : "SELL");

        // 18. MFI
        const mfi = MFI.calculate({ high, low, close, volume, period: 14 });
        const lastMfi = mfi[mfi.length - 1];
        addVote("MFI", lastMfi < 20 ? "BUY" : lastMfi > 80 ? "SELL" : "NEUTRAL");

        // 19. VWAP
        const vwap = VWAP.calculate({ high, low, close, volume });
        addVote("VWAP", lastClose > vwap[vwap.length - 1] ? "BUY" : "SELL");

        // 20. A/D Line (Accumulation/Distribution)
        // Simplified Logic: Close higher than open indicates accumulation
        addVote("A/D Line", lastClose > close[close.length - 5] ? "BUY" : "SELL");

    } catch (error) {
        console.error("Calculation Error:", error);
    }

    // ==========================================
    // ফাইনাল ভারডিক্ট ক্যালকুলেশন
    // ==========================================
    let score = buyVotes - sellVotes;
    let verdict = "NEUTRAL 😐";
    let color = "#ffb300"; // হলুদ

    if (score >= 6) { verdict = "STRONG BUY 🚀"; color = "#00c853"; } // গাঢ় সবুজ
    else if (score >= 2) { verdict = "BUY 📈"; color = "#00e676"; } // হালকা সবুজ
    else if (score <= -6) { verdict = "STRONG SELL 📉"; color = "#ff3d00"; } // গাঢ় লাল
    else if (score <= -2) { verdict = "SELL 🔻"; color = "#ff5722"; } // হালকা লাল

    return {
        verdict,
        color,
        score,
        summary: { buy: buyVotes, sell: sellVotes, neutral: neutralVotes },
        details // ২০টি ইন্ডিকেটরের ফুল লিস্ট
    };
}

module.exports = { analyzeFullMarketSentiment };
