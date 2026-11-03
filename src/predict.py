from __future__ import annotations

import logging
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd

os.environ.setdefault("MPLCONFIGDIR", ".matplotlib")

import shap


logger = logging.getLogger(__name__)

MODEL_PATH = "models/xgb_model.pkl"
PREPROCESSOR_PATH = "models/preprocessor.pkl"
RISK_LABELS = {0: "Low", 1: "Medium", 2: "High"}
MIN_ABSOLUTE_SHAP_VALUE = 0.01

ABSENCE_FEATURES = {
    "smoking",
    "vaping",
    "alcohol",
    "gutka_paan",
    "passive_smoking",
    "mouth_ulcers",
    "white_patches",
    "mouth_pain",
    "difficulty_swallowing",
    "swelling_lumps",
    "voice_change",
    "family_history",
    "hpv_known",
    "diabetes",
    "flossing",
    "mouthwash",
    "substance_duration",
}

SUBSTANCE_DURATION_ALIASES = {
    "never": "I don't use any",
    "i don't use any": "I don't use any",
    "1-3 years": "1�3 years",
    "1–3 years": "1�3 years",
}

USER_VALUE_LABELS = {
    "smoking": {0: "Never", 1: "Occasionally", 2: "Regularly"},
    "vaping": {0: "Never", 1: "Occasionally", 2: "Regularly"},
    "alcohol": {0: "Never", 1: "Social", 2: "Regularly"},
    "gutka_paan": {0: "Never", 1: "Sometimes"},
    "passive_smoking": {0: "Not exposed", 1: "Exposed"},
    "mouth_ulcers": {0: "None", 1: "Occasionally", 2: "Frequently"},
    "white_patches": {0: "None", 1: "Not sure", 2: "Yes"},
    "mouth_pain": {0: "None", 1: "Mild", 2: "Severe"},
    "difficulty_swallowing": {0: "None", 1: "Sometimes", 2: "Often"},
    "swelling_lumps": {0: "None", 1: "Not sure", 2: "Yes"},
    "voice_change": {0: "None", 1: "Sometimes", 2: "Often"},
    "family_history": {0: "No", 1: "Yes"},
    "hpv_known": {0: "No", 1: "Yes"},
    "diabetes": {0: "No", 1: "Yes"},
    "flossing": {0: "No", 1: "Yes"},
    "mouthwash": {0: "No", 1: "Yes"},
    "brushing_freq": {0: "Rarely", 1: "1x daily", 2: "2x daily"},
}

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
    input_df = _model_input_frame(input_dict)
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


def _model_input_frame(input_dict: dict[str, Any]) -> pd.DataFrame:
    """Build the training-ordered input frame and normalize known UI aliases."""
    model_input = dict(input_dict)
    duration = model_input.get("substance_duration")
    if isinstance(duration, str):
        model_input["substance_duration"] = SUBSTANCE_DURATION_ALIASES.get(
            duration.strip().casefold(), duration
        )
    return pd.DataFrame([model_input], columns=RAW_FEATURES)


def _readable_user_value(feature: str, value: Any) -> str:
    """Return a concise display value while preserving the original answer."""
    if feature == "substance_duration" and isinstance(value, str):
        normalized = value.strip().casefold()
        if normalized in {"never", "i don't use any"}:
            return "Never"
        if normalized in {"1-3 years", "1–3 years", "1�3 years"}:
            return "1-3 years"

    labels = USER_VALUE_LABELS.get(feature)
    if labels is not None:
        try:
            return labels.get(int(value), str(value))
        except (TypeError, ValueError):
            return str(value)

    if feature == "dental_visits":
        return {
            "never": "Never",
            "problem_only": "Only when there is a problem",
            "yearly": "Once a year",
            "sixmonthly": "Every 6 months",
        }.get(str(value), str(value))
    if feature == "oral_hygiene_score":
        return f"{value} / 5"
    if feature == "stress_level":
        return f"{value} / 10"
    if feature == "sleep_hours":
        return f"{value} hours"
    if feature in {"processed_food", "sugary_drinks", "fruit_veg_intake"}:
        return str(value).capitalize()
    return str(value)


def _is_absence_answer(feature: str, value: Any) -> bool:
    """Identify absence answers that must not be presented as increasing risk."""
    if feature not in ABSENCE_FEATURES:
        return False
    try:
        if float(value) == 0:
            return True
    except (TypeError, ValueError):
        pass
    return isinstance(value, str) and value.strip().casefold() in {
        "never",
        "no",
        "none",
        "not exposed",
        "i don't use any",
    }


def _class_shap_values(shap_values: Any, class_index: int) -> np.ndarray:
    """Select SHAP values for a requested class from common return shapes.

    Args:
        shap_values: Values returned by shap.TreeExplainer.shap_values.
        class_index: Index of the requested class in the model's class order.

    Returns:
        One-dimensional SHAP value array for the selected class and sample.
    """
    if isinstance(shap_values, list):
        return np.asarray(shap_values[class_index][0])

    values = np.asarray(shap_values)
    if values.ndim == 3:
        if class_index >= values.shape[2]:
            raise ValueError(f"SHAP output has no class index {class_index}.")
        return values[0, :, class_index]
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
    input_df = _model_input_frame(input_dict)
    transformed_input = preprocessor.transform(input_df)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(transformed_input)
    classes = [int(class_label) for class_label in model.classes_]
    high_class_label = next(
        class_label
        for class_label, risk_label in RISK_LABELS.items()
        if risk_label == "High"
    )
    try:
        high_class_index = classes.index(high_class_label)
    except ValueError as exc:
        raise ValueError(
            f"Model classes {classes} do not include the High-risk class "
            f"{high_class_label}."
        ) from exc

    class_values = _class_shap_values(shap_values, high_class_index)
    feature_names = preprocessor.get_feature_names_out()
    if len(feature_names) != len(class_values):
        raise ValueError(
            "Transformed feature count does not match the SHAP explanation: "
            f"{len(feature_names)} != {len(class_values)}."
        )

    feature_impacts: dict[str, float] = {}
    for transformed_name, shap_value in zip(feature_names, class_values):
        feature = _base_feature_name(str(transformed_name))
        feature_impacts[feature] = feature_impacts.get(feature, 0.0) + float(shap_value)

    rows: list[tuple[float, dict[str, Any]]] = []
    for feature, shap_value in feature_impacts.items():
        if abs(shap_value) < MIN_ABSOLUTE_SHAP_VALUE:
            continue
        direction = "increases risk" if shap_value > 0 else "decreases risk"
        user_value = input_dict.get(feature)
        if direction == "increases risk" and _is_absence_answer(feature, user_value):
            logger.warning(
                "Suppressing contradictory positive SHAP factor %s=%r "
                "(SHAP %.6f); full feature vector=%r",
                feature,
                user_value,
                shap_value,
                input_dict,
            )
            continue
        rows.append(
            (
                abs(shap_value),
                {
                    "feature": feature,
                    "display_name": FRIENDLY_NAMES.get(
                        feature, feature.replace("_", " ").title()
                    ),
                    "impact": round(abs(shap_value), 2),
                    "direction": direction,
                    "user_value": _readable_user_value(feature, user_value),
                },
            )
        )

    return [
        row
        for _, row in sorted(rows, key=lambda item: item[0], reverse=True)[:5]
    ]


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
        if factor.get("direction") != "increases risk":
            continue
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
