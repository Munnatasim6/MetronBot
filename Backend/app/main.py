import asyncio
import json
import ccxt.async_support as ccxt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# মডিউল ইম্পোর্ট
from app.services.stream_engine import market_stream
from app.services.signal_engine import signal_engine
from app.database import init_db, get_strategy, set_strategy

app = FastAPI(title="Metron Hybrid Brain")

# CORS কনফিগারেশন
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ১. কানেকশন ম্যানেজার (WebSocket)
# ============================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # সব কানেক্টেড ক্লায়েন্টকে মেসেজ পাঠানো
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Broadcast Error: {e}")
                # ডেড কানেকশন রিমুভ করার লজিক এখানে যোগ করা যেতে পারে

manager = ConnectionManager()

# ============================================================
# ২. ব্রডকাস্ট ইঞ্জিন (ব্যাকগ্রাউন্ড টাস্ক)
# ============================================================
async def broadcast_market_data():
    """
    প্রতি ২ সেকেন্ড পর পর মার্কেট ডাটা ফেচ করে সকেটে পুশ করে।
    এটি Polling এর বিকল্প হিসেবে কাজ করে।
    """
    while True:
        try:
            # যদি কোনো ক্লায়েন্ট কানেক্টেড না থাকে, তবে রিসোর্স বাঁচানোর জন্য অপেক্ষা করবে
            if not manager.active_connections:
                await asyncio.sleep(3)
                continue

            async with ccxt.binance() as exchange:
                symbol = "BTC/USDT"
                
                # ১. সেন্টিমেন্ট ডাটা ক্যালকুলেশন
                ohlcv = await exchange.fetch_ohlcv(symbol, '1h', limit=100)
                if ohlcv:
                    sentiment_result = signal_engine.analyze_market_sentiment(ohlcv)
                    sentiment_result["symbol"] = symbol
                    
                    # ক্লায়েন্টকে পাঠানো
                    await manager.broadcast({
                        "type": "SENTIMENT",
                        "payload": sentiment_result
                    })

                # ২. রিসেন্ট ট্রেড ডাটা
                trades = await exchange.fetch_trades(symbol, limit=15)
                formatted_trades = []
                for t in trades:
                    formatted_trades.append({
                        "id": t['id'],
                        "price": t['price'],
                        "amount": t['amount'],
                        "side": t['side'],
                        "time": t['datetime'].split('T')[1][:8]
                    })
                
                await manager.broadcast({
                    "type": "TRADES",
                    "payload": formatted_trades
                })

            # ২ সেকেন্ড বিরতি (i3 এর জন্য অপ্টিমাইজড)
            await asyncio.sleep(2)

        except Exception as e:
            print(f"Broadcast Engine Error: {e}")
            await asyncio.sleep(5) # এরর হলে ৫ সেকেন্ড ব্রেক

# ============================================================
# ৩. সিস্টেম স্টার্টআপ ইভেন্ট
# ============================================================
@app.on_event("startup")
async def startup_event():
    # ডাটাবেস ইনিশিয়ালাইজেশন
    init_db()
    
    # ব্যাকগ্রাউন্ড টাস্ক শুরু
    loop = asyncio.get_event_loop()
    loop.create_task(market_stream.start_engine()) # আগের স্ট্রিম ইঞ্জিন
    loop.create_task(broadcast_market_data())      # নতুন সকেট ব্রডকাস্টার

# ============================================================
# ৪. API এন্ডপয়েন্টস (HTTP)
# ============================================================

class StrategyRequest(BaseModel):
    strategy: str

@app.get("/api/strategy")
async def get_bot_strategy():
    return {"strategy": get_strategy()}

@app.post("/api/strategy")
async def set_bot_strategy(req: StrategyRequest):
    set_strategy(req.strategy)
    return {"status": "success", "message": f"Strategy switched to {req.strategy}"}

@app.get("/api/sentiment")
async def get_sentiment(symbol: str = Query("BTC/USDT"), timeframe: str = "1h"):
    # ম্যানুয়াল রিফ্রেশ বা প্রথম লোডের জন্য
    try:
        async with ccxt.binance() as exchange:
            ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, limit=100)
            if not ohlcv: raise HTTPException(status_code=404)
            result = signal_engine.analyze_market_sentiment(ohlcv)
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/arbitrage")
async def get_arbitrage(symbol: str = Query("BTC/USDT")):
    # আরবিট্রেজ আমরা এখনো সকেটে দেইনি, তাই এটি API তেই থাকছে
    exchanges_to_check = ['binance', 'kucoin', 'bybit', 'gateio']
    async def fetch_price(exchange_id, sym):
        try:
            if hasattr(ccxt, exchange_id):
                exchange_class = getattr(ccxt, exchange_id)
                async with exchange_class() as exchange:
                    ticker = await exchange.fetch_ticker(sym)
                    return {"exchange": exchange_id.title(), "price": ticker['last'], "logo": "🟢"}
        except: return None

    tasks = [fetch_price(ex_id, symbol) for ex_id in exchanges_to_check]
    prices = await asyncio.gather(*tasks)
    return {"data": [p for p in prices if p]}

@app.get("/api/trades")
async def get_recent_trades_api(symbol: str = "BTC/USDT"):
    # ফলব্যাক API
    async with ccxt.binance() as exchange:
        trades = await exchange.fetch_trades(symbol, limit=15)
        return trades

# ============================================================
# ৫. ওয়েব সকেট এন্ডপয়েন্ট (Updated)
# ============================================================
@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # ক্লায়েন্ট থেকে কোনো মেসেজ আসলে তা রিসিভ করা (যদি দরকার হয়)
            # বর্তমানে আমরা শুধু পুশ করছি, তাই এখানে লুপটি কানেকশন ধরে রাখবে
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)

