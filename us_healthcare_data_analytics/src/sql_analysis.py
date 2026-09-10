"""
SQL Analytics Runner & Business Intelligence Reports
Executes analyst queries against the healthcare SQLite data warehouse.
"""

import pandas as pd
from src.db_manager import HealthcareDataWarehouse

class HealthcareSQLAnalytics:
    def __init__(self, dw: HealthcareDataWarehouse):
        self.dw = dw

    def get_state_market_summary(self) -> pd.DataFrame:
        """Query 1: State-Level Aggregates and National Market Share."""
        query = """
        WITH StateAggregates AS (
            SELECT 
                p.state,
                COUNT(DISTINCT p.provider_id) AS total_agencies,
                SUM(f.total_episodes_non_lupa) AS total_episodes,
                SUM(f.distinct_beneficiaries_non_lupa) AS total_patients,
                SUM(f.total_medicare_payment_amount) AS total_medicare_payments,
                SUM(f.total_charge_amount) AS total_charges_billed,
                AVG(f.avg_total_visits_per_episode) AS avg_visits_per_episode,
                AVG(c.average_hcc_score) AS avg_patient_risk_hcc,
                AVG(d.pct_dual_eligible) AS avg_dual_eligible_pct
            FROM dim_provider p
            JOIN fact_hha_episodes_financials f ON p.provider_id = f.provider_id
            JOIN dim_clinical_conditions c ON p.provider_id = c.provider_id
            JOIN dim_patient_demographics d ON p.provider_id = d.provider_id
            GROUP BY p.state
        )
        SELECT 
            state,
            total_agencies,
            total_episodes,
            total_patients,
            total_medicare_payments,
            total_charges_billed,
            ROUND(total_medicare_payments * 1.0 / total_episodes, 2) AS reimbursement_per_episode,
            ROUND(total_charges_billed * 1.0 / total_medicare_payments, 2) AS charge_to_payment_markup,
            ROUND(avg_visits_per_episode, 1) AS avg_visits,
            ROUND(avg_patient_risk_hcc, 2) AS avg_hcc_score,
            ROUND(avg_dual_eligible_pct, 1) AS avg_dual_eligible_pct,
            ROUND(100.0 * total_medicare_payments / SUM(total_medicare_payments) OVER(), 2) AS national_payment_share_pct
        FROM StateAggregates
        ORDER BY total_medicare_payments DESC;
        """
        return self.dw.query(query)

    def get_top_providers_ranked(self, top_n: int = 15) -> pd.DataFrame:
        """Query 2: Top Providers ranked nationally and within state with quartiles."""
        query = f"""
        WITH ProviderMetrics AS (
            SELECT 
                p.provider_id,
                p.agency_name,
                p.city,
                p.state,
                f.total_episodes_non_lupa,
                f.total_medicare_payment_amount,
                f.payment_per_episode,
                c.average_hcc_score,
                c.hcc_risk_tier,
                DENSE_RANK() OVER (ORDER BY f.total_medicare_payment_amount DESC) AS national_revenue_rank,
                DENSE_RANK() OVER (PARTITION BY p.state ORDER BY f.total_medicare_payment_amount DESC) AS state_revenue_rank,
                NTILE(4) OVER (ORDER BY f.total_medicare_payment_amount DESC) AS revenue_quartile,
                PERCENT_RANK() OVER (ORDER BY f.payment_per_episode) AS reimbursement_percentile
            FROM dim_provider p
            JOIN fact_hha_episodes_financials f ON p.provider_id = f.provider_id
            JOIN dim_clinical_conditions c ON p.provider_id = c.provider_id
        )
        SELECT 
            national_revenue_rank,
            agency_name,
            city,
            state,
            state_revenue_rank,
            total_episodes_non_lupa AS episodes,
            total_medicare_payment_amount,
            payment_per_episode,
            average_hcc_score,
            hcc_risk_tier,
            revenue_quartile,
            ROUND(reimbursement_percentile * 100, 1) AS reimbursement_pctile
        FROM ProviderMetrics
        WHERE national_revenue_rank <= {top_n}
        ORDER BY national_revenue_rank ASC;
        """
        return self.dw.query(query)

    def get_clinical_risk_stratification(self) -> pd.DataFrame:
        """Query 3: Acuity Stratification (HCC Tiers) and Financial Efficiency."""
        query = """
        SELECT 
            c.hcc_risk_tier,
            COUNT(p.provider_id) AS provider_count,
            SUM(f.total_episodes_non_lupa) AS total_episodes,
            ROUND(AVG(c.average_hcc_score), 3) AS group_avg_hcc,
            ROUND(AVG(f.payment_per_episode), 2) AS avg_medicare_payment_per_episode,
            ROUND(AVG(f.standard_payment_per_episode), 2) AS avg_std_payment_per_episode,
            ROUND(AVG(f.payment_variance), 2) AS avg_wage_index_variance,
            ROUND(AVG(f.avg_total_visits_per_episode), 1) AS avg_visits_per_episode,
            ROUND(AVG(f.avg_skilled_nursing_visits), 1) AS avg_nursing_visits,
            ROUND(AVG(f.avg_pt_visits), 1) AS avg_pt_visits,
            ROUND(AVG(c.pct_chf), 1) AS avg_chf_pct,
            ROUND(AVG(c.pct_copd), 1) AS avg_copd_pct,
            ROUND(AVG(c.pct_diabetes), 1) AS avg_diabetes_pct
        FROM dim_clinical_conditions c
        JOIN fact_hha_episodes_financials f ON c.provider_id = f.provider_id
        JOIN dim_provider p ON c.provider_id = p.provider_id
        GROUP BY c.hcc_risk_tier
        ORDER BY group_avg_hcc DESC;
        """
        return self.dw.query(query)

    def get_service_discipline_mix(self) -> pd.DataFrame:
        """Query 4: Discipline & Service Mix Analysis by State."""
        query = """
        WITH ServiceShare AS (
            SELECT 
                p.state,
                p.agency_name,
                f.avg_total_visits_per_episode AS total_visits,
                f.avg_skilled_nursing_visits AS nursing_visits,
                f.avg_pt_visits AS pt_visits,
                f.avg_ot_visits AS ot_visits,
                f.avg_st_visits AS st_visits,
                f.avg_aide_visits AS aide_visits,
                f.avg_medical_social_visits AS social_visits,
                ROUND(100.0 * f.avg_skilled_nursing_visits / NULLIF(f.avg_total_visits_per_episode, 0), 1) AS pct_nursing,
                ROUND(100.0 * (f.avg_pt_visits + f.avg_ot_visits + f.avg_st_visits) / NULLIF(f.avg_total_visits_per_episode, 0), 1) AS pct_all_therapy,
                ROUND(100.0 * f.avg_aide_visits / NULLIF(f.avg_total_visits_per_episode, 0), 1) AS pct_aide
            FROM fact_hha_episodes_financials f
            JOIN dim_provider p ON f.provider_id = p.provider_id
        )
        SELECT 
            state,
            COUNT(*) AS total_providers,
            ROUND(AVG(total_visits), 1) AS avg_total_visits,
            ROUND(AVG(pct_nursing), 1) AS avg_pct_nursing,
            ROUND(AVG(pct_all_therapy), 1) AS avg_pct_therapy,
            ROUND(AVG(pct_aide), 1) AS avg_pct_aide,
            CASE 
                WHEN AVG(pct_all_therapy) >= 40.0 THEN 'Therapy-Intensive Model'
                WHEN AVG(pct_nursing) >= 60.0 THEN 'Skilled Nursing-Centric Model'
                ELSE 'Balanced Multi-Disciplinary'
            END AS dominant_practice_model
        FROM ServiceShare
        GROUP BY state
        ORDER BY avg_pct_therapy DESC;
        """
        return self.dw.query(query)

    def get_lupa_and_outlier_risks(self) -> pd.DataFrame:
        """Query 5: Outlier Payments and LUPA Rates for Compliance Audit."""
        query = """
        SELECT 
            p.provider_id,
            p.agency_name,
            p.state,
            f.total_episodes_non_lupa AS non_lupa_episodes,
            f.total_lupa_episodes AS lupa_episodes,
            ROUND(f.lupa_episode_rate, 2) AS lupa_rate_percent,
            f.total_medicare_payment_lupas AS lupa_medicare_payments,
            ROUND(f.payment_per_lupa_episode, 2) AS payment_per_lupa,
            f.outlier_payments_percent,
            CASE 
                WHEN f.outlier_payments_percent >= 5.0 THEN 'High Outlier Risk (Audit Trigger)'
                WHEN f.outlier_payments_percent >= 2.0 THEN 'Moderate Outlier Utilization'
                ELSE 'Low / Standard'
            END AS audit_risk_tier
        FROM fact_hha_episodes_financials f
        JOIN dim_provider p ON f.provider_id = p.provider_id
        ORDER BY f.outlier_payments_percent DESC, f.lupa_episode_rate DESC;
        """
        return self.dw.query(query)

    def get_health_equity_analysis(self) -> pd.DataFrame:
        """Query 6: Dual-Eligible Cohort Analysis on Health Equity."""
        query = """
        WITH EquityCohorts AS (
            SELECT 
                CASE 
                    WHEN d.pct_dual_eligible >= 60.0 THEN 'High Dual Eligible (>60%)'
                    WHEN d.pct_dual_eligible >= 30.0 THEN 'Moderate Dual Eligible (30-60%)'
                    ELSE 'Low Dual Eligible (<30%)'
                END AS equity_cohort,
                d.pct_dual_eligible,
                f.payment_per_episode,
                f.avg_total_visits_per_episode,
                f.avg_aide_visits,
                c.average_hcc_score,
                c.pct_depression,
                c.pct_diabetes,
                c.pct_chf
            FROM dim_patient_demographics d
            JOIN fact_hha_episodes_financials f ON d.provider_id = f.provider_id
            JOIN dim_clinical_conditions c ON d.provider_id = c.provider_id
        )
        SELECT 
            equity_cohort,
            COUNT(*) AS agency_count,
            ROUND(AVG(pct_dual_eligible), 1) AS avg_dual_pct,
            ROUND(AVG(average_hcc_score), 2) AS avg_hcc_acuity,
            ROUND(AVG(avg_total_visits_per_episode), 1) AS avg_visits,
            ROUND(AVG(avg_aide_visits), 2) AS avg_aide_visits_per_episode,
            ROUND(AVG(payment_per_episode), 2) AS avg_payment_per_episode,
            ROUND(AVG(pct_diabetes), 1) AS avg_diabetes_pct,
            ROUND(AVG(pct_depression), 1) AS avg_depression_pct,
            ROUND(AVG(pct_chf), 1) AS avg_chf_pct
        FROM EquityCohorts
        GROUP BY equity_cohort
        ORDER BY avg_dual_pct DESC;
        """
        return self.dw.query(query)
