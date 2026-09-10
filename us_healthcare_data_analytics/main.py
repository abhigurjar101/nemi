"""
US Healthcare Medicare Home Health Agency Analytics CLI Runner
Executes the ETL pipeline, initializes SQLite Warehouse, and outputs BI summaries.
"""

import os
import sys
from src.db_manager import build_data_warehouse
from src.sql_analysis import HealthcareSQLAnalytics
from src.data_cleaning import clean_and_prepare_hha_data
from src.ml_models import HealthcareStatisticalAnalysis, HealthcarePredictiveModeling, ProviderSegmentation, FraudAnomalyDetection

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'data/us_healthcare_hha_data.csv')
    db_path = os.path.join(base_dir, 'data/healthcare_warehouse.db')
    schema_path = os.path.join(base_dir, 'sql/01_create_schema.sql')
    
    print("=" * 80)
    print("🏥 US HEALTHCARE MEDICARE HHA ANALYTICS PIPELINE")
    print("=" * 80)
    
    # 1. Build Data Warehouse
    print("\n[Step 1/5] Building SQLite Star Schema Data Warehouse...")
    dw = build_data_warehouse(csv_path, db_path, schema_path)
    
    # 2. Run SQL Analytics
    print("\n[Step 2/5] Running Advanced SQL BI Queries...")
    sql_analytics = HealthcareSQLAnalytics(dw)
    
    state_df = sql_analytics.get_state_market_summary()
    print("\n--- Top States by Medicare Payments ---")
    print(state_df[['state', 'total_agencies', 'total_episodes', 'total_medicare_payments', 'reimbursement_per_episode', 'charge_to_payment_markup']].head())
    
    top_providers = sql_analytics.get_top_providers_ranked(top_n=5)
    print("\n--- Top 5 Ranked Providers Nationally ---")
    print(top_providers[['national_revenue_rank', 'agency_name', 'state', 'total_medicare_payment_amount', 'hcc_risk_tier']])
    
    risk_df = sql_analytics.get_clinical_risk_stratification()
    print("\n--- Clinical HCC Risk Stratification ---")
    print(risk_df[['hcc_risk_tier', 'provider_count', 'group_avg_hcc', 'avg_medicare_payment_per_episode', 'avg_visits_per_episode']])
    
    # 3. Statistical Hypothesis Testing
    print("\n[Step 3/5] Performing Inferential Statistical Hypothesis Tests...")
    df = clean_and_prepare_hha_data(csv_path)
    hyp_results = HealthcareStatisticalAnalysis.run_hypothesis_tests(df)
    for test_key, res in hyp_results.items():
        print(f"  • {res['test_name']}: Statistically Significant = {res['statistically_significant']} (p = {res['p_value']:.4e})")
        
    # 4. Machine Learning & Predictive Modeling
    print("\n[Step 4/5] Training Regression & Provider Segmentation Models...")
    pred_mod = HealthcarePredictiveModeling(df)
    reg_res = pred_mod.train_medicare_payment_regressor()
    print(f"  • Multi-Variable Regression R² Score: {reg_res['r2_score']:.4f} (MAE: ${reg_res['mae']:,.2f})")
    
    seg_mod = ProviderSegmentation(df, n_clusters=3)
    seg_res = seg_mod.fit_clusters()
    print("  • Provider Practice Archetypes Discovered:")
    for cid, label in seg_res['archetype_labels'].items():
        print(f"    - Cluster {cid}: {label}")
        
    # 5. Outlier & Fraud Detection
    print("\n[Step 5/5] Running Isolation Forest Compliance Screening...")
    fraud_mod = FraudAnomalyDetection(df, contamination=0.08)
    _, flagged = fraud_mod.detect_anomalies()
    print(f"  • Flagged {len(flagged)} agencies with aberrant billing/visit patterns for audit review.")
    
    print("\n" + "=" * 80)
    print("✅ Full Pipeline Execution Completed Successfully!")
    print(f"Master Notebook Available at: {os.path.join(base_dir, 'us_healthcare_analytics.ipynb')}")
    print("=" * 80)

if __name__ == '__main__':
    main()
