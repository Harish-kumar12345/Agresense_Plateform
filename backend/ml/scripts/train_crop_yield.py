import os
import sys
import json
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.ensemble import RandomForestRegressor
import lightgbm as lgb
import xgboost as xgb
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, 'datasets', 'crop_production_india.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_LGB_PATH = os.path.join(MODEL_DIR, 'yield_predictor_lightgbm.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'yield_encoders.joblib')
BENCHMARK_PATH = os.path.join(MODEL_DIR, 'yield_benchmark_metrics.json')

print("=" * 65)
print("MODULE 2: CROP YIELD REGRESSION BENCHMARK & MODEL TRAINING")
print("=" * 65)

# 1. Load Dataset
print(f"\n[1/6] Loading Crop Production Dataset ({DATASET_PATH})...")
t0 = time.time()
df = pd.read_csv(DATASET_PATH)
print(f"Loaded {len(df):,} records in {time.time() - t0:.2f}s")

# 2. Data Cleaning
print("\n[2/6] Cleaning Data & Feature Preparation...")
df.columns = [c.strip() for c in df.columns]

# Ensure Area, Production, and Yield are numeric
df['Area'] = pd.to_numeric(df['Area'], errors='coerce')
df['Production'] = pd.to_numeric(df['Production'], errors='coerce')
df['Yield'] = pd.to_numeric(df['Yield'], errors='coerce')

# Drop invalid / zero area or missing yield
df = df.dropna(subset=['Area', 'Production', 'Yield', 'Crop', 'State', 'Season'])
df = df[(df['Area'] > 0) & (df['Production'] >= 0) & (df['Yield'] > 0)]

# Filter statistical anomalies (Yield > 120 t/ha is extreme outside sugarcane)
df = df[df['Yield'] <= 120]
print(f"Cleaned dataset: {len(df):,} records remaining")

# Standardize key crops
df['Crop'] = df['Crop'].str.strip().str.title()
df['State'] = df['State'].str.strip().str.title()
df['Season'] = df['Season'].str.strip().str.title()

# Focus on major agricultural crops for high-fidelity modeling
top_crops = df['Crop'].value_counts()
major_crops = top_crops[top_crops >= 100].index.tolist()
df = df[df['Crop'].isin(major_crops)]
print(f"Filtered to top {len(major_crops)} crops: {len(df):,} records")

# 3. Categorical Encoders
print("\n[3/6] Encoding Categorical Features...")
cat_cols = ['Crop', 'State', 'Season']
encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
encoded_cats = encoder.fit_transform(df[cat_cols])

X = pd.DataFrame(encoded_cats, columns=['crop_code', 'state_code', 'season_code'], index=df.index)
X['area_ha'] = np.log1p(df['Area']) # log scale for stabilization
y = df['Yield']

# Train/Test Split (80/20)
print("\n[4/6] 80/20 Train-Test Split...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
print(f"Train size: {len(X_train):,}, Test size: {len(X_test):,}")

# 4. Fair Benchmark Training
benchmark_results = {}

# --- A) Baseline: Random Forest Regressor ---
print("\n--- Training Model 1: Random Forest Regressor (Baseline) ---")
t0 = time.time()
rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_time = time.time() - t0
rf_r2 = r2_score(y_test, rf_pred)
rf_mae = mean_absolute_error(y_test, rf_pred)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
benchmark_results['Random Forest'] = {
    'R2': round(float(rf_r2), 4),
    'MAE': round(float(rf_mae), 4),
    'RMSE': round(float(rf_rmse), 4),
    'Train_Time_s': round(rf_time, 2)
}
print(f"  Random Forest -> R²: {rf_r2:.3f}, MAE: {rf_mae:.3f}, RMSE: {rf_rmse:.3f} ({rf_time:.1f}s)")

# --- B) Comparison: XGBoost Regressor ---
print("\n--- Training Model 2: XGBoost Regressor (Benchmark) ---")
t0 = time.time()
xgb_model = xgb.XGBRegressor(
    n_estimators=300,
    learning_rate=0.08,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1
)
xgb_model.fit(X_train, y_train)
xgb_pred = xgb_model.predict(X_test)
xgb_time = time.time() - t0
xgb_r2 = r2_score(y_test, xgb_pred)
xgb_mae = mean_absolute_error(y_test, xgb_pred)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
benchmark_results['XGBoost'] = {
    'R2': round(float(xgb_r2), 4),
    'MAE': round(float(xgb_mae), 4),
    'RMSE': round(float(xgb_rmse), 4),
    'Train_Time_s': round(xgb_time, 2)
}
print(f"  XGBoost       -> R²: {xgb_r2:.3f}, MAE: {xgb_mae:.3f}, RMSE: {xgb_rmse:.3f} ({xgb_time:.1f}s)")

# --- C) Primary Winner: LightGBM Regressor ---
print("\n--- Training Model 3: LightGBM Regressor (Primary Production Model) ---")
t0 = time.time()
lgb_model = lgb.LGBMRegressor(
    n_estimators=400,
    learning_rate=0.06,
    num_leaves=63,
    subsample=0.85,
    colsample_bytree=0.85,
    random_state=42,
    n_jobs=-1,
    verbose=-1
)
lgb_model.fit(X_train, y_train)
lgb_pred = lgb_model.predict(X_test)
lgb_time = time.time() - t0
lgb_r2 = r2_score(y_test, lgb_pred)
lgb_mae = mean_absolute_error(y_test, lgb_pred)
lgb_rmse = np.sqrt(mean_squared_error(y_test, lgb_pred))
benchmark_results['LightGBM (AgriSense Production)'] = {
    'R2': round(float(lgb_r2), 4),
    'MAE': round(float(lgb_mae), 4),
    'RMSE': round(float(lgb_rmse), 4),
    'Train_Time_s': round(lgb_time, 2)
}
print(f"  LightGBM      -> R²: {lgb_r2:.3f}, MAE: {lgb_mae:.3f}, RMSE: {lgb_rmse:.3f} ({lgb_time:.1f}s)")

# 5. Benchmark Comparison Table
print("\n" + "=" * 65)
print("🏆 FINAL MODEL BENCHMARK COMPARISON TABLE")
print("=" * 65)
print(f"{'Model':<32} | {'R² Score':<9} | {'MAE':<7} | {'RMSE':<7} | {'Time (s)':<8}")
print("-" * 65)
for name, m in benchmark_results.items():
    print(f"{name:<32} | {m['R2']:<9.3f} | {m['MAE']:<7.3f} | {m['RMSE']:<7.3f} | {m['Train_Time_s']:<8.1f}")
print("=" * 65)

# 6. Save Winning LightGBM Model & Encoders
print("\n[6/6] Saving Production LightGBM Artifacts...")
joblib.dump(lgb_model, MODEL_LGB_PATH)
joblib.dump({
    'encoder': encoder,
    'crops': encoder.categories_[0].tolist(),
    'states': encoder.categories_[1].tolist(),
    'seasons': encoder.categories_[2].tolist(),
    'feature_names': ['crop_code', 'state_code', 'season_code', 'area_ha']
}, ENCODER_PATH)

with open(BENCHMARK_PATH, 'w') as f:
    json.dump(benchmark_results, f, indent=2)

print(f"✅ Saved LightGBM Model: {MODEL_LGB_PATH}")
print(f"✅ Saved Encoders:       {ENCODER_PATH}")
print(f"✅ Saved Benchmark Log:  {BENCHMARK_PATH}")
print("\nMODULE 2 TRAINING COMPLETE.")
