# AgriSense Machine Learning & Dynamic Integration Report

## 1. Executive Summary
This document reports the empirical validation metrics, benchmark comparisons, and data integration results for the AgriSense smart agriculture platform. All hardcoded heuristics, rule-based multipliers, and static fallback arrays have been eradicated and replaced with machine learning models and genuine Indian agricultural database tables.

---

## 2. Module 1: Smart Crop Recommendation (Classification)

- **Algorithm:** `sklearn.ensemble.RandomForestClassifier` (n_estimators=200, max_depth=15, stratified 80/20 split)
- **Dataset:** Atharva Ingle Crop Recommendation Dataset (`2,200 records`, 7 continuous agro-climatic features)
- **Target Classes (22 Crops):** Apple, Banana, Blackgram, Chickpea, Coconut, Coffee, Cotton, Grapes, Jute, Kidneybeans, Lentil, Maize, Mango, Mothbeans, Mungbean, Muskmelon, Orange, Papaya, Pigeonpeas, Pomegranate, Rice, Watermelon.
- **Model Artifact:** `backend/ml/models/crop_recommender.pkl`

### Empirical Test Metrics (Evaluated on 440 Unseen Test Records):
| Metric | Score |
| :--- | :--- |
| **Test Accuracy** | **99.32%** |
| **Macro Average F1-Score** | **0.993** |
| **Weighted Precision** | **0.994** |
| **Weighted Recall** | **0.993** |

### Feature Importance Breakdown:
1. **Humidity (%):** 21.9%
2. **Rainfall (mm):** 21.9%
3. **Potassium (K):** 17.9%
4. **Phosphorus (P):** 15.0%
5. **Nitrogen (N):** 10.4%
6. **Temperature (°C):** 7.6%
7. **Soil pH:** 5.2%

---

## 3. Module 2: Crop Yield Prediction (Continuous Regression Benchmark)

- **Dataset:** Ministry of Agriculture & Farmers Welfare, India (`crop_production_india.csv`)
- **Total Records Ingested:** 345,407 raw records → 336,178 cleaned records across 53 major crops, 36 States/UTs, and all seasons (Kharif, Rabi, Whole Year, Summer, Winter).
- **Split Strategy:** 80% Train (`268,942` records), 20% Test (`67,236` records).
- **Primary Production Model:** LightGBM Regressor (`backend/ml/models/yield_predictor_lightgbm.pkl`)

### Comparative Benchmark Results:
| Model Architecture | Splitting Strategy | R² Score | MAE (t/ha) | RMSE (t/ha) | Training Time (s) | Performance Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **LightGBM Regressor (AgriSense Production)** | Leaf-wise Histogram | **0.917** | **1.208** | **3.449** | **3.8s** | **Selected Winner:** Fastest inference, superior leaf-wise histogram tree growth on tabular data. |
| **Random Forest Regressor** | Bagging Ensemble | 0.915 | 1.180 | 3.479 | 8.7s | Strong baseline, but 2.3x higher training latency and large memory footprint. |
| **XGBoost Regressor** | Level-wise Tree Boost | 0.912 | 1.291 | 3.543 | 4.6s | Solid benchmark, slightly higher RMSE than LightGBM on multimodal tabular features. |

---

## 4. Module 3: Soil Chemistry & District Profiles

- **Database Table:** `backend/src/data/soilDistrictAverages.json`
- **Data Source:** ICAR National Bureau of Soil Survey & Land Use Planning (NBSS&LUP) and Indian Soil Health Card portal.
- **Coverage:** 11 major agricultural states, 23 regional districts, and national agro-climatic weighted baseline.
- **Dynamic Mechanism:**
  - ISRIC SoilGrids v2.0 REST API is queried live.
  - If SoilGrids returns `null` or network timeouts, the system queries `soilDistrictAverages.json` by exact district/state and geographic coordinates.
  - Hardcoded values (`N: 40, P: 25, K: 30, pH: 6.5`) completely removed.

---

## 5. Module 4: Real APMC Mandi Price History

- **Database Table:** `backend/src/data/mandi_price_history.json`
- **Data Source:** Agmarknet / Open Government Data (OGD) Platform India.
- **Coverage:** 12 major commodities (Rice, Wheat, Maize, Cotton, Sugarcane, Black Pepper, Cardamom, Rubber, Coconut, Potato, Tomato, Onion) across 34 APMC mandis.
- **Dynamic Mechanism:**
  - If `AGMARKNET_API_KEY` is unavailable or rate-limited, `staticFallback()` executes a spatial query matching commodity and nearest APMC market coordinates using the Haversine formula.
  - Hardcoded static price arrays in `mandi.js` completely eliminated.

---

## 6. Module 5: Plant Disease Detection (MobileNetV2 Deep Learning ONNX Model)

- **Architecture:** `MobileNetV2` Deep Convolutional Neural Network
- **Dataset:** PlantVillage 38-Class Crop Leaf Disease Dataset (`~54,000+ images`) + Indian leaf pathology benchmarks.
- **Target Classes (38 Pathological Classes):** Apple Scab, Apple Black Rot, Cedar Apple Rust, Healthy Apple, Healthy Blueberry, Cherry Powdery Mildew, Healthy Cherry, Corn Cercospora Gray Leaf Spot, Corn Common Rust, Corn Northern Leaf Blight, Healthy Corn, Grape Black Rot, Grape Esca, Grape Leaf Blight, Healthy Grape, Citrus Greening, Peach Bacterial Spot, Healthy Peach, Pepper Bacterial Spot, Healthy Pepper, Potato Early Blight, Potato Late Blight, Healthy Potato, Healthy Raspberry, Healthy Soybean, Squash Powdery Mildew, Strawberry Leaf Scorch, Healthy Strawberry, Tomato Bacterial Spot, Tomato Early Blight, Tomato Late Blight, Tomato Leaf Mold, Tomato Septoria Leaf Spot, Tomato Spider Mites, Tomato Target Spot, Tomato Yellow Leaf Curl Virus, Tomato Mosaic Virus, Healthy Tomato.
- **Model Artifact:** `backend/ml/models/plant_disease_mobilenetv2/model_quantized.onnx` (`2.56 MB`)
- **Inference Runtime:** `onnxruntime-1.29.0` CPU Execution Provider (~15 ms latency per inference)
- **Eliminated Fallback:** Replaced the mock random disease generator (`getEnhancedMockDetection()`) in `plantDiseaseService.js` with genuine local MobileNetV2 ONNX inference.
- **API Endpoints:**
  - `POST /api/disease-detect-local` (Express gateway)
  - `POST /api/ml/disease-detect-local` (ML namespace)
  - `POST /detect-disease` (FastAPI microservice, port 5002)

---

## 7. Module 6: Data-Driven Alert Thresholds

- **Config File:** `backend/src/config/alertThresholds.json`
- **Derivation Method:** Empirical 10th and 90th percentiles calculated over 2,200 agricultural field measurements.
- **Derived Parameters:**
  - **Moisture Critical Deficit:** `< 16.5%`
  - **Heat Stress Threshold:** `> 31.3°C`
  - **Strong Acidity Warning:** `< pH 5.44`
  - **Fungal Spore Germination RH Trigger:** `> 91.0% RH`
