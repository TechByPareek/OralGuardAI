from __future__ import annotations

import os
from typing import Any

import joblib
import numpy as np
import pandas as pd

os.environ.setdefault("MPLCONFIGDIR", ".matplotlib")

import shap


MODEL_PATH = "models/xgb_model.pkl"
PREPROCESSOR_PATH = "models/preprocessor.pkl"
RISK_LABELS = {0: "Low", 1: "Medium", 2: "High"}

FRIENDLY_NAMES = {
    "smoking": "Smoking habit",
    "gutka_paan": "Gutka/Paan use",
    "white_patches": "White patches in mouth",
    "mouth_ulcers": "Mouth ulcers",
    "mouth_pain": "Mouth pain",
    "oral_hygiene_score": "Oral hygiene rating",
    "brushing_freq": "Brushing frequency",
    "dental_visits": "Dental visit frequency",
    "alcohol": "Alcohol consumption",
    "vaping": "Vaping/E-cigarettes",
    "family_history": "Family history of cancer",
    "voice_change": "Voice changes",
    "swelling_lumps": "Swelling or lumps",
    "difficulty_swallowing": "Difficulty swallowing",
    "stress_level": "Stress level",
    "sleep_hours": "Sleep duration",
    "passive_smoking": "Passive smoking exposure",
}

RECOMMENDATION_MAP = {
    "smoking": "Quitting smoking is the most impactful step. Even reducing by half significantly lowers your oral cancer risk.",
    "gutka_paan": "Stop using gutka, paan or betel nut immediately. These are the strongest known risk factors for oral cancer in India.",
    "white_patches": "White patches in your mouth need urgent attention. Visit a dentist within 2 weeks - do not ignore this.",
    "mouth_ulcers": "Persistent mouth ulcers lasting more than 2 weeks need professional evaluation. Book a dental appointment soon.",
    "oral_hygiene_score": "Improving your oral hygiene routine can significantly reduce risk. Brush twice daily and floss regularly.",
    "brushing_freq": "Brush at least twice a day with fluoride toothpaste. This simple habit dramatically reduces oral cancer risk.",
    "dental_visits": "Schedule a dental checkup every 6 months. Early detection makes oral cancer nearly 90% treatable.",
    "alcohol": "Reducing alcohol consumption lowers your oral cancer risk. Consider limiting to occasional drinking or stopping entirely.",
    "vaping": "Vaping is not safe - it contains carcinogens that directly irritate oral tissues. Quitting reduces your risk significantly.",
    "family_history": "Given your family history, get an oral cancer screening once a year even without symptoms.",
    "stress_level": "High stress weakens immunity. Try meditation, exercise or speaking to a counsellor.",
    "sleep_hours": "Getting 7-8 hours of sleep helps your body repair damaged cells and strengthens immunity.",
    "passive_smoking": "Reduce exposure to secondhand smoke - it carries the same carcinogens as direct smoking.",
}

FALLBACK_RECOMMENDATIONS = {
    "Low": "Your risk is low - keep maintaining your healthy habits and visit a dentist every 6 months.",
    "Medium": "Your risk is moderate. Small lifestyle changes now can prevent serious problems later.",
    "High": "Your risk level is high. Please consult a dentist for an oral cancer screening as soon as possible.",
}

RAW_FEATURES = [
    "age_group",
    "gender",
    "occupation",
    "location",
    "smoking",
    "vaping",
    "alcohol",
    "gutka_paan",
    "substance_duration",
    "brushing_freq",
    "dental_visits",
    "oral_hygiene_score",
    "mouth_ulcers",
    "white_patches",
    "mouth_pain",
    "difficulty_swallowing",
    "swelling_lumps",
    "voice_change",
    "stress_level",
    "sleep_hours",
    "family_history",
    "hpv_known",
    "diabetes",
    "passive_smoking",
    "flossing",
    "mouthwash",
    "processed_food",
    "sugary_drinks",
    "fruit_veg_intake",
]


def load_artifacts() -> tuple[Any, Any]:
    """Load the trained model and fitted preprocessor artifacts.

    Returns:
        A tuple containing the trained model and fitted preprocessor.
    """
    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    print("Loaded model and preprocessor artifacts.")
    return model, preprocessor


def predict(input_dict: dict[str, Any], model: Any, preprocessor: Any) -> dict[str, Any]:
    """Predict oral cancer risk from a single input record.

    Args:
        input_dict: Dictionary containing one user's feature values.
        model: Trained classifier with predict and predict_proba methods.
        preprocessor: Fitted preprocessing transformer.

    Returns:
        A dictionary with the risk label, predicted class probability, and risk score.
    """
    input_df = pd.DataFrame([input_dict], columns=RAW_FEATURES)
    transformed_input = preprocessor.transform(input_df)
    prediction = int(model.predict(transformed_input)[0])
    probabilities = model.predict_proba(transformed_input)[0]
    probability = round(float(probabilities[prediction]), 2)

    return {
        "risk": RISK_LABELS[prediction],
        "probability": probability,
        "risk_score": prediction,
    }


def _base_feature_name(transformed_feature_name: str) -> str:
    """Extract the original feature name from a transformed feature name.

    Args:
        transformed_feature_name: Name returned by get_feature_names_out.

    Returns:
        Base raw feature name.
    """
    clean_name = transformed_feature_name.split("__", 1)[-1]
    for raw_feature in sorted(RAW_FEATURES, key=len, reverse=True):
        if clean_name == raw_feature or clean_name.startswith(f"{raw_feature}_"):
            return raw_feature
    return clean_name.split("_", 1)[0]


def _class_shap_values(shap_values: Any, predicted_class: int) -> np.ndarray:
    """Select SHAP values for the predicted class from common SHAP return shapes.

    Args:
        shap_values: Values returned by shap.TreeExplainer.shap_values.
        predicted_class: Integer class predicted by the model.

    Returns:
        One-dimensional SHAP value array for the selected class and sample.
    """
    if isinstance(shap_values, list):
        return np.asarray(shap_values[predicted_class][0])

    values = np.asarray(shap_values)
    if values.ndim == 3:
        return values[0, :, predicted_class]
    if values.ndim == 2:
        return values[0]
    return values.reshape(-1)


def explain(input_dict: dict[str, Any], model: Any, preprocessor: Any) -> list[dict[str, Any]]:
    """Generate top SHAP explanations for a single input record.

    Args:
        input_dict: Dictionary containing one user's feature values.
        model: Trained tree-based classifier.
        preprocessor: Fitted preprocessing transformer.

    Returns:
        A list of the top 5 feature impacts sorted by absolute SHAP value.
    """
    input_df = pd.DataFrame([input_dict], columns=RAW_FEATURES)
    transformed_input = preprocessor.transform(input_df)
    predicted_class = int(model.predict(transformed_input)[0])

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(transformed_input)
    class_values = _class_shap_values(shap_values, predicted_class)
    feature_names = preprocessor.get_feature_names_out()

    rows = []
    for transformed_name, shap_value in zip(feature_names, class_values):
        feature = _base_feature_name(str(transformed_name))
        rows.append(
            {
                "feature": feature,
                "display_name": FRIENDLY_NAMES.get(feature, feature.replace("_", " ").title()),
                "impact": round(float(abs(shap_value)), 2),
                "direction": "increases risk" if shap_value >= 0 else "decreases risk",
            }
        )

    return sorted(rows, key=lambda row: row["impact"], reverse=True)[:5]


def generate_recommendations(risk: str, top_factors: list[dict[str, Any]]) -> list[str]:
    """Generate exactly 3 recommendations from risk level and top SHAP factors.

    Args:
        risk: Human-readable risk label: Low, Medium, or High.
        top_factors: Top factor dictionaries returned by explain.

    Returns:
        Exactly 3 recommendation strings.
    """
    recommendations = []
    for factor in top_factors:
        recommendation = RECOMMENDATION_MAP.get(factor["feature"])
        if recommendation and recommendation not in recommendations:
            recommendations.append(recommendation)
        if len(recommendations) == 3:
            return recommendations

    fallback = FALLBACK_RECOMMENDATIONS[risk]
    if fallback not in recommendations:
        recommendations.append(fallback)

    for recommendation in RECOMMENDATION_MAP.values():
        if recommendation not in recommendations:
            recommendations.append(recommendation)
        if len(recommendations) == 3:
            break

    return recommendations[:3]


def full_prediction(
    input_dict: dict[str, Any],
    model: Any | None = None,
    preprocessor: Any | None = None,
) -> dict[str, Any]:
    """Run artifact loading, prediction, explanation, and recommendations.

    Args:
        input_dict: Dictionary containing one user's feature values.
        model: Optional preloaded trained classifier.
        preprocessor: Optional preloaded fitted preprocessing transformer.

    Returns:
        Complete prediction response with risk, probability, explanations,
        recommendations, and a medical disclaimer.
    """
    if model is None or preprocessor is None:
        model, preprocessor = load_artifacts()
    prediction = predict(input_dict, model, preprocessor)
    top_factors = explain(input_dict, model, preprocessor)
    recommendations = generate_recommendations(prediction["risk"], top_factors)

    return {
        "risk": prediction["risk"],
        "probability": prediction["probability"],
        "top_factors": top_factors,
        "recommendations": recommendations,
        "disclaimer": "This is not a medical diagnosis. For awareness only. Please consult a qualified dental professional.",
    }


if __name__ == "__main__":
    test_input = {
        "age_group": "18-20",
        "gender": "Male",
        "occupation": "Undergraduate Student",
        "location": "Delhi",
        "smoking": 2,
        "vaping": 1,
        "alcohol": 1,
        "gutka_paan": 1,
        "substance_duration": "1-3 years",
        "brushing_freq": 0,
        "dental_visits": "never",
        "oral_hygiene_score": 2,
        "mouth_ulcers": 2,
        "white_patches": 2,
        "mouth_pain": 1,
        "difficulty_swallowing": 1,
        "swelling_lumps": 0,
        "voice_change": 0,
        "stress_level": 8,
        "sleep_hours": 5.0,
        "family_history": 1,
        "hpv_known": 0,
        "diabetes": 0,
        "passive_smoking": 1,
        "flossing": 0,
        "mouthwash": 0,
        "processed_food": "high",
        "sugary_drinks": "high",
        "fruit_veg_intake": "low",
    }
    result = full_prediction(test_input)
    print("Risk:", result["risk"])
    print("Probability:", result["probability"])
    print("Top factors:")
    for f in result["top_factors"]:
        print(f"  - {f['display_name']}: {f['impact']} ({f['direction']})")
    print("Recommendations:")
    for r in result["recommendations"]:
        print(f"  - {r}")
