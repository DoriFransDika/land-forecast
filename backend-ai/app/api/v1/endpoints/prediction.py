from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter()

class PredictionRequest(BaseModel):
    target_year: int = 2030
    method: str = "MLP_Regressor"  # VAE_Latent + MLP
    scenarios: List[str] = ["Trend Historis", "RTRW Agresif", "Konservasi"]

@router.get("/status")
def prediction_status() -> Dict[str, Any]:
    return {
        "module": "VAE Latent Feature Extraction & MLP Land Cover Prediction",
        "status": "ready"
    }

@router.post("/simulate")
def simulate_land_use_prediction(payload: PredictionRequest) -> Dict[str, Any]:
    return {
        "status": "success",
        "target_year": payload.target_year,
        "method": payload.method,
        "predicted_coverage_hectares": {
            "Pemukiman": 14250.5,
            "Perkebunan": 28100.2,
            "Vegetasi Alami": 19430.8,
            "Badan Air": 3200.0,
            "Lahan Terbuka": 5120.3
        }
    }

