from __future__ import annotations

import argparse
import math
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
from PIL import Image, ImageFile, UnidentifiedImageError
from tensorflow import keras
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover - optional plotting dependency
    plt = None

DATASET_DIR = Path(__file__).resolve().parent / "dataset"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "waste_mobilenetv2.keras"
FROZEN_MODEL_PATH = ARTIFACTS_DIR / "waste_mobilenetv2_frozen.keras"
FINE_TUNE_MODEL_PATH = ARTIFACTS_DIR / "waste_mobilenetv2_finetune.keras"
METADATA_PATH = ARTIFACTS_DIR / "waste_classifier_metadata.json"
HISTORY_PATH = ARTIFACTS_DIR / "training_history.json"
METRICS_PATH = ARTIFACTS_DIR / "evaluation_metrics.json"
CONFUSION_MATRIX_PATH = ARTIFACTS_DIR / "confusion_matrix.json"
MISCLASSIFIED_PATH = ARTIFACTS_DIR / "misclassified_samples.json"
PLOT_PATH = ARTIFACTS_DIR / "training_curves.png"

ImageFile.LOAD_TRUNCATED_IMAGES = True

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
    ".tif",
    ".tiff",
}


class ImageDataSequence(keras.utils.Sequence):
    def __init__(
        self,
        records: list[dict[str, Any]],
        datagen: ImageDataGenerator,
        image_size: int,
        batch_size: int,
        num_classes: int,
        class_indices: dict[str, int],
        shuffle: bool,
    ) -> None:
        super().__init__()
        self.records = records
        self.datagen = datagen
        self.image_size = image_size
        self.batch_size = batch_size
        self.num_classes = num_classes
        self.class_indices = class_indices
        self.shuffle = shuffle
        self.filepaths = [record["filepath"] for record in records]
        self.filenames = [record["relative_path"] for record in records]
        self.classes = np.asarray([int(record["label"]) for record in records], dtype=np.int32)
        self.samples = len(records)
        self.indices = np.arange(self.samples)
        self.on_epoch_end()

    def __len__(self) -> int:
        return math.ceil(self.samples / self.batch_size)

    def __getitem__(self, index: int):
        batch_slice = slice(index * self.batch_size, (index + 1) * self.batch_size)
        batch_indices = self.indices[batch_slice]
        batch_images = np.empty((len(batch_indices), self.image_size, self.image_size, 3), dtype=np.float32)
        batch_labels = np.empty((len(batch_indices),), dtype=np.int32)

        for batch_position, record_index in enumerate(batch_indices):
            batch_images[batch_position] = self._load_image(self.filepaths[record_index])
            batch_labels[batch_position] = self.classes[record_index]

        categorical_labels = keras.utils.to_categorical(batch_labels, num_classes=self.num_classes)
        return batch_images, categorical_labels

    def _load_image(self, filepath: str) -> np.ndarray:
        image = keras.utils.load_img(filepath, target_size=(self.image_size, self.image_size))
        array = keras.utils.img_to_array(image)

        if self.shuffle:
            transform = self.datagen.get_random_transform(array.shape)
            array = self.datagen.apply_transform(array, transform)

        return self.datagen.standardize(array)

    def on_epoch_end(self) -> None:
        self.indices = np.arange(self.samples)
        if self.shuffle:
            np.random.shuffle(self.indices)

    def reset(self) -> None:
        self.indices = np.arange(self.samples)


def collect_dataset_records() -> tuple[list[dict[str, Any]], list[str], dict[str, int], list[str]]:
    class_names = sorted(directory.name for directory in DATASET_DIR.iterdir() if directory.is_dir())
    class_indices = {class_name: index for index, class_name in enumerate(class_names)}
    records: list[dict[str, Any]] = []
    invalid_files: list[str] = []
    dataset_distribution = {class_name: 0 for class_name in class_names}

    for class_name in class_names:
        class_dir = DATASET_DIR / class_name
        for path in sorted(class_dir.iterdir()):
            if not path.is_file():
                continue

            if path.suffix.lower() not in SUPPORTED_EXTENSIONS and path.suffix:
                continue

            try:
                with Image.open(path) as image:
                    image.convert("RGB").resize((8, 8))
            except (UnidentifiedImageError, OSError, ValueError):
                invalid_files.append(str(path))
                continue

            records.append(
                {
                    "filepath": str(path),
                    "relative_path": str(path.relative_to(DATASET_DIR)),
                    "class_name": class_name,
                    "label": class_indices[class_name],
                }
            )
            dataset_distribution[class_name] += 1

    return records, class_names, dataset_distribution, invalid_files


def split_records(
    records: list[dict[str, Any]],
    class_names: list[str],
    validation_split: float,
    seed: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rng = np.random.default_rng(seed)
    training_records: list[dict[str, Any]] = []
    validation_records: list[dict[str, Any]] = []

    for class_name in class_names:
        class_records = [record for record in records if record["class_name"] == class_name]
        rng.shuffle(class_records)

        validation_count = int(round(len(class_records) * validation_split))
        if len(class_records) > 1:
            validation_count = min(max(validation_count, 1), len(class_records) - 1)
        else:
            validation_count = 0

        validation_records.extend(class_records[:validation_count])
        training_records.extend(class_records[validation_count:])

    return training_records, validation_records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a MobileNetV2 waste classifier.")
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--fine-tune-epochs", type=int, default=4)
    parser.add_argument("--fine-tune-at", type=int, default=110)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--fine-tune-learning-rate", type=float, default=1e-5)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dropout", type=float, default=0.35)
    parser.add_argument("--label-smoothing", type=float, default=0.1)
    return parser.parse_args()


def set_seed(seed: int) -> None:
    np.random.seed(seed)
    tf.keras.utils.set_random_seed(seed)


def build_generators(image_size: int, batch_size: int, validation_split: float, seed: int):
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=18,
        width_shift_range=0.12,
        height_shift_range=0.12,
        zoom_range=0.15,
        horizontal_flip=True,
        fill_mode="nearest",
    )
    validation_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
    )
    records, class_names, dataset_distribution, invalid_files = collect_dataset_records()
    train_records, validation_records = split_records(records, class_names, validation_split, seed)
    class_indices = {class_name: index for index, class_name in enumerate(class_names)}

    train_generator = ImageDataSequence(
        records=train_records,
        datagen=train_datagen,
        image_size=image_size,
        batch_size=batch_size,
        num_classes=len(class_names),
        class_indices=class_indices,
        shuffle=True,
    )
    validation_generator = ImageDataSequence(
        records=validation_records,
        datagen=validation_datagen,
        image_size=image_size,
        batch_size=batch_size,
        num_classes=len(class_names),
        class_indices=class_indices,
        shuffle=False,
    )

    return train_generator, validation_generator, class_names, dataset_distribution, invalid_files


def build_class_weights(generator) -> dict[int, float]:
    counts = Counter(generator.classes.tolist())
    total = sum(counts.values())
    num_classes = len(counts)
    return {
        class_index: total / (num_classes * class_count)
        for class_index, class_count in sorted(counts.items())
        if class_count
    }


def build_model(image_size: int, num_classes: int, dropout: float) -> tuple[keras.Model, keras.Model]:
    base_model = MobileNetV2(
        input_shape=(image_size, image_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = keras.Input(shape=(image_size, image_size, 3))
    x = base_model(inputs, training=False)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(dropout)(x)
    outputs = keras.layers.Dense(num_classes, activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    return model, base_model


def compile_model(model: keras.Model, learning_rate: float, label_smoothing: float) -> None:
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing),
        metrics=["accuracy"],
    )


def configure_fine_tuning(base_model: keras.Model, fine_tune_at: int) -> int:
    base_model.trainable = True

    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    unfrozen_layers = 0
    for layer in base_model.layers[fine_tune_at:]:
        if isinstance(layer, keras.layers.BatchNormalization):
            layer.trainable = False
            continue
        layer.trainable = True
        unfrozen_layers += 1

    return unfrozen_layers


def build_callbacks(
    checkpoint_path: Path,
    monitor: str = "val_accuracy",
    patience: int = 3,
) -> list[keras.callbacks.Callback]:
    return [
        keras.callbacks.ModelCheckpoint(
            checkpoint_path,
            monitor=monitor,
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor=monitor,
            patience=patience,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,
            patience=max(2, patience - 1),
            min_lr=1e-6,
            verbose=1,
        ),
    ]


def merge_histories(*histories: keras.callbacks.History) -> dict[str, list[float]]:
    merged: dict[str, list[float]] = {}
    for history in histories:
        if history is None:
            continue
        for key, values in history.history.items():
            merged.setdefault(key, [])
            merged[key].extend(float(value) for value in values)
    return merged


def compute_confusion_matrix(
    true_labels: np.ndarray,
    predicted_labels: np.ndarray,
    num_classes: int,
) -> np.ndarray:
    return tf.math.confusion_matrix(
        true_labels,
        predicted_labels,
        num_classes=num_classes,
    ).numpy()


def compute_per_class_metrics(confusion_matrix: np.ndarray, class_names: list[str]) -> tuple[dict[str, Any], dict[str, float]]:
    per_class: dict[str, Any] = {}
    diagonal = np.diag(confusion_matrix)
    row_totals = confusion_matrix.sum(axis=1)
    column_totals = confusion_matrix.sum(axis=0)

    precisions: list[float] = []
    recalls: list[float] = []
    f1_scores: list[float] = []

    for index, class_name in enumerate(class_names):
        true_positive = float(diagonal[index])
        predicted_total = float(column_totals[index])
        actual_total = float(row_totals[index])

        precision = true_positive / predicted_total if predicted_total else 0.0
        recall = true_positive / actual_total if actual_total else 0.0
        f1_score = 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)

        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1_score)

        per_class[class_name] = {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "support": int(actual_total),
        }

    overall_accuracy = float(diagonal.sum() / confusion_matrix.sum()) if confusion_matrix.sum() else 0.0
    macro_metrics = {
        "accuracy": overall_accuracy,
        "macro_precision": float(np.mean(precisions)) if precisions else 0.0,
        "macro_recall": float(np.mean(recalls)) if recalls else 0.0,
        "macro_f1_score": float(np.mean(f1_scores)) if f1_scores else 0.0,
    }
    return per_class, macro_metrics


def build_misclassified_samples(
    filenames: list[str],
    true_labels: np.ndarray,
    predicted_labels: np.ndarray,
    confidences: np.ndarray,
    class_names: list[str],
    limit: int = 100,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for index, (truth, prediction) in enumerate(zip(true_labels, predicted_labels)):
        if int(truth) == int(prediction):
            continue

        items.append(
            {
                "filename": filenames[index],
                "true_label": class_names[int(truth)],
                "predicted_label": class_names[int(prediction)],
                "confidence": float(confidences[index]),
            }
        )

    items.sort(key=lambda item: item["confidence"], reverse=True)
    return items[:limit]


def save_plots(history: dict[str, list[float]]) -> None:
    if not plt:
        return

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    figure, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(history.get("accuracy", []), label="train")
    axes[0].plot(history.get("val_accuracy", []), label="val")
    axes[0].set_title("Accuracy")
    axes[0].legend()

    axes[1].plot(history.get("loss", []), label="train")
    axes[1].plot(history.get("val_loss", []), label="val")
    axes[1].set_title("Loss")
    axes[1].legend()

    figure.tight_layout()
    figure.savefig(PLOT_PATH, dpi=180)
    plt.close(figure)


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    train_generator, validation_generator, class_names, dataset_distribution, invalid_files = build_generators(
        image_size=args.image_size,
        batch_size=args.batch_size,
        validation_split=args.validation_split,
        seed=args.seed,
    )
    class_weights = build_class_weights(train_generator)
    model, base_model = build_model(
        image_size=args.image_size,
        num_classes=train_generator.num_classes,
        dropout=args.dropout,
    )
    compile_model(
        model,
        learning_rate=args.learning_rate,
        label_smoothing=args.label_smoothing,
    )

    frozen_history = model.fit(
        train_generator,
        validation_data=validation_generator,
        epochs=args.epochs,
        class_weight=class_weights,
        callbacks=build_callbacks(checkpoint_path=FROZEN_MODEL_PATH, patience=3),
        verbose=1,
    )

    fine_tune_history: keras.callbacks.History | None = None
    unfrozen_layers = 0
    if args.fine_tune_epochs > 0:
        unfrozen_layers = configure_fine_tuning(base_model, args.fine_tune_at)
        compile_model(
            model,
            learning_rate=args.fine_tune_learning_rate,
            label_smoothing=max(0.0, args.label_smoothing / 2),
        )
        fine_tune_history = model.fit(
            train_generator,
            validation_data=validation_generator,
            epochs=args.fine_tune_epochs,
            class_weight=class_weights,
            callbacks=build_callbacks(checkpoint_path=FINE_TUNE_MODEL_PATH, patience=2),
            verbose=1,
        )

    frozen_best_accuracy = max(frozen_history.history.get("val_accuracy", [0.0]))
    fine_tune_best_accuracy = max(fine_tune_history.history.get("val_accuracy", [0.0])) if fine_tune_history else -1.0

    best_phase_path = FROZEN_MODEL_PATH
    if fine_tune_history is not None and FINE_TUNE_MODEL_PATH.exists() and fine_tune_best_accuracy >= frozen_best_accuracy:
        best_phase_path = FINE_TUNE_MODEL_PATH

    best_model = keras.models.load_model(best_phase_path) if best_phase_path.exists() else model
    best_model.save(MODEL_PATH)

    validation_generator.reset()
    evaluation = best_model.evaluate(validation_generator, verbose=0, return_dict=True)
    validation_generator.reset()
    probabilities = best_model.predict(validation_generator, verbose=0)
    predicted_labels = np.argmax(probabilities, axis=1)
    true_labels = validation_generator.classes
    confidences = probabilities[np.arange(len(predicted_labels)), predicted_labels]
    confusion_matrix = compute_confusion_matrix(
        true_labels=true_labels,
        predicted_labels=predicted_labels,
        num_classes=len(class_names),
    )
    per_class_metrics, macro_metrics = compute_per_class_metrics(confusion_matrix, class_names)
    misclassified_samples = build_misclassified_samples(
        filenames=list(validation_generator.filenames),
        true_labels=true_labels,
        predicted_labels=predicted_labels,
        confidences=confidences,
        class_names=class_names,
    )

    history_payload = merge_histories(frozen_history, fine_tune_history)

    metadata = {
        "model_name": "MobileNetV2",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "image_size": args.image_size,
        "batch_size": args.batch_size,
        "epochs_requested": args.epochs,
        "fine_tune_epochs_requested": args.fine_tune_epochs,
        "epochs_ran": len(history_payload.get("loss", [])),
        "class_names": class_names,
        "class_indices": train_generator.class_indices,
        "dataset_distribution": dataset_distribution,
        "training_samples": int(train_generator.samples),
        "validation_samples": int(validation_generator.samples),
        "training_class_distribution": {
            class_names[index]: int(count)
            for index, count in sorted(Counter(train_generator.classes.tolist()).items())
        },
        "validation_class_distribution": {
            class_names[index]: int(count)
            for index, count in sorted(Counter(validation_generator.classes.tolist()).items())
        },
        "class_weights": {class_names[index]: float(weight) for index, weight in class_weights.items()},
        "best_val_accuracy": float(max(history_payload.get("val_accuracy", [0.0]))),
        "final_val_accuracy": float(evaluation["accuracy"]),
        "final_val_loss": float(evaluation["loss"]),
        "fine_tune_enabled": bool(args.fine_tune_epochs > 0),
        "fine_tune_at": args.fine_tune_at,
        "unfrozen_layers": unfrozen_layers,
        "label_smoothing": args.label_smoothing,
        "macro_metrics": macro_metrics,
        "top_misclassified_count": len(misclassified_samples),
        "invalid_files_skipped": invalid_files,
    }

    metrics_payload = {
        "overall": {
            "loss": float(evaluation["loss"]),
            "accuracy": float(evaluation["accuracy"]),
        },
        "macro": macro_metrics,
        "per_class": per_class_metrics,
    }

    HISTORY_PATH.write_text(json.dumps(history_payload, indent=2), encoding="utf-8")
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")
    CONFUSION_MATRIX_PATH.write_text(
        json.dumps(
            {
                "class_names": class_names,
                "matrix": confusion_matrix.astype(int).tolist(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    MISCLASSIFIED_PATH.write_text(json.dumps(misclassified_samples, indent=2), encoding="utf-8")
    save_plots(history_payload)

    print("Training complete.")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved metadata to: {METADATA_PATH}")
    print(f"Validation accuracy: {evaluation['accuracy']:.4f}")
    print(f"Macro F1 score: {macro_metrics['macro_f1_score']:.4f}")


if __name__ == "__main__":
    main()
