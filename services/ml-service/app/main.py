from fastapi import FastAPI
from datetime import datetime

app = FastAPI(
    title="Kaol ML Service",
    description="Internal ML service invoked by Node.js API (No direct browser access)",
    version="0.1.0",
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ml-service",
        "timestamp": datetime.utcnow().isoformat(),
    }
