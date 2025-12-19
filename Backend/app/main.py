import asyncio
import json
import ccxt.async_support as ccxt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.stream_engine import market_stream

app = FastAPI(title="Metron Hybrid Brain")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ক্যাশিং
exchange_cache = {}

@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_event_loop()
    loop.create_task(market_stream.start_engine())

@app.get("/")
def read_root():
    return {"status": "active", "system": "Metron Hybrid Bot (Full Access)"}

# ✅ FIX 1: সব এক্সচেঞ্জ লোড করা (আপনার রিকোয়ারমেন্ট অনুযায়ী)
@app.get("/api/exchanges")
async def get_exchanges():
    """CCXT লাইব্রেরির সব সাপোর্টেড এক্সচেঞ্জ রিটার্ন করবে"""
    # আগে ফিল্টার করা ছিল, এখন সব আনলক করা হলো
    all_exchanges = ccxt.exchanges
    return {"exchanges": all_exchanges}

@app.get("/api/markets/{exchange_id}")
async def get_markets(exchange_id: str):
    try:
        if exchange_id in exchange_cache:
            return {"markets": exchange_cache[exchange_id]}

        if hasattr(ccxt, exchange_id):
            exchange_class = getattr(ccxt, exchange_id)
            async with exchange_class() as exchange:
                # i3 অপ্টিমাইজেশন: লোড কমানোর জন্য শুধু সিম্বলগুলো লোড করছি
                markets = await exchange.load_markets()
                symbols = list(markets.keys())
                exchange_cache[exchange_id] = symbols
                return {"markets": symbols}
        else:
            raise HTTPException(status_code=404, detail="Exchange not found")
            
    except Exception as e:
        print(f"Error fetching markets: {e}")
        return {"markets": [], "error": str(e)}

@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue = await market_stream.subscribe()
    
    receiver_task = None
    try:
        # 1. Client Listener Task
        async def receive_messages():
            try:
                while True:
                    msg = await websocket.receive_text()
                    data = json.loads(msg)
                    # Handle Subscription Change
                    if data.get("type") == "SUBSCRIBE":
                        exchange = data.get("exchange", "binance")
                        pair = data.get("pair")
                        if pair:
                            await market_stream.change_stream(exchange, pair)
            except (WebSocketDisconnect, RuntimeError):
                # Normal Disconnect
                pass 
            except Exception as e:
                print(f"WS Receiver Error: {e}")

        # Start background listener
        receiver_task = asyncio.create_task(receive_messages())

        # 2. Sender Loop (Main Thread)
        while True:
            # Check if receiver is dead (client disconnected)
            if receiver_task.done():
                break

            # Wait for data or client disconnect
            # We use wait_for to periodically check receiver_task status
            # properly managing the queue get
            get_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait(
                [get_task, receiver_task], 
                return_when=asyncio.FIRST_COMPLETED
            )

            if receiver_task in done:
                get_task.cancel()
                break
            
            # Data is ready to send
            data = await get_task
            try:
                await websocket.send_text(json.dumps(data))
            except (WebSocketDisconnect, RuntimeError):
                # Socket is closed, exit loop
                break

    except Exception as e:
        print(f"Global WS Error: {e}")
    finally:
        # Cleanup
        if receiver_task:
            receiver_task.cancel()
        await market_stream.unsubscribe(queue)
