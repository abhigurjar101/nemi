"""
Database Management & Star Schema ETL Module
Ingests clean data into an analytical SQLite database warehouse.
"""

import sqlite3
import pandas as pd
import os
from src.data_cleaning import clean_and_prepare_hha_data

class HealthcareDataWarehouse:
    def __init__(self, db_path: str, schema_path: str = None):
        self.db_path = db_path
        self.schema_path = schema_path
        self.conn = None
        
    def connect(self):
        """Establishes connection to SQLite database."""
        self.conn = sqlite3.connect(self.db_path)
        return self.conn
        
    def close(self):
        """Closes connection."""
        if self.conn:
            self.conn.close()
            
    def init_schema(self):
        """Initializes database schema from DDL script."""
        if not self.schema_path or not os.path.exists(self.schema_path):
            raise FileNotFoundError(f"Schema file not found at: {self.schema_path}")
            
        with open(self.schema_path, 'r', encoding='utf-8') as f:
            ddl_sql = f.read()
            
        conn = self.connect()
        cursor = conn.cursor()
        cursor.executescript(ddl_sql)
        conn.commit()
        print(f"Database schema successfully initialized at {self.db_path}")

    def populate_star_schema(self, df: pd.DataFrame):
        """Transforms and loads DataFrame into Star Schema tables."""
        conn = self.connect()
        
        # 1. Staging / Raw Table
        raw_cols_map = {
            'provider_id': 'provider_id',
            'agency_name': 'agency_name',
            'street_address': 'street_address',
            'city': 'city',
            'state': 'state',
            'zip_code': 'zip_code',
            'total_episodes_non_lupa': 'total_episodes_non_lupa',
            'distinct_beneficiaries_non_lupa': 'distinct_beneficiaries_non_lupa',
            'average_number_of_total_visits_per_episode_non_lupa': 'avg_total_visits_per_episode',
            'average_number_of_skilled_nursing_visits_per_episode_non_lupa': 'avg_skilled_nursing_visits',
            'average_number_of_pt_visits_per_episode_non_lupa': 'avg_pt_visits',
            'average_number_of_ot_visits_per_episode_non_lupa': 'avg_ot_visits',
            'average_number_of_st_visits_per_episode_non_lupa': 'avg_st_visits',
            'average_number_of_home_health_aide_visits_per_episode_non_lupa': 'avg_aide_visits',
            'average_number_of_medical_social_visits_per_episode_non_lupa': 'avg_medical_social_visits',
            'total_hha_charge_amount_non_lupa': 'total_charge_amount',
            'total_hha_medicare_payment_amount_non_lupa': 'total_medicare_payment_amount',
            'total_hha_medicare_standard_payment_amount_non_lupa': 'total_medicare_standard_payment_amount',
            'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa': 'outlier_payments_percent',
            'total_lupa_episodes': 'total_lupa_episodes',
            'total_hha_medicare_payment_amount_for_lupas': 'total_medicare_payment_lupas',
            'average_age': 'average_age',
            'male_beneficiaries': 'male_beneficiaries',
            'female_beneficiaries': 'female_beneficiaries',
            'nondual_beneficiaries': 'nondual_beneficiaries',
            'dua_beneficiaries': 'dual_beneficiaries',
            'white_beneficiaries': 'white_beneficiaries',
            'black_beneficiaries': 'black_beneficiaries',
            'asian_pacific_islander_beneficiaries': 'asian_pacific_islander_beneficiaries',
            'hispanic_beneficiaries': 'hispanic_beneficiaries',
            'american_indian_or_alaska_native_beneficiaries': 'native_american_beneficiaries',
            'other_unknown_beneficiaries': 'other_unknown_beneficiaries',
            'average_hcc_score': 'average_hcc_score',
            'percent_of_beneficiaries_with_atrial_fibrillation': 'pct_atrial_fibrillation',
            'percent_of_beneficiaries_with_alzheimers': 'pct_alzheimers',
            'percent_of_beneficiaries_with_asthma': 'pct_asthma',
            'percent_of_beneficiaries_with_cancer': 'pct_cancer',
            'percent_of_beneficiaries_with_chf': 'pct_chf',
            'percent_of_beneficiaries_with_chronic_kidney_disease': 'pct_ckd',
            'percent_of_beneficiaries_with_copd': 'pct_copd',
            'percent_of_beneficiaries_with_depression': 'pct_depression',
            'percent_of_beneficiaries_with_diabetes': 'pct_diabetes',
            'percent_of_beneficiaries_with_hyperlipidemia': 'pct_hyperlipidemia',
            'percent_of_beneficiaries_with_hypertension': 'pct_hypertension',
            'percent_of_beneficiaries_with_ihd': 'pct_ihd',
            'percent_of_beneficiaries_with_osteoporosis': 'pct_osteoporosis',
            'percent_of_beneficiaries_with_ra_oa': 'pct_ra_oa',
            'percent_of_beneficiaries_with_schizophrenia': 'pct_schizophrenia',
            'percent_of_beneficiaries_with_stroke': 'pct_stroke'
        }
        
        raw_df = df[[k for k in raw_cols_map.keys() if k in df.columns]].rename(columns=raw_cols_map)
        raw_df.drop_duplicates(subset=['provider_id'], inplace=True)
        raw_df.to_sql('raw_hha_medicare_data', conn, if_exists='replace', index=False)
        
        # 2. Dim Provider
        dim_provider = df[['provider_id', 'agency_name', 'street_address', 'city', 'state', 'zip_code']].drop_duplicates()
        dim_provider.to_sql('dim_provider', conn, if_exists='replace', index=False)
        
        # 3. Dim Geography
        dim_geography = df[['zip_code', 'city', 'state', 'region']].drop_duplicates(subset=['zip_code'])
        dim_geography.to_sql('dim_geography', conn, if_exists='replace', index=False)
        
        # 4. Dim Patient Demographics
        dim_demo = df[[
            'provider_id', 'average_age', 'male_beneficiaries', 'female_beneficiaries', 'pct_female',
            'nondual_beneficiaries', 'dua_beneficiaries', 'pct_dual_eligible',
            'white_beneficiaries', 'black_beneficiaries', 'asian_pacific_islander_beneficiaries',
            'hispanic_beneficiaries', 'american_indian_or_alaska_native_beneficiaries', 'other_unknown_beneficiaries'
        ]].rename(columns={
            'dua_beneficiaries': 'dual_beneficiaries',
            'american_indian_or_alaska_native_beneficiaries': 'native_american_beneficiaries'
        }).drop_duplicates(subset=['provider_id'])
        dim_demo.to_sql('dim_patient_demographics', conn, if_exists='replace', index=False)
        
        # 5. Dim Clinical Conditions
        dim_clinical = df[[
            'provider_id', 'average_hcc_score', 'hcc_risk_tier',
            'percent_of_beneficiaries_with_chf', 'percent_of_beneficiaries_with_copd',
            'percent_of_beneficiaries_with_chronic_kidney_disease', 'percent_of_beneficiaries_with_diabetes',
            'percent_of_beneficiaries_with_hypertension', 'percent_of_beneficiaries_with_hyperlipidemia',
            'percent_of_beneficiaries_with_ihd', 'percent_of_beneficiaries_with_alzheimers',
            'percent_of_beneficiaries_with_depression', 'percent_of_beneficiaries_with_cancer',
            'percent_of_beneficiaries_with_stroke', 'percent_of_beneficiaries_with_atrial_fibrillation',
            'percent_of_beneficiaries_with_asthma', 'percent_of_beneficiaries_with_osteoporosis',
            'percent_of_beneficiaries_with_ra_oa', 'percent_of_beneficiaries_with_schizophrenia'
        ]].rename(columns={
            'percent_of_beneficiaries_with_chf': 'pct_chf',
            'percent_of_beneficiaries_with_copd': 'pct_copd',
            'percent_of_beneficiaries_with_chronic_kidney_disease': 'pct_ckd',
            'percent_of_beneficiaries_with_diabetes': 'pct_diabetes',
            'percent_of_beneficiaries_with_hypertension': 'pct_hypertension',
            'percent_of_beneficiaries_with_hyperlipidemia': 'pct_hyperlipidemia',
            'percent_of_beneficiaries_with_ihd': 'pct_ihd',
            'percent_of_beneficiaries_with_alzheimers': 'pct_alzheimers',
            'percent_of_beneficiaries_with_depression': 'pct_depression',
            'percent_of_beneficiaries_with_cancer': 'pct_cancer',
            'percent_of_beneficiaries_with_stroke': 'pct_stroke',
            'percent_of_beneficiaries_with_atrial_fibrillation': 'pct_atrial_fibrillation',
            'percent_of_beneficiaries_with_asthma': 'pct_asthma',
            'percent_of_beneficiaries_with_osteoporosis': 'pct_osteoporosis',
            'percent_of_beneficiaries_with_ra_oa': 'pct_ra_oa',
            'percent_of_beneficiaries_with_schizophrenia': 'pct_schizophrenia'
        }).drop_duplicates(subset=['provider_id'])
        dim_clinical.to_sql('dim_clinical_conditions', conn, if_exists='replace', index=False)
        
        # 6. Fact HHA Episodes & Financials
        fact_df = df[[
            'provider_id', 'total_episodes_non_lupa', 'distinct_beneficiaries_non_lupa',
            'episodes_per_beneficiary', 'average_number_of_total_visits_per_episode_non_lupa',
            'average_number_of_skilled_nursing_visits_per_episode_non_lupa',
            'average_number_of_pt_visits_per_episode_non_lupa',
            'average_number_of_ot_visits_per_episode_non_lupa',
            'average_number_of_st_visits_per_episode_non_lupa',
            'average_number_of_home_health_aide_visits_per_episode_non_lupa',
            'average_number_of_medical_social_visits_per_episode_non_lupa',
            'total_hha_charge_amount_non_lupa', 'total_hha_medicare_payment_amount_non_lupa',
            'total_hha_medicare_standard_payment_amount_non_lupa',
            'payment_to_charge_ratio', 'payment_per_episode', 'standard_payment_per_episode',
            'payment_variance', 'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
            'total_lupa_episodes', 'lupa_episode_rate',
            'total_hha_medicare_payment_amount_for_lupas', 'payment_per_lupa_episode'
        ]].rename(columns={
            'average_number_of_total_visits_per_episode_non_lupa': 'avg_total_visits_per_episode',
            'average_number_of_skilled_nursing_visits_per_episode_non_lupa': 'avg_skilled_nursing_visits',
            'average_number_of_pt_visits_per_episode_non_lupa': 'avg_pt_visits',
            'average_number_of_ot_visits_per_episode_non_lupa': 'avg_ot_visits',
            'average_number_of_st_visits_per_episode_non_lupa': 'avg_st_visits',
            'average_number_of_home_health_aide_visits_per_episode_non_lupa': 'avg_aide_visits',
            'average_number_of_medical_social_visits_per_episode_non_lupa': 'avg_medical_social_visits',
            'total_hha_charge_amount_non_lupa': 'total_charge_amount',
            'total_hha_medicare_payment_amount_non_lupa': 'total_medicare_payment_amount',
            'total_hha_medicare_standard_payment_amount_non_lupa': 'total_medicare_standard_payment_amount',
            'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa': 'outlier_payments_percent',
            'total_hha_medicare_payment_amount_for_lupas': 'total_medicare_payment_lupas'
        }).drop_duplicates(subset=['provider_id'])
        fact_df.to_sql('fact_hha_episodes_financials', conn, if_exists='replace', index=False)
        
        conn.commit()
        print("Star Schema successfully populated across 5 dimension/fact tables!")
        
    def query(self, sql: str, params=None) -> pd.DataFrame:
        """Executes SQL query and returns result as a Pandas DataFrame."""
        conn = self.connect()
        return pd.read_sql_query(sql, conn, params=params)

def build_data_warehouse(csv_path: str, db_path: str, schema_path: str) -> HealthcareDataWarehouse:
    """End-to-end pipeline runner for database building."""
    clean_df = clean_and_prepare_hha_data(csv_path)
    dw = HealthcareDataWarehouse(db_path, schema_path)
    dw.init_schema()
    dw.populate_star_schema(clean_df)
    return dw

if __name__ == '__main__':
    base_dir = '/Users/abhigurjar/Desktop/Projects_and_Folders/NEMI/us_healthcare_data_analytics'
    csv_p = os.path.join(base_dir, 'data/us_healthcare_hha_data.csv')
    db_p = os.path.join(base_dir, 'data/healthcare_warehouse.db')
    schema_p = os.path.join(base_dir, 'sql/01_create_schema.sql')
    
    dw = build_data_warehouse(csv_p, db_p, schema_p)
    test_df = dw.query("SELECT COUNT(*) AS total_providers FROM dim_provider;")
    print("Test Query Result:", test_df)
