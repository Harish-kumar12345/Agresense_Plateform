import os
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, 'datasets', 'crop_recommendation.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, 'crop_recommender.pkl')
META_PATH = os.path.join(MODEL_DIR, 'crop_recommender_meta.json')

print("=" * 60)
print("MODULE 1: TRAINING CROP RECOMMENDATION RANDOM FOREST MODEL")
print("=" * 60)

# 1. Load Dataset
print(f"\n[1/5] Loading dataset from: {DATASET_PATH}")
df = pd.read_csv(DATASET_PATH)

print("\n--- Data Info ---")
df.info()

print("\n--- Missing Values Check ---")
print(df.isnull().sum())

print("\n--- Summary Statistics ---")
print(df.describe().T[['mean', 'std', 'min', 'max']])

crops = sorted(df['label'].unique())
print(f"\nTotal Crops ({len(crops)}): {', '.join(crops)}")

# 2. Features & Target
features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
X = df[features]
y = df['label']

# 3. Stratified Train/Test Split (80/20)
print("\n[2/5] Performing Stratified 80/20 Train-Test Split...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"Training samples: {len(X_train)}, Testing samples: {len(X_test)}")

# 4. Train RandomForest Classifier
print("\n[3/5] Training RandomForestClassifier (n_estimators=200, random_state=42)...")
rf = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

# 5. Evaluate
print("\n[4/5] Evaluating on Unseen Test Set...")
y_pred = rf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, output_dict=True)

print(f"\n{'='*40}")
print(f"🏆 TEST ACCURACY: {accuracy * 100:.2f}%")
print(f"{'='*40}")

print("\nSample Class Metrics:")
for crop in crops[:5]:
    c_metrics = report.get(crop, {})
    print(f"  - {crop:15s}: Precision={c_metrics.get('precision', 0):.3f}, Recall={c_metrics.get('recall', 0):.3f}, F1={c_metrics.get('f1-score', 0):.3f}")

# Feature importances
importances = dict(zip(features, [round(float(x), 4) for x in rf.feature_importances_]))
print("\nFeature Importances:")
for f, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
    print(f"  - {f:12s}: {imp * 100:.1f}%")

# 6. Save Model Artifacts
print("\n[5/5] Saving model & metadata...")
joblib.dump(rf, MODEL_PATH)
print(f"✅ Saved model: {MODEL_PATH}")

meta = {
    "model_name": "RandomForest Crop Recommender",
    "algorithm": "RandomForestClassifier",
    "n_estimators": 200,
    "features": features,
    "classes": crops,
    "num_classes": len(crops),
    "test_accuracy": round(float(accuracy), 4),
    "macro_f1": round(float(report['macro avg']['f1-score']), 4),
    "feature_importances": importances
}
with open(META_PATH, 'w') as f:
    json.dump(meta, f, indent=2)
print(f"✅ Saved metadata: {META_PATH}")
print("\nMODULE 1 TRAINING COMPLETE.")
