# DATA SOURCE: ICAR STCR Fertilizer Recommendations & Nutrient Calibration

## 1. Source Origin
* **Agency / Institute**: ICAR - Indian Institute of Soil Science (IISS), Bhopal, Madhya Pradesh, India
* **Framework**: All India Coordinated Research Project on Soil Test Crop Response (AICRP-STCR)
* **Scientific Basis**: Ramamoorthy et al. Targeted Yield Equation Concept (ICAR Publications & State Agricultural Universities Package of Practices).

## 2. Methodology & Equations
* **Target Yield Concept**:
  - Fertilizer doses ($FN, FP_2O_5, FK_2O$) are calculated based on:
    1. Targeted yield ($T$ in t/ha)
    2. Soil test available nutrients ($SN, SP, SK$ in kg/ha)
    3. Crop-specific nutrient uptake coefficients ($NR, CS, CF$)
  - Formula:
    $$FN = a \times T - b \times SN$$
    $$FP_2O_5 = c \times T - d \times SP$$
    $$FK_2O = e \times T - f \times SK$$
* **Commercial Fertilizer Conversion**:
  - DAP (18% N, 46% P₂O₅)
  - Urea (46% N)
  - MOP (60% K₂O)
  - Single Super Phosphate (16% P₂O₅)

## 3. License
* **License**: Open Government Data License - India (ICAR Research Publications / AICRP-STCR guidelines).
* **Usage**: Public agricultural advisory service.

## 4. Refresh Cadence
* Reviewed annually as state agricultural universities publish revised Package of Practices for Kharif and Rabi cycles.
