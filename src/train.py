from __future__ import annotations

from pathlib import Path
from typing import Any
import warnings

import joblib
import mlflow
import optuna
import pandas as pd
from preprocess import preprocess_data
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.svm import SVC
from xgboost import XGBClassifier


warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
optuna.logging.set_verbosity(optuna.logging.WARNING)

RANDOM_STATE = 42
DATASET_PATH = "data/processed/oralguard_dataset.csv"
MODEL_PATH = "models/xgb_model.pkl"
REPORT_PATH = "models/model_report.txt"


def get_baseline_models() -> dict[str, Any]:
    """Create the baseline classifiers used for model comparison.

    Returns:
        A dictionary mapping display model names to initialized classifiers.
    """
    return {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            random_state=RANDOM_STATE,
        ),
        "SVM": SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE),
        "XGBoost": XGBClassifier(
            use_label_encoder=False,
            eval_metric="mlogloss",
            random_state=RANDOM_STATE,
            n_jobs=1,
        ),
    }


def cross_validate_model(
    model: Any,
    X: Any,
    y: Any,
    cv: StratifiedKFold,
) -> dict[str, float]:
    """Evaluate a model with stratified cross-validation.

    Args:
        model: Classifier implementing fit, predict, and predict_proba.
        X: Feature matrix.
        y: Target labels.
        cv: StratifiedKFold cross-validator.

    Returns:
        Mean weighted classification metrics from cross-validation.
    """
    scoring = {
        "accuracy": "accuracy",
        "precision": "precision_weighted",
        "recall": "recall_weighted",
        "f1": "f1_weighted",
        "roc_auc": "roc_auc_ovr_weighted",
    }
    scores = cross_validate(model, X, y, cv=cv, scoring=scoring, n_jobs=1)
    return {
        "accuracy": float(scores["test_accuracy"].mean()),
        "precision": float(scores["test_precision"].mean()),
        "recall": float(scores["test_recall"].mean()),
        "f1": float(scores["test_f1"].mean()),
        "roc_auc": float(scores["test_roc_auc"].mean()),
    }


def print_metrics(model_name: str, metrics: dict[str, float]) -> None:
    """Print a model's metric dictionary in a readable format.

    Args:
        model_name: Display name for the model.
        metrics: Metric names and values to print.
    """
    print(f"\n{model_name}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"Precision (weighted): {metrics['precision']:.4f}")
    print(f"Recall (weighted): {metrics['recall']:.4f}")
    print(f"F1 Score (weighted): {metrics['f1']:.4f}")
    print(f"ROC-AUC (ovr, weighted): {metrics['roc_auc']:.4f}")


def log_metrics_to_mlflow(model_name: str, metrics: dict[str, float]) -> None:
    """Log model comparison metrics to MLflow.

    Args:
        model_name: Name of the model being logged.
        metrics: Metric names and values to log.
    """
    with mlflow.start_run(run_name=model_name):
        for metric_name, metric_value in metrics.items():
            mlflow.log_metric(metric_name, metric_value)


def compare_baseline_models(X_train: Any, y_train: Any) -> dict[str, dict[str, float]]:
    """Train and compare baseline models with 5-fold stratified CV.

    Args:
        X_train: Training feature matrix.
        y_train: Training target labels.

    Returns:
        Mapping of model names to cross-validation metric dictionaries.
    """
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    results: dict[str, dict[str, float]] = {}

    for model_name, model in get_baseline_models().items():
        metrics = cross_validate_model(model, X_train, y_train, cv)
        results[model_name] = metrics
        print_metrics(model_name, metrics)
        log_metrics_to_mlflow(model_name, metrics)

    return results


def create_xgb_classifier(params: dict[str, Any] | None = None) -> XGBClassifier:
    """Create an XGBoost classifier with project defaults.

    Args:
        params: Optional hyperparameters to override default XGBoost settings.

    Returns:
        Configured XGBClassifier.
    """
    model_params: dict[str, Any] = {
        "use_label_encoder": False,
        "eval_metric": "mlogloss",
        "random_state": RANDOM_STATE,
        "n_jobs": 1,
    }
    if params:
        model_params.update(params)
    return XGBClassifier(**model_params)


def tune_xgboost(X_train: Any, y_train: Any, n_trials: int = 30) -> dict[str, Any]:
    """Tune XGBoost hyperparameters with Optuna.

    Args:
        X_train: Training feature matrix.
        y_train: Training target labels.
        n_trials: Number of Optuna trials to run.

    Returns:
        Best hyperparameters found by Optuna.
    """
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 50, 300),
            "max_depth": trial.suggest_int("max_depth", 3, 8),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 7),
        }
        metrics = cross_validate_model(create_xgb_classifier(params), X_train, y_train, cv)
        return metrics["f1"]

    sampler = optuna.samplers.TPESampler(seed=RANDOM_STATE)
    study = optuna.create_study(direction="maximize", sampler=sampler)
    study.optimize(objective, n_trials=n_trials)

    print("\nBest XGBoost params:")
    print(study.best_params)
    print(f"Best XGBoost CV weighted F1: {study.best_value:.4f}")
    return study.best_params


def evaluate_model(model: Any, X_test: Any, y_test: Any) -> dict[str, float]:
    """Evaluate a fitted classifier on a test set.

    Args:
        model: Fitted classifier.
        X_test: Test feature matrix.
        y_test: Test target labels.

    Returns:
        Weighted classification metrics for the test set.
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, average="weighted")),
        "recall": float(recall_score(y_test, y_pred, average="weighted")),
        "f1": float(f1_score(y_test, y_pred, average="weighted")),
        "roc_auc": float(roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")),
    }


def save_model(model: Any, path: str) -> None:
    """Save a trained model with joblib.

    Args:
        model: Fitted model to save.
        path: Destination path for the serialized model.
    """
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)


def format_comparison_table(results: dict[str, dict[str, float]]) -> str:
    """Create a compact comparison table for selected model metrics.

    Args:
        results: Mapping of model names to metric dictionaries.

    Returns:
        Formatted comparison table as a string.
    """
    lines = [
        "Model                | Accuracy | F1    | ROC-AUC",
    ]
    for model_name, metrics in results.items():
        lines.append(
            f"{model_name:<20} | {metrics['accuracy']:.2f}     | "
            f"{metrics['f1']:.2f}  | {metrics['roc_auc']:.2f}"
        )
    return "\n".join(lines)


def save_report(
    baseline_results: dict[str, dict[str, float]],
    best_params: dict[str, Any],
    tuned_metrics: dict[str, float],
    comparison_table: str,
    path: str,
) -> None:
    """Save model comparison metrics and best XGBoost details to a text report.

    Args:
        baseline_results: Cross-validation metrics for baseline models.
        best_params: Best XGBoost hyperparameters from Optuna.
        tuned_metrics: Test metrics for the tuned XGBoost model.
        comparison_table: Final formatted comparison table.
        path: Destination text report path.
    """
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lines = ["OralGuard Model Training Report", ""]
    lines.append("Baseline 5-Fold Stratified CV Metrics")
    for model_name, metrics in baseline_results.items():
        lines.append(f"\n{model_name}")
        for metric_name, metric_value in metrics.items():
            lines.append(f"{metric_name}: {metric_value:.4f}")

    lines.append("\nTuned XGBoost Best Params")
    for param_name, param_value in best_params.items():
        lines.append(f"{param_name}: {param_value}")

    lines.append("\nTuned XGBoost Test Metrics")
    for metric_name, metric_value in tuned_metrics.items():
        lines.append(f"{metric_name}: {metric_value:.4f}")

    lines.extend(["", "Final Comparison Table", comparison_table])
    output_path.write_text("\n".join(lines), encoding="utf-8")


def train_final_xgboost(
    X_train: Any,
    y_train: Any,
    best_params: dict[str, Any],
) -> XGBClassifier:
    """Train the final XGBoost classifier on the full training set.

    Args:
        X_train: Training feature matrix.
        y_train: Training target labels.
        best_params: Hyperparameters selected by Optuna.

    Returns:
        Fitted XGBClassifier.
    """
    model = create_xgb_classifier(best_params)
    model.fit(X_train, y_train)
    return model


def run_training_pipeline() -> str:
    """Run the full OralGuard training, tuning, evaluation, and logging pipeline.

    Returns:
        Final comparison table as a string.
    """
    mlflow.set_experiment("oralguard_training")

    X_train, X_test, y_train, y_test, _ = preprocess_data(DATASET_PATH)

    print("\nRunning 5-fold stratified cross-validation...")
    baseline_results = compare_baseline_models(X_train, y_train)

    print("\nTuning XGBoost with Optuna...")
    best_params = tune_xgboost(X_train, y_train, n_trials=30)

    final_model = train_final_xgboost(X_train, y_train, best_params)
    tuned_metrics = evaluate_model(final_model, X_test, y_test)
    print_metrics("XGBoost (tuned)", tuned_metrics)

    with mlflow.start_run(run_name="XGBoost tuned"):
        mlflow.log_params(best_params)
        for metric_name, metric_value in tuned_metrics.items():
            mlflow.log_metric(metric_name, metric_value)

    save_model(final_model, MODEL_PATH)
    print(f"\nFinal XGBoost model saved to {MODEL_PATH}")

    comparison_results = {
        "Logistic Regression": baseline_results["Logistic Regression"],
        "Random Forest": baseline_results["Random Forest"],
        "SVM": baseline_results["SVM"],
        "XGBoost (tuned)": tuned_metrics,
    }
    comparison_table = format_comparison_table(comparison_results)
    save_report(baseline_results, best_params, tuned_metrics, comparison_table, REPORT_PATH)
    print(f"Model report saved to {REPORT_PATH}")

    print("\nFinal comparison table:")
    print(comparison_table)
    return comparison_table


if __name__ == "__main__":
    run_training_pipeline()
