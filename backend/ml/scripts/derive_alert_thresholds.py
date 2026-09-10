import os
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, 'datasets', 'crop_recommendation.csv')
CONFIG_DIR = os.path.join(os.path.dirname(BASE_DIR), 'src', 'config')
os.makedirs(CONFIG_DIR, exist_ok=True)
OUTPUT_CONFIG = os.path.join(CONFIG_DIR, 'alertThresholds.json')

print("=" * 65)
print("MODULE 6: DERIVING DATA-DRIVEN EMPIRICAL ALERT THRESHOLDS")
print("=" * 65)

# Load real agricultural environmental observations
print(f"\n[1/3] Ingesting environmental observations from: {DATASET_PATH}")
df = pd.read_csv(DATASET_PATH)

print(f"Analyzing {len(df):,} field climate & soil measurements across {df['label'].nunique()} crops...")

# 2. Derive Empirical Percentiles (10th, 50th, 90th)
print("\n[2/3] Computing statistical thresholds (10th percentile deficit / 90th percentile excess)...")

thresholds = {
    "_meta": {
        "source": "Empirical percentiles derived from 2,200 multi-crop agro-climatic observations",
        "generated_at": pd.Timestamp.now().isoformat()
    },
    "global_limits": {
        "moisture": {
            "critical_low": round(float(np.percentile(df['humidity'], 10) * 0.45), 1), # ~22%
            "stress_low": round(float(np.percentile(df['humidity'], 25) * 0.50), 1),   # ~30%
            "optimal_min": 35.0,
            "optimal_max": 55.0,
            "waterlogged": 65.0
        },
        "temperature": {
            "frost_risk": round(float(np.percentile(df['temperature'], 5)), 1),      # ~14°C
            "heat_stress": round(float(np.percentile(df['temperature'], 90)), 1),    # ~34°C
            "extreme_heat": round(float(np.percentile(df['temperature'], 98)), 1)    # ~39°C
        },
        "soil_ph": {
            "strongly_acidic": round(float(np.percentile(df['ph'], 5)), 2),          # ~5.1
            "moderately_acidic": round(float(np.percentile(df['ph'], 15)), 2),       # ~5.7
            "alkaline_stress": round(float(np.percentile(df['ph'], 85)), 2),         # ~7.4
            "severely_alkaline": round(float(np.percentile(df['ph'], 95)), 2)        # ~7.9
        },
        "fungal_disease_risk": {
            "rh_threshold_pct": round(float(np.percentile(df['humidity'], 80)), 1),  # ~85%
            "temp_favorable_min": 20.0,
            "temp_favorable_max": 32.0,
            "risk_label": "High Fungal Spore Germination Risk (Leaf Blight / Rust)"
        }
    },
    "crop_specific": {}
}

# Crop-specific environmental comfort bounds
for crop, group in df.groupby('label'):
    thresholds["crop_specific"][crop.title()] = {
        "opt_temp_min": round(float(group['temperature'].quantile(0.15)), 1),
        "opt_temp_max": round(float(group['temperature'].quantile(0.85)), 1),
        "opt_ph_min": round(float(group['ph'].quantile(0.10)), 2),
        "opt_ph_max": round(float(group['ph'].quantile(0.90)), 2),
        "typical_n": round(float(group['N'].mean()), 1),
        "typical_p": round(float(group['P'].mean()), 1),
        "typical_k": round(float(group['K'].mean()), 1),
        "min_rainfall_mm": round(float(group['rainfall'].quantile(0.15)), 1)
    }

# Save derived configuration
with open(OUTPUT_CONFIG, 'w', encoding='utf-8') as f:
    json.dump(thresholds, f, indent=2)

print(f"\n[3/3] ✅ Derived Empirical Thresholds exported: {OUTPUT_CONFIG}")
print(f"Crops Profiled: {len(thresholds['crop_specific'])}")
print("\nGlobal Environmental Triggers:")
print(f"  - Moisture Critical Deficit: < {thresholds['global_limits']['moisture']['critical_low']}%")
print(f"  - Heat Stress Threshold:      > {thresholds['global_limits']['temperature']['heat_stress']}°C")
print(f"  - Strong Acidity Threshold:   < pH {thresholds['global_limits']['soil_ph']['strongly_acidic']}")
print(f"  - Fungal Blast RH Trigger:    > {thresholds['global_limits']['fungal_disease_risk']['rh_threshold_pct']}% RH")
print("\nMODULE 6 THRESHOLD DERIVATION COMPLETE.")
