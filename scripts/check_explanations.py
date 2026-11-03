from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.predict import RAW_FEATURES, full_prediction, load_artifacts


ZERO_MEANS_ABSENT = {
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
}
ABSENT_TEXT_VALUES = {"never", "no", "none", "not exposed", "i don't use any"}


def make_profile(**overrides: Any) -> dict[str, Any]:
    profile = {
        "age_group": "21-23",
        "gender": "Female",
        "occupation": "Undergraduate Student",
        "location": "Delhi",
        "smoking": 0,
        "vaping": 0,
        "alcohol": 0,
        "gutka_paan": 0,
        "substance_duration": "Never",
        "brushing_freq": 2,
        "dental_visits": "sixmonthly",
        "oral_hygiene_score": 5,
        "mouth_ulcers": 0,
        "white_patches": 0,
        "mouth_pain": 0,
        "difficulty_swallowing": 0,
        "swelling_lumps": 0,
        "voice_change": 0,
        "stress_level": 2,
        "sleep_hours": 8.0,
        "family_history": 0,
        "hpv_known": 0,
        "diabetes": 0,
        "passive_smoking": 0,
        "flossing": 1,
        "mouthwash": 1,
        "processed_food": "low",
        "sugary_drinks": "low",
        "fruit_veg_intake": "high",
    }
    profile.update(overrides)
    if set(profile) != set(RAW_FEATURES):
        raise AssertionError("The test profile does not match the model's raw features.")
    return profile


def is_absence_answer(feature: str, value: Any) -> bool:
    if feature in ZERO_MEANS_ABSENT:
        try:
            if float(value) == 0:
                return True
        except (TypeError, ValueError):
            pass
    return isinstance(value, str) and value.strip().casefold() in ABSENT_TEXT_VALUES


def main() -> None:
    model, preprocessor = load_artifacts()
    assert list(preprocessor.feature_names_in_) == RAW_FEATURES, (
        "Inference raw feature order differs from the saved preprocessor."
    )
    assert model.n_features_in_ == len(preprocessor.get_feature_names_out()), (
        "Saved model feature count differs from the preprocessor output."
    )

    profiles = [
        (
            "all-healthy",
            make_profile(),
        ),
        (
            "heavy-smoker-gutka-symptoms",
            make_profile(
                smoking=2,
                vaping=2,
                alcohol=2,
                gutka_paan=1,
                passive_smoking=1,
                brushing_freq=0,
                dental_visits="never",
                oral_hygiene_score=1,
                mouth_ulcers=2,
                white_patches=2,
                mouth_pain=2,
                difficulty_swallowing=2,
                swelling_lumps=2,
                voice_change=2,
                stress_level=9,
                sleep_hours=4.5,
                family_history=1,
                flossing=0,
                mouthwash=0,
                processed_food="high",
                sugary_drinks="high",
                fruit_veg_intake="low",
            ),
        ),
        (
            "mixed",
            make_profile(
                age_group="24-27",
                smoking=1,
                alcohol=1,
                brushing_freq=1,
                dental_visits="yearly",
                oral_hygiene_score=3,
                mouth_ulcers=1,
                white_patches=0,
                mouth_pain=1,
                difficulty_swallowing=0,
                swelling_lumps=0,
                voice_change=0,
                stress_level=6,
                sleep_hours=6.0,
                passive_smoking=1,
                flossing=0,
                processed_food="medium",
                sugary_drinks="high",
                fruit_veg_intake="medium",
            ),
        ),
        (
            "reported-never-smoking-zero-symptoms",
            make_profile(
                age_group="18-20",
                smoking=0,
                vaping=0,
                alcohol=0,
                gutka_paan=0,
                substance_duration="Never",
                brushing_freq=2,
                dental_visits="yearly",
                oral_hygiene_score=3,
                mouth_ulcers=0,
                white_patches=0,
                mouth_pain=0,
                difficulty_swallowing=0,
                swelling_lumps=0,
                voice_change=0,
                stress_level=5,
                sleep_hours=7.0,
                family_history=0,
                hpv_known=0,
                diabetes=0,
                passive_smoking=0,
                flossing=0,
                mouthwash=0,
                processed_food="medium",
                sugary_drinks="medium",
                fruit_veg_intake="medium",
            ),
        ),
    ]

    for name, profile in profiles:
        result = full_prediction(profile, model=model, preprocessor=preprocessor)
        assert set(result) == {
            "risk",
            "probability",
            "top_factors",
            "recommendations",
            "disclaimer",
        }, f"{name}: prediction response fields changed."
        print(f"\n{name}: risk={result['risk']}, probability={result['probability']:.2f}")
        for factor in result["top_factors"]:
            assert {"feature", "display_name", "impact", "direction"}.issubset(factor)
            assert "user_value" in factor, f"{name}: factor is missing its input value."
            print(
                f"  {factor['display_name']}: {factor['impact']:.2f} "
                f"({factor['direction']}; input={factor['user_value']})"
            )
            if factor["direction"] == "increases risk":
                assert not is_absence_answer(
                    factor["feature"], profile[factor["feature"]]
                ), (
                    f"{name}: {factor['feature']}={profile[factor['feature']]!r} "
                    "was incorrectly labeled as increasing risk."
                )


if __name__ == "__main__":
    main()
