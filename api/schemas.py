from typing import Literal

from pydantic import BaseModel, Field


class UserInput(BaseModel):
    """Validated request body for OralGuard risk prediction."""

    age_group: Literal["18-20", "21-23", "24-27"]
    gender: Literal["Male", "Female", "Other"]
    occupation: str
    location: str
    smoking: int = Field(ge=0, le=2)
    vaping: int = Field(ge=0, le=2)
    alcohol: int = Field(ge=0, le=2)
    gutka_paan: int = Field(ge=0, le=1)
    substance_duration: str
    brushing_freq: int = Field(ge=0, le=2)
    dental_visits: Literal["never", "yearly", "sixmonthly", "problem_only"]
    oral_hygiene_score: int = Field(ge=1, le=5)
    mouth_ulcers: int = Field(ge=0, le=2)
    white_patches: int = Field(ge=0, le=2)
    mouth_pain: int = Field(ge=0, le=2)
    difficulty_swallowing: int = Field(ge=0, le=2)
    swelling_lumps: int = Field(ge=0, le=2)
    voice_change: int = Field(ge=0, le=2)
    stress_level: int = Field(ge=1, le=10)
    sleep_hours: float = Field(ge=4.0, le=9.0)
    family_history: int = Field(ge=0, le=1)
    hpv_known: int = Field(ge=0, le=1)
    diabetes: int = Field(ge=0, le=1)
    passive_smoking: int = Field(ge=0, le=1)
    flossing: int = Field(ge=0, le=1)
    mouthwash: int = Field(ge=0, le=1)
    processed_food: Literal["low", "medium", "high"]
    sugary_drinks: Literal["low", "medium", "high"]
    fruit_veg_intake: Literal["low", "medium", "high"]


class PredictionResponse(BaseModel):
    """Response body returned by OralGuard prediction endpoint."""

    risk: str
    probability: float
    top_factors: list
    recommendations: list
    disclaimer: str
