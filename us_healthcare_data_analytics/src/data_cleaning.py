"""
Data Cleaning, Imputation & Feature Engineering Pipeline
Handles CMS data suppression, type coercions, and feature creation.
"""

import pandas as pd
import numpy as np

def clean_and_prepare_hha_data(csv_path: str) -> pd.DataFrame:
    """
    Loads raw CMS Home Health Agency CSV, cleans missing values,
    and creates standardized domain-specific analytical features.
    """
    df = pd.read_csv(csv_path)
    
    # 1. Clean Column Names to snake_case standard
    df.columns = [c.strip().lower() for c in df.columns]
    
    # 2. Impute Demographic Beneficiary Counts (CMS suppresses small cell counts < 11)
    # Demographic columns with suppression/nulls
    demo_cols = [
        'white_beneficiaries', 'black_beneficiaries', 
        'asian_pacific_islander_beneficiaries', 'hispanic_beneficiaries', 
        'american_indian_or_alaska_native_beneficiaries', 'other_unknown_beneficiaries'
    ]
    for col in demo_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(float)
            
    # 3. Clinical Comorbidities Imputation
    clinical_cols = [
        'percent_of_beneficiaries_with_atrial_fibrillation',
        'percent_of_beneficiaries_with_alzheimers',
        'percent_of_beneficiaries_with_asthma',
        'percent_of_beneficiaries_with_cancer',
        'percent_of_beneficiaries_with_chf',
        'percent_of_beneficiaries_with_chronic_kidney_disease',
        'percent_of_beneficiaries_with_copd',
        'percent_of_beneficiaries_with_depression',
        'percent_of_beneficiaries_with_diabetes',
        'percent_of_beneficiaries_with_hyperlipidemia',
        'percent_of_beneficiaries_with_hypertension',
        'percent_of_beneficiaries_with_ihd',
        'percent_of_beneficiaries_with_osteoporosis',
        'percent_of_beneficiaries_with_ra_oa',
        'percent_of_beneficiaries_with_schizophrenia',
        'percent_of_beneficiaries_with_stroke'
    ]
    for col in clinical_cols:
        if col in df.columns:
            # Impute missing clinical prevalence with median of available records or 0 if single null
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0.0)

    # 4. Feature Engineering
    # Beneficiary Ratios
    total_gender = df['male_beneficiaries'] + df['female_beneficiaries']
    df['pct_female'] = np.where(total_gender > 0, (df['female_beneficiaries'] / total_gender) * 100.0, 0.0)
    
    total_dual_pop = df['nondual_beneficiaries'] + df['dua_beneficiaries']
    df['pct_dual_eligible'] = np.where(total_dual_pop > 0, (df['dua_beneficiaries'] / total_dual_pop) * 100.0, 0.0)
    
    df['episodes_per_beneficiary'] = np.where(
        df['distinct_beneficiaries_non_lupa'] > 0,
        df['total_episodes_non_lupa'] / df['distinct_beneficiaries_non_lupa'],
        1.0
    )
    
    # Financial Ratios & Metrics
    df['payment_to_charge_ratio'] = np.where(
        df['total_hha_charge_amount_non_lupa'] > 0,
        df['total_hha_medicare_payment_amount_non_lupa'] / df['total_hha_charge_amount_non_lupa'],
        0.0
    )
    df['charge_to_payment_markup'] = np.where(
        df['total_hha_medicare_payment_amount_non_lupa'] > 0,
        df['total_hha_charge_amount_non_lupa'] / df['total_hha_medicare_payment_amount_non_lupa'],
        0.0
    )
    df['payment_per_episode'] = np.where(
        df['total_episodes_non_lupa'] > 0,
        df['total_hha_medicare_payment_amount_non_lupa'] / df['total_episodes_non_lupa'],
        0.0
    )
    df['standard_payment_per_episode'] = np.where(
        df['total_episodes_non_lupa'] > 0,
        df['total_hha_medicare_standard_payment_amount_non_lupa'] / df['total_episodes_non_lupa'],
        0.0
    )
    # Payment Variance (Actual - Standard Payment indicates geographic wage index impact)
    df['payment_variance'] = df['payment_per_episode'] - df['standard_payment_per_episode']
    
    # LUPA (Low Utilization Payment Adjustment) Rate
    total_all_episodes = df['total_episodes_non_lupa'] + df['total_lupa_episodes']
    df['lupa_episode_rate'] = np.where(
        total_all_episodes > 0,
        (df['total_lupa_episodes'] / total_all_episodes) * 100.0,
        0.0
    )
    df['payment_per_lupa_episode'] = np.where(
        df['total_lupa_episodes'] > 0,
        df['total_hha_medicare_payment_amount_for_lupas'] / df['total_lupa_episodes'],
        0.0
    )
    
    # HCC Risk Tier Classification
    # HCC < 1.8: Low Risk, 1.8 <= HCC <= 2.4: Moderate Risk, HCC > 2.4: High Acuity Risk
    conditions = [
        (df['average_hcc_score'] < 1.80),
        (df['average_hcc_score'] >= 1.80) & (df['average_hcc_score'] <= 2.40),
        (df['average_hcc_score'] > 2.40)
    ]
    choices = ['Tier 1: Low Risk (<1.80)', 'Tier 2: Moderate Risk (1.80-2.40)', 'Tier 3: High Acuity (>2.40)']
    df['hcc_risk_tier'] = np.select(conditions, choices, default='Tier 2: Moderate Risk (1.80-2.40)')
    
    # Discipline Visit Distribution Percentages
    total_visits = df['average_number_of_total_visits_per_episode_non_lupa']
    df['pct_skilled_nursing_visits'] = np.where(total_visits > 0, (df['average_number_of_skilled_nursing_visits_per_episode_non_lupa'] / total_visits) * 100.0, 0.0)
    df['pct_pt_visits'] = np.where(total_visits > 0, (df['average_number_of_pt_visits_per_episode_non_lupa'] / total_visits) * 100.0, 0.0)
    df['pct_ot_visits'] = np.where(total_visits > 0, (df['average_number_of_ot_visits_per_episode_non_lupa'] / total_visits) * 100.0, 0.0)
    df['pct_st_visits'] = np.where(total_visits > 0, (df['average_number_of_st_visits_per_episode_non_lupa'] / total_visits) * 100.0, 0.0)
    df['pct_aide_visits'] = np.where(total_visits > 0, (df['average_number_of_home_health_aide_visits_per_episode_non_lupa'] / total_visits) * 100.0, 0.0)
    df['pct_therapy_visits_combined'] = df['pct_pt_visits'] + df['pct_ot_visits'] + df['pct_st_visits']

    # US Census Region Mapping
    region_map = {
        'MA': 'Northeast', 'NY': 'Northeast', 'PA': 'Northeast',
        'IL': 'Midwest', 'WI': 'Midwest',
        'FL': 'South', 'MD': 'South', 'VA': 'South', 'TX': 'South',
        'CA': 'West', 'NV': 'West', 'HI': 'West'
    }
    df['region'] = df['state'].map(region_map).fillna('Other')
    
    return df

if __name__ == '__main__':
    csv_path = '/Users/abhigurjar/Desktop/Projects_and_Folders/NEMI/us_healthcare_data_analytics/data/us_healthcare_hha_data.csv'
    clean_df = clean_and_prepare_hha_data(csv_path)
    print("Cleaned Data Shape:", clean_df.shape)
    print("Engineered Features Sample:", clean_df[['provider_id', 'pct_dual_eligible', 'hcc_risk_tier', 'payment_per_episode', 'region']].head())
