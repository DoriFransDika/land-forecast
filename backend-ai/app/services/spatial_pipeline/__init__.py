"""
Eksposur modul layanan untuk 7-Stage Spatial Pipeline.
Menggunakan importlib karena nama sub-folder diawali angka (01_input_data, dst.)
agar tetap rapi secara arsitektural sekaligus mudah diimpor secara Pythonic.
"""

from importlib import import_module

_preprocessing_mod = import_module(
    "app.services.spatial_pipeline.02_preprocessing.preprocessing_service"
)
_feature_mod = import_module(
    "app.services.spatial_pipeline.03_feature_embedding.feature_service"
)

SpatialPreprocessingService = _preprocessing_mod.SpatialPreprocessingService
SpatialFeatureService = _feature_mod.SpatialFeatureService

__all__ = [
    "SpatialPreprocessingService",
    "SpatialFeatureService",
]

