import json
import asyncio
import websockets

class LiveMarketStream:
    def __init__(self):
        # Binance Public Stream URL (BTC/USDT Trade Stream)
        self.binance_ws_url = "wss://stream.binance.com:9443/ws/btcusdt@trade"
        self.latest_price = 0.0
    
    async def listen_to_market(self):
        """Binance থেকে নিরবচ্ছিন্ন ডেটা শোনার ফাংশন"""
        async with websockets.connect(self.binance_ws_url) as ws:
            print(f"🔗 Connected to Binance Stream: {self.binance_ws_url}")
            while True:
                try:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    # 'p' মানে Price, 'q' মানে Quantity
                    self.latest_price = float(data['p'])
                except Exception as e:
                    print(f"⚠️ Stream Error: {e}")
                    break

market_stream = LiveMarketStream()
