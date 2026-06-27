from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler


NUMERIC_FEATURES = [
    "brushing_freq",
    "oral_hygiene_score",
    "stress_level",
    "sleep_hours",
    "mouth_ulcers",
    "white_patches",
    "mouth_pain",
    "difficulty_swallowing",
    "swelling_lumps",
    "voice_change",
    "smoking",
    "vaping",
    "alcohol",
    "gutka_paan",
    "passive_smoking",
    "flossing",
    "mouthwash",
    "family_history",
    "hpv_known",
    "diabetes",
]

CATEGORICAL_FEATURES = [
    "age_group",
    "gender",
    "occupation",
    "location",
    "dental_visits",
    "substance_duration",
    "processed_food",
    "sugary_drinks",
    "fruit_veg_intake",
]


def load_data(filepath: str) -> pd.DataFrame:
    """Load the OralGuard dataset from a CSV file.

    Args:
        filepath: Path to the CSV dataset.

    Returns:
        A pandas DataFrame containing the loaded dataset.
    """
    df = pd.read_csv(filepath)
    print(f"Loaded data from {filepath} with shape: {df.shape}")
    return df


def build_preprocessor() -> ColumnTransformer:
    """Build the preprocessing transformer for OralGuard model features.

    Numeric features are standardized with StandardScaler. Categorical features
    are one-hot encoded with unknown categories ignored. The risk_score column is
    intentionally excluded before this transformer is fit.

    Returns:
        A scikit-learn ColumnTransformer ready to fit on feature data.
    """
    return ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


def preprocess_data(filepath: str) -> tuple[Any, Any, Any, Any, ColumnTransformer]:
    """Load, transform, balance, and split the OralGuard dataset.

    Args:
        filepath: Path to the processed OralGuard CSV dataset.

    Returns:
        A tuple containing X_train, X_test, y_train, y_test, and the fitted
        ColumnTransformer preprocessor.
    """
    df = load_data(filepath)

    X = df.drop(columns=["risk_label", "risk_score"])
    y = df["risk_label"]

    preprocessor = build_preprocessor()
    X_processed = preprocessor.fit_transform(X)

    print("Class distribution before SMOTE:")
    print(y.value_counts().sort_index().to_dict())

    smote = SMOTE(random_state=42)
    X_resampled, y_resampled = smote.fit_resample(X_processed, y)

    print("Class distribution after SMOTE:")
    print(pd.Series(y_resampled).value_counts().sort_index().to_dict())

    X_train, X_test, y_train, y_test = train_test_split(
        X_resampled,
        y_resampled,
        test_size=0.2,
        stratify=y_resampled,
        random_state=42,
    )

    return X_train, X_test, y_train, y_test, preprocessor


def save_preprocessor(preprocessor: ColumnTransformer, path: str) -> None:
    """Save a fitted preprocessing transformer to disk.

    Args:
        preprocessor: Fitted ColumnTransformer to persist.
        path: Destination path for the serialized preprocessor.
    """
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(preprocessor, output_path)


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    """Return transformed feature names from a fitted preprocessor.

    Args:
        preprocessor: Fitted ColumnTransformer.

    Returns:
        A list of transformed feature names.
    """
    return preprocessor.get_feature_names_out().tolist()


if __name__ == "__main__":
    X_train, X_test, y_train, y_test, preprocessor = preprocess_data(
        "data/processed/oralguard_dataset.csv"
    )
    print("X_train shape:", X_train.shape)
    print("X_test shape:", X_test.shape)
    print("y_train distribution:", pd.Series(y_train).value_counts().to_dict())
    save_preprocessor(preprocessor, "models/preprocessor.pkl")
    print("Preprocessor saved to models/preprocessor.pkl")
