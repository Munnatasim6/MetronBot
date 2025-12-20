import asyncio
import json
import ccxt.async_support as ccxt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.stream_engine import market_stream
# আমাদের সিগন্যাল ইঞ্জিন ইম্পোর্ট (নিশ্চিত করুন signal_engine.py ফাইলটি services ফোল্ডারে আছে)
from app.services.signal_engine import signal_engine

app = FastAPI(title="Metron Hybrid Brain")

# CORS কনফিগারেশন (ফ্রন্টএন্ড কানেকশনের জন্য জরুরি)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# গ্লোবাল ভেরিয়েবল (মেমোরিতে স্ট্র্যাটেজি রাখার জন্য)
current_bot_strategy = "conservative"

# ডাটা মডেল তৈরি
class StrategyRequest(BaseModel):
    strategy: str

# ক্যাশিং মেকানিজম
exchange_cache = {}

@app.on_event("startup")
async def startup_event():
    # ব্যাকগ্রাউন্ড সকেট ইঞ্জিন চালু
    loop = asyncio.get_event_loop()
    loop.create_task(market_stream.start_engine())

@app.get("/")
def read_root():
    return {"status": "active", "system": "Metron Hybrid Bot (Full Access)"}

# ============================================================
# ১. এক্সচেঞ্জ ডাটা (Exchanges)
# ============================================================

@app.get("/api/exchanges")
async def get_exchanges():
    return {"exchanges": ccxt.exchanges}

@app.get("/api/markets/{exchange_id}")
async def get_markets(exchange_id: str):
    try:
        if exchange_id in exchange_cache:
            return {"markets": exchange_cache[exchange_id]}

        if hasattr(ccxt, exchange_id):
            exchange_class = getattr(ccxt, exchange_id)
            async with exchange_class() as exchange:
                markets = await exchange.load_markets()
                symbols = list(markets.keys())
                exchange_cache[exchange_id] = symbols
                return {"markets": symbols}
        else:
            raise HTTPException(status_code=404, detail="Exchange not found")
    except Exception as e:
        return {"markets": [], "error": str(e)}

# ============================================================
# ২. সেন্টিমেন্ট অ্যানালাইসিস API (Signal Engine)
# ============================================================

@app.get("/api/sentiment")
async def get_sentiment(symbol: str = Query("BTC/USDT", description="Trading Pair"), timeframe: str = "1h"):
    """
    ফ্রন্টএন্ড থেকে প্রতি ২ সেকেন্ড পর পর এটি কল হবে।
    এটি Binance থেকে লাইভ ডাটা নিয়ে ২০টি ইন্ডিকেটর ক্যালকুলেট করে রেজাল্ট দিবে।
    """
    try:
        async with ccxt.binance() as exchange:
            # i3 অপ্টিমাইজেশন: ক্যালকুলেশনের জন্য শেষ ১০০টি ক্যান্ডেলই যথেষ্ট
            ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, limit=100)
            
            if not ohlcv:
                raise HTTPException(status_code=404, detail="No market data found")

            # সিগন্যাল ইঞ্জিনে ডাটা পাঠানো
            analysis_result = signal_engine.analyze_market_sentiment(ohlcv)
            
            # মেটাডাটা যোগ করা
            analysis_result["symbol"] = symbol
            analysis_result["timeframe"] = timeframe
            
            return analysis_result

    except Exception as e:
        print(f"Sentiment Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# ৩. আরবিট্রেজ মনিটর API (Arbitrage)
# ============================================================

@app.get("/api/arbitrage")
async def get_arbitrage(symbol: str = Query("BTC/USDT", description="Symbol to compare")):
    """
    প্যারালাল রিকোয়েস্টের মাধ্যমে ৪টি এক্সচেঞ্জের লাইভ প্রাইস চেক করে।
    """
    exchanges_to_check = ['binance', 'kucoin', 'bybit', 'gateio']

    async def fetch_price(exchange_id, sym):
        try:
            if hasattr(ccxt, exchange_id):
                exchange_class = getattr(ccxt, exchange_id)
                async with exchange_class() as exchange:
                    ticker = await exchange.fetch_ticker(sym)
                    return {
                        "exchange": exchange_id.title(),
                        "price": ticker['last'],
                        "logo": "🟢" 
                    }
        except Exception:
            return None # কোনো এক্সচেঞ্জ রেসপন্স না করলে স্কিপ করবে

    # প্যারালাল প্রসেসিং (দ্রুত রেসপন্সের জন্য)
    tasks = [fetch_price(ex_id, symbol) for ex_id in exchanges_to_check]
    prices = await asyncio.gather(*tasks)
    
    valid_prices = [p for p in prices if p is not None]
    
    if not valid_prices:
        raise HTTPException(status_code=503, detail="Could not fetch prices")

    return {"data": valid_prices}

# ============================================================
# ৪. রিসেন্ট ট্রেড API (Recent Trades)
# ============================================================

@app.get("/api/trades")
async def get_recent_trades(symbol: str = "BTC/USDT"):
    """
    Binance থেকে লেটেস্ট ট্রেড ডাটা ফেচ করে।
    """
    try:
        async with ccxt.binance() as exchange:
            trades = await exchange.fetch_trades(symbol, limit=15) # i3 এর জন্য লিমিট ১৫
            
            # ডাটা ফরম্যাটিং
            formatted_trades = []
            for t in trades:
                formatted_trades.append({
                    "id": t['id'],
                    "price": t['price'],
                    "amount": t['amount'],
                    "side": t['side'],
                    "time": t['datetime'].split('T')[1][:8] # শুধু সময়টুকু (HH:MM:SS)
                })
            
            return formatted_trades
    except Exception as e:
        print(f"Trade Fetch Error: {e}")
        return []

# ============================================================
# ৪. ওয়েবসকেট (WebSocket) - অপরিবর্তিত
# ============================================================

@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue = await market_stream.subscribe()
    
    receiver_task = None
    try:
        async def receive_messages():
            try:
                while True:
                    msg = await websocket.receive_text()
                    data = json.loads(msg)
                    if data.get("type") == "SUBSCRIBE":
                        exchange = data.get("exchange", "binance")
                        pair = data.get("pair")
                        if pair:
                            await market_stream.change_stream(exchange, pair)
            except (WebSocketDisconnect, RuntimeError):
                pass 
            except Exception as e:
                print(f"WS Receiver Error: {e}")

        receiver_task = asyncio.create_task(receive_messages())

        while True:
            if receiver_task.done():
                break

            get_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait(
                [get_task, receiver_task], 
                return_when=asyncio.FIRST_COMPLETED
            )

            if receiver_task in done:
                get_task.cancel()
                break
            
            data = await get_task
            try:
                await websocket.send_text(json.dumps(data))
            except (WebSocketDisconnect, RuntimeError):
                break

    except Exception as e:
        print(f"Global WS Error: {e}")
    finally:
        if receiver_task:
            receiver_task.cancel()
        await market_stream.unsubscribe(queue)

@app.post("/api/strategy")
async def set_strategy(req: StrategyRequest):
    """
    ফ্রন্টএন্ড থেকে স্ট্র্যাটেজি মোড রিসিভ করে আপডেট করে।
    """
    global current_bot_strategy
    current_bot_strategy = req.strategy
    
    print(f"✅ Bot Strategy Updated to: {current_bot_strategy.upper()}")
    
    return {
        "status": "success", 
        "message": f"Strategy switched to {current_bot_strategy}",
        "current_mode": current_bot_strategy
    }
