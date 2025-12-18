from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Metron Hybrid Brain")

# ফ্রন্টএন্ড থেকে রিকোয়েস্ট আসার পারমিশন (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # ডেভেলপমেন্টের জন্য সব ওপেন
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "active", "system": "Metron Hybrid Bot", "mode": "Dockerized"}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy", 
        "server": "FastAPI inside Docker",
        "database": "Connected (Mock)"
    }
