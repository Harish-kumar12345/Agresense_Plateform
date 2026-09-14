# Data Source: CIBRC Approved Agrochemicals & Pre-Harvest Interval (PHI) Master Directory

## 1. Overview
This dataset contains statutory agrochemical formulations approved for use in Indian agriculture by the Central Insecticide Board & Registration Committee (CIBRC), including registered target crops, label claim dosages per hectare and per acre, toxicity classifications, and mandatory Pre-Harvest Intervals (PHI in days).

## 2. Source & Provenance
- **Regulatory Authority**: Central Insecticide Board & Registration Committee (CIBRC).
- **Administrative Body**: Directorate of Plant Protection, Quarantine & Storage (DPPQS), Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India.
- **Portals**:
  - Official CIBRC Portal: https://cibrc.gov.in/
  - Major Uses of Pesticides (Approved Label Claims): https://cibrc.gov.in/major-uses-of-pesticides/
  - Registered Bio-Pesticides: https://cibrc.gov.in/bio-pesticides/
- **Governing Legislation**: Section 9(3) & 9(3B) of the Insecticides Act, 1968 and Insecticides Rules, 1971.

## 3. Dataset Characteristics
- **Total Registered Agrochemicals**: 25 comprehensive formulations spanning:
  - **Insecticides**: Chlorantraniliprole, Imidacloprid, Emamectin Benzoate, Cartap Hydrochloride, Thiamethoxam, Fipronil, Spinosad, Flubendiamide.
  - **Fungicides & Bactericides**: Azoxystrobin + Difenoconazole, Tricyclazole, Mancozeb, Carbendazim, Hexaconazole, Copper Oxychloride, Tebuconazole, Validamycin.
  - **Herbicides**: Bispyribac-sodium, Pretilachlor, Pendimethalin, Glyphosate (strictly noting S.O. 5013(E) restrictions).
  - **Bio-Pesticides & Bio-Control Agents**: Azadirachtin (Neem Oil 10,000 ppm), Trichoderma viride, Pseudomonas fluorescens, Bacillus thuringiensis (Bt), Beauveria bassiana.
- **Fields Provided**:
  - `chemical_name`: Official technical formulation.
  - `common_brands`: Popular registered Indian trade names (e.g., Coragen, Confidor, Amistar Top, Dithane M-45).
  - `category`: Insecticide | Fungicide | Herbicide | Bio-Pesticide.
  - `toxicity_class`: Official color label (Class II Yellow, Class III Blue, Class IV Green).
  - `target_crops` & `target_pests`: Statutorily approved label claims.
  - `recommended_dosage`: Exact dosages per hectare and per acre with water volume.
  - `phi_days`: Statutory Pre-Harvest Interval (waiting period in days before harvest to prevent Maximum Residue Limit / MRL violations).
  - `safety_instructions`: PPE requirements and pollinator/aquatic safeguards.

## 4. License & Compliance
- **Status**: Official statutory public guidance documents published in the Gazette of India under statutory authority.
- **Attribution**: "Central Insecticide Board & Registration Committee (CIBRC), Directorate of Plant Protection, Quarantine & Storage (DPPQS), GoI".
- **Legal Notice**: Farmers and agronomists must always cross-reference local State Agriculture Department advisories and product label packaging before application.

## 5. Refresh Cadence
- **Official Cadence**: Updated following each meeting of the CIBRC Registration Committee and Gazette notifications.
- **Local Cache**: Refreshed quarterly.
