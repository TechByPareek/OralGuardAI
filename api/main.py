from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import PredictionResponse, UserInput
from src.predict import full_prediction, load_artifacts


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load model artifacts once when the FastAPI application starts."""
    model, preprocessor = load_artifacts()
    app.state.model = model
    app.state.preprocessor = preprocessor
    yield


app = FastAPI(title="OralGuard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    """Return basic API metadata."""
    return {"message": "Welcome to OralGuard API", "docs": "/docs", "version": "1.0.0"}


@app.get("/health")
def health() -> dict[str, Any]:
    """Return service health and model class metadata."""
    return {"status": "ok", "model": "OralGuard v1.0", "classes": ["Low", "Medium", "High"]}


@app.post("/predict", response_model=PredictionResponse)
def predict_risk(user_input: UserInput) -> PredictionResponse:
    """Predict oral cancer risk and return explainability factors plus recommendations.

    The endpoint validates one user survey response, runs the trained OralGuard
    XGBoost model, explains the prediction with SHAP, and returns practical
    recommendations for awareness.
    """
    try:
        response = full_prediction(
            user_input.model_dump(),
            model=app.state.model,
            preprocessor=app.state.preprocessor,
        )
        return PredictionResponse(**response)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
