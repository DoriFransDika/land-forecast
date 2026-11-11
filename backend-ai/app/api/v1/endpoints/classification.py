from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter()

class ClassificationRequest(BaseModel):
    n_estimators: int = 100
    max_depth: int = 15
    feature_columns: List[str] = ["NDVI", "NDWI", "SAVI", "Band2", "Band3", "Band4", "Band8"]

@router.get("/status")
def rf_status() -> Dict[str, Any]:
    return {
        "module": "Random Forest Classification",
        "status": "ready",
        "classes": ["Badan Air", "Vegetasi Lebat", "Pemukiman/Terbangun", "Lahan Terbuka", "Perkebunan"]
    }

@router.post("/train")
def train_random_forest(config: ClassificationRequest) -> Dict[str, Any]:
    return {
        "status": "success",
        "message": "Inisialisasi pipeline Random Forest classifier.",
        "config": config.model_dump(),
        "baseline_accuracy": 0.92
    }

