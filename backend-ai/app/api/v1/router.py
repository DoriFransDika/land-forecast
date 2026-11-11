from fastapi import APIRouter
from app.api.v1.endpoints import spatial, classification, prediction, pipeline_router

api_router = APIRouter()

api_router.include_router(spatial.router, prefix="/spatial", tags=["Spatial Processing"])
api_router.include_router(pipeline_router.router, prefix="/pipeline", tags=["7-Stage Spatial Pipeline"])
api_router.include_router(classification.router, prefix="/classification", tags=["Random Forest Classification"])
api_router.include_router(prediction.router, prefix="/prediction", tags=["VAE & MLP Prediction"])

