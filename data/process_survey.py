from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_STATE = 42
RAW_PATH = Path("data/raw/survey_raw.csv")
PROCESSED_DIR = Path("data/processed")
REAL_CLEAN_PATH = PROCESSED_DIR / "real_survey_clean.csv"
FINAL_PATH = PROCESSED_DIR / "oralguard_dataset.csv"
TARGET_ROWS = 1500

CLEAN_COLUMNS = [
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
]

FINAL_COLUMNS = [
    *CLEAN_COLUMNS,
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
    "risk_score",
    "risk_label",
]


def load_and_rename() -> pd.DataFrame:
    df = pd.read_csv(RAW_PATH)
    df = df.drop(columns=[col for col in df.columns if col.strip().lower() == "timestamp"])

    if len(df.columns) != len(CLEAN_COLUMNS):
        raise ValueError(
            f"Expected {len(CLEAN_COLUMNS)} survey columns after dropping Timestamp, "
            f"found {len(df.columns)}."
        )

    df.columns = CLEAN_COLUMNS
    return df


def map_with_warning(series: pd.Series, mapping: dict[str, object], column: str) -> pd.Series:
    cleaned = series.astype(str).str.strip()
    mapped = cleaned.map(mapping)
    missing_values = sorted(cleaned[mapped.isna()].dropna().unique())
    if missing_values:
        raise ValueError(f"Unmapped values in {column}: {missing_values}")
    return mapped


def standardize_real_rows(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["age_group"] = (
        df["age_group"].astype(str).str.strip().str.replace("–", "-", regex=False)
    )
    df["location"] = df["location"].astype(str).str.strip()
    normalized_location = df["location"].str.lower()
    df.loc[normalized_location.eq("new delhi"), "location"] = "Delhi"
    df.loc[
        normalized_location.str.contains("texas|bryan|college station", regex=True, na=False),
        "location",
    ] = "Other"
    df["gender"] = df["gender"].astype(str).str.strip()
    df.loc[~df["gender"].isin(["Male", "Female"]), "gender"] = "Other"
    df["occupation"] = df["occupation"].astype(str).str.strip()
    df["substance_duration"] = df["substance_duration"].astype(str).str.strip()

    df["smoking"] = map_with_warning(
        df["smoking"],
        {
            "Never": 0,
            "Occasionally (1–2 times a week)": 1,
            "Occasionally (1-2 times a week)": 1,
            "I used to but have quit": 1,
            "Regularly ( almost daily)": 2,
        },
        "smoking",
    ).astype(int)
    df["vaping"] = map_with_warning(
        df["vaping"],
        {
            "Never": 0,
            "I used to but have quit": 1,
            "Occasionally": 1,
        },
        "vaping",
    ).astype(int)
    df["alcohol"] = map_with_warning(
        df["alcohol"],
        {
            "Never": 0,
            "I used to but have quit": 1,
            "Occasionally (social drinking)": 1,
        },
        "alcohol",
    ).astype(int)
    df["gutka_paan"] = (
        df["gutka_paan"].astype(str).str.strip().ne("None of the above").astype(int)
    )
    df["brushing_freq"] = map_with_warning(
        df["brushing_freq"],
        {
            "Twice a day": 2,
            "Once a day": 1,
            "Every 2–3 days": 0,
            "Every 2-3 days": 0,
        },
        "brushing_freq",
    ).astype(int)
    df["dental_visits"] = map_with_warning(
        df["dental_visits"],
        {
            "Every 6 months (regular checkup)": "sixmonthly",
            "Once a year": "yearly",
            "Only when there is a problem": "problem_only",
            "Never": "never",
        },
        "dental_visits",
    ).astype(str)

    symptom_map = {"No": 0, "Maybe": 1, "Yes": 2}
    symptom_columns = [
        "mouth_ulcers",
        "white_patches",
        "mouth_pain",
        "difficulty_swallowing",
        "swelling_lumps",
        "voice_change",
    ]
    for column in symptom_columns:
        df[column] = map_with_warning(df[column], symptom_map, column).astype(int)

    df["oral_hygiene_score"] = (
        pd.to_numeric(df["oral_hygiene_score"], errors="raise").round().clip(1, 5).astype(int)
    )
    return df


def add_realistic_columns(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    df = df.copy()
    symptom_or_substance = (
        (df["mouth_ulcers"] >= 1)
        | (df["white_patches"] >= 1)
        | (df["smoking"] > 0)
        | (df["vaping"] > 0)
        | (df["alcohol"] > 0)
        | (df["gutka_paan"] > 0)
    )

    df["stress_level"] = np.where(
        symptom_or_substance,
        rng.integers(6, 10, size=len(df)),
        rng.integers(3, 8, size=len(df)),
    ).astype(int)
    df["sleep_hours"] = np.where(
        df["oral_hygiene_score"] <= 2,
        rng.uniform(4, 6, size=len(df)),
        rng.uniform(6, 9, size=len(df)),
    )
    df["sleep_hours"] = df["sleep_hours"].round(1)

    df["family_history"] = rng.binomial(1, 0.08, size=len(df)).astype(int)
    df["hpv_known"] = rng.binomial(1, 0.03, size=len(df)).astype(int)
    df["diabetes"] = rng.binomial(1, 0.04, size=len(df)).astype(int)
    df["passive_smoking"] = [
        int(rng.random() < (0.40 if location == "Delhi" else 0.20))
        for location in df["location"]
    ]
    df["flossing"] = [
        int(rng.random() < (0.40 if brushing == 2 else 0.10))
        for brushing in df["brushing_freq"]
    ]
    df["mouthwash"] = [
        int(rng.random() < (0.35 if score >= 4 else 0.10))
        for score in df["oral_hygiene_score"]
    ]
    df["processed_food"] = rng.choice(["low", "medium", "high"], len(df), p=[0.20, 0.50, 0.30])
    df["sugary_drinks"] = rng.choice(["low", "medium", "high"], len(df), p=[0.25, 0.45, 0.30])
    df["fruit_veg_intake"] = rng.choice(["low", "medium", "high"], len(df), p=[0.30, 0.45, 0.25])
    return df


def add_risk_labels(df: pd.DataFrame) -> pd.DataFrame:
    df = coerce_generated_values(df.copy())
    score = (
        df["smoking"] * 3
        + df["vaping"] * 2
        + df["alcohol"] * 1
        + df["gutka_paan"] * 4
        + df["passive_smoking"] * 1
        + (2 - df["brushing_freq"]) * 1
        + (df["dental_visits"].eq("never").astype(int)) * 2
        + (5 - df["oral_hygiene_score"]) * 1
        + df["mouth_ulcers"] * 3
        + df["white_patches"] * 4
        + df["mouth_pain"] * 2
        + df["difficulty_swallowing"] * 3
        + df["swelling_lumps"] * 3
        + df["voice_change"] * 2
        + df["family_history"] * 3
        + df["diabetes"] * 2
    )
    df["risk_score"] = score.astype(int)
    df["risk_label"] = pd.cut(
        df["risk_score"],
        bins=[-1, 5, 12, np.inf],
        labels=[0, 1, 2],
    ).astype(int)
    return df


def coerce_generated_values(df: pd.DataFrame) -> pd.DataFrame:
    integer_ranges = {
        "smoking": (0, 2),
        "vaping": (0, 1),
        "alcohol": (0, 1),
        "gutka_paan": (0, 1),
        "brushing_freq": (0, 2),
        "oral_hygiene_score": (1, 5),
        "mouth_ulcers": (0, 2),
        "white_patches": (0, 2),
        "mouth_pain": (0, 2),
        "difficulty_swallowing": (0, 2),
        "swelling_lumps": (0, 2),
        "voice_change": (0, 2),
        "stress_level": (1, 10),
        "family_history": (0, 1),
        "hpv_known": (0, 1),
        "diabetes": (0, 1),
        "passive_smoking": (0, 1),
        "flossing": (0, 1),
        "mouthwash": (0, 1),
    }
    for column, (lower, upper) in integer_ranges.items():
        df[column] = (
            pd.to_numeric(df[column], errors="coerce")
            .fillna(lower)
            .round()
            .clip(lower, upper)
            .astype(int)
        )

    df["sleep_hours"] = (
        pd.to_numeric(df["sleep_hours"], errors="coerce").fillna(7).clip(4, 9).round(1)
    )

    allowed_values = {
        "age_group": ["18-20", "21-23", "24-27"],
        "gender": ["Male", "Female", "Other"],
        "dental_visits": ["sixmonthly", "yearly", "problem_only", "never"],
        "processed_food": ["low", "medium", "high"],
        "sugary_drinks": ["low", "medium", "high"],
        "fruit_veg_intake": ["low", "medium", "high"],
    }
    for column, allowed in allowed_values.items():
        df[column] = df[column].astype(str)
        df.loc[~df[column].isin(allowed), column] = allowed[0]

    for column in ["occupation", "location", "substance_duration"]:
        df[column] = df[column].astype(str).str.strip()
    return df


def augment_with_sdv(real_df: pd.DataFrame, rows_needed: int) -> pd.DataFrame | None:
    try:
        from sdv.metadata import SingleTableMetadata
        from sdv.single_table import GaussianCopulaSynthesizer
    except Exception:
        return None

    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(real_df)
    synthesizer = GaussianCopulaSynthesizer(metadata)
    synthesizer.fit(real_df)
    synthetic = synthesizer.sample(num_rows=rows_needed)
    return synthetic


def augment_with_numpy(
    real_df: pd.DataFrame, rows_needed: int, rng: np.random.Generator
) -> pd.DataFrame:
    synthetic = pd.DataFrame(index=range(rows_needed))

    for column in real_df.columns:
        if column in {"risk_score", "risk_label"}:
            continue

        values = real_df[column].dropna()
        if pd.api.types.is_numeric_dtype(values):
            sampled = rng.choice(values.to_numpy(), size=rows_needed, replace=True)
            if column == "sleep_hours":
                sampled = np.clip(sampled + rng.normal(0, 0.25, size=rows_needed), 4, 9).round(1)
            elif column == "stress_level":
                sampled = np.clip(sampled + rng.integers(-1, 2, size=rows_needed), 1, 10).round()
            synthetic[column] = sampled
        else:
            distribution = values.value_counts(normalize=True)
            synthetic[column] = rng.choice(
                distribution.index.to_numpy(),
                size=rows_needed,
                replace=True,
                p=distribution.to_numpy(),
            )

    return synthetic


def main() -> None:
    rng = np.random.default_rng(RANDOM_STATE)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    real_df = load_and_rename()
    real_df = standardize_real_rows(real_df)
    real_df = add_realistic_columns(real_df, rng)
    real_df = add_risk_labels(real_df)
    real_df = real_df[FINAL_COLUMNS]
    real_df.to_csv(REAL_CLEAN_PATH, index=False)

    rows_needed = TARGET_ROWS - len(real_df)
    synthetic_df = augment_with_sdv(real_df, rows_needed)
    method = "SDV GaussianCopulaSynthesizer"
    if synthetic_df is None:
        synthetic_df = augment_with_numpy(real_df, rows_needed, rng)
        method = "numpy fallback"

    synthetic_df = synthetic_df.reindex(columns=FINAL_COLUMNS)
    synthetic_df = add_risk_labels(synthetic_df)
    final_df = pd.concat([real_df, synthetic_df], ignore_index=True)
    final_df = final_df[FINAL_COLUMNS].sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    final_df.to_csv(FINAL_PATH, index=False)

    print(f"Augmentation method: {method}")
    print(f"Shape: {final_df.shape}")
    print("Class distribution:")
    print(final_df["risk_label"].value_counts().sort_index().to_string())
    print("First 5 rows:")
    print(final_df.head().to_string(index=False))
    print("Column list:")
    print(list(final_df.columns))
    print(f"Saved final dataset: {FINAL_PATH}")
    print(f"Saved cleaned real survey rows: {REAL_CLEAN_PATH}")


if __name__ == "__main__":
    main()
