import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.services.stream_engine import market_stream

app = FastAPI(title="Metron Hybrid Brain")

# CORS (Docker environment এ ফ্রন্টএন্ড কানেকশনের জন্য জরুরি)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # প্রোডাকশনে নির্দিষ্ট ডোমেইন দিবে
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# অ্যাপ চালু হওয়ার সাথে সাথে Binance লিসেনার ব্যাকগ্রাউন্ডে স্টার্ট হবে
@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_event_loop()
    loop.create_task(market_stream.listen_to_market())

@app.get("/")
def read_root():
    return {"status": "active", "system": "Metron Hybrid Bot (Dockerized)"}

# 🔥 ফ্রন্টএন্ডের জন্য সকেট ব্রিজ
@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🖥️ Frontend Connected via Docker Network")
    try:
        while True:
            # Binance থেকে পাওয়া লেটেস্ট প্রাইস ফ্রন্টএন্ডে পাঠাই
            if market_stream.latest_price > 0:
                payload = {
                    "type": "TICKER",
                    "data": {
                        "pair": "BTC/USDT",
                        "price": market_stream.latest_price,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                }
                await websocket.send_text(json.dumps(payload))
            
            # প্রসেসর বাঁচানোর জন্য সামান্য বিরতি (0.5s)
            await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        print("🔴 Frontend Disconnected")
