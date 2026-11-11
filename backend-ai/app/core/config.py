from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Spatial AI & Land Cover Prediction Engine"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # React Vite dev server
        "http://localhost:3000",
        "http://localhost:8000",  # Laravel Backend API
        "http://127.0.0.1:8000",
    ]
    WEIGHTS_DIR: str = "weights"
    DATA_SAMPLE_DIR: str = "data_sample"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

