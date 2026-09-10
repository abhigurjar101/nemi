-- ============================================================================
-- CMS HOME HEALTH AGENCY (HHA) ANALYTICS DATA WAREHOUSE SCHEMA
-- Dimensional Model (Star Schema) for Healthcare BI & Clinical Analytics
-- ============================================================================

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS fact_hha_episodes_financials;
DROP TABLE IF EXISTS dim_clinical_conditions;
DROP TABLE IF EXISTS dim_patient_demographics;
DROP TABLE IF EXISTS dim_geography;
DROP TABLE IF EXISTS dim_provider;
DROP TABLE IF EXISTS raw_hha_medicare_data;

-- 1. Raw Staging Table
CREATE TABLE raw_hha_medicare_data (
    provider_id INTEGER PRIMARY KEY,
    agency_name TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code INTEGER,
    total_episodes_non_lupa INTEGER,
    distinct_beneficiaries_non_lupa INTEGER,
    avg_total_visits_per_episode REAL,
    avg_skilled_nursing_visits REAL,
    avg_pt_visits REAL,
    avg_ot_visits REAL,
    avg_st_visits REAL,
    avg_aide_visits REAL,
    avg_medical_social_visits REAL,
    total_charge_amount INTEGER,
    total_medicare_payment_amount INTEGER,
    total_medicare_standard_payment_amount INTEGER,
    outlier_payments_percent REAL,
    total_lupa_episodes INTEGER,
    total_medicare_payment_lupas INTEGER,
    average_age INTEGER,
    male_beneficiaries INTEGER,
    female_beneficiaries INTEGER,
    nondual_beneficiaries INTEGER,
    dual_beneficiaries INTEGER,
    white_beneficiaries REAL,
    black_beneficiaries REAL,
    asian_pacific_islander_beneficiaries INTEGER,
    hispanic_beneficiaries REAL,
    native_american_beneficiaries REAL,
    other_unknown_beneficiaries REAL,
    average_hcc_score REAL,
    pct_atrial_fibrillation REAL,
    pct_alzheimers REAL,
    pct_asthma REAL,
    pct_cancer REAL,
    pct_chf REAL,
    pct_ckd REAL,
    pct_copd REAL,
    pct_depression REAL,
    pct_diabetes REAL,
    pct_hyperlipidemia REAL,
    pct_hypertension REAL,
    pct_ihd REAL,
    pct_osteoporosis REAL,
    pct_ra_oa REAL,
    pct_schizophrenia REAL,
    pct_stroke REAL
);

-- 2. Dimension Table: Provider Information
CREATE TABLE dim_provider (
    provider_id INTEGER PRIMARY KEY,
    agency_name TEXT NOT NULL,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code INTEGER
);

-- 3. Dimension Table: Geography & Market
CREATE TABLE dim_geography (
    zip_code INTEGER PRIMARY KEY,
    city TEXT,
    state TEXT,
    region TEXT
);

-- 4. Dimension Table: Patient Demographics & Social Vulnerability
CREATE TABLE dim_patient_demographics (
    provider_id INTEGER PRIMARY KEY,
    average_age REAL,
    male_beneficiaries INTEGER,
    female_beneficiaries INTEGER,
    pct_female REAL,
    nondual_beneficiaries INTEGER,
    dual_beneficiaries INTEGER,
    pct_dual_eligible REAL,
    white_beneficiaries INTEGER,
    black_beneficiaries INTEGER,
    asian_pacific_islander_beneficiaries INTEGER,
    hispanic_beneficiaries INTEGER,
    native_american_beneficiaries INTEGER,
    other_unknown_beneficiaries INTEGER,
    FOREIGN KEY (provider_id) REFERENCES dim_provider(provider_id)
);

-- 5. Dimension Table: Clinical Acuity & Chronic Comorbidities
CREATE TABLE dim_clinical_conditions (
    provider_id INTEGER PRIMARY KEY,
    average_hcc_score REAL,
    hcc_risk_tier TEXT,
    pct_chf REAL,
    pct_copd REAL,
    pct_ckd REAL,
    pct_diabetes REAL,
    pct_hypertension REAL,
    pct_hyperlipidemia REAL,
    pct_ihd REAL,
    pct_alzheimers REAL,
    pct_depression REAL,
    pct_cancer REAL,
    pct_stroke REAL,
    pct_atrial_fibrillation REAL,
    pct_asthma REAL,
    pct_osteoporosis REAL,
    pct_ra_oa REAL,
    pct_schizophrenia REAL,
    FOREIGN KEY (provider_id) REFERENCES dim_provider(provider_id)
);

-- 6. Fact Table: Utilization, Service Mix & Financial Performance
CREATE TABLE fact_hha_episodes_financials (
    fact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    total_episodes_non_lupa INTEGER,
    distinct_beneficiaries_non_lupa INTEGER,
    episodes_per_beneficiary REAL,
    avg_total_visits_per_episode REAL,
    avg_skilled_nursing_visits REAL,
    avg_pt_visits REAL,
    avg_ot_visits REAL,
    avg_st_visits REAL,
    avg_aide_visits REAL,
    avg_medical_social_visits REAL,
    total_charge_amount REAL,
    total_medicare_payment_amount REAL,
    total_medicare_standard_payment_amount REAL,
    payment_to_charge_ratio REAL,
    payment_per_episode REAL,
    standard_payment_per_episode REAL,
    payment_variance REAL,
    outlier_payments_percent REAL,
    total_lupa_episodes INTEGER,
    lupa_episode_rate REAL,
    total_medicare_payment_lupas REAL,
    payment_per_lupa_episode REAL,
    FOREIGN KEY (provider_id) REFERENCES dim_provider(provider_id)
);

-- Create Performance Indexes for Fast Analytics & Aggregations
CREATE INDEX idx_provider_state ON dim_provider(state);
CREATE INDEX idx_provider_city ON dim_provider(city);
CREATE INDEX idx_fact_provider ON fact_hha_episodes_financials(provider_id);
CREATE INDEX idx_clinical_hcc ON dim_clinical_conditions(average_hcc_score);
CREATE INDEX idx_clinical_risk_tier ON dim_clinical_conditions(hcc_risk_tier);
CREATE INDEX idx_demo_dual ON dim_patient_demographics(pct_dual_eligible);
