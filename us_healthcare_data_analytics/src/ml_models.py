"""
Statistical Inference, Predictive Machine Learning & Provider Segmentation Module
"""

import pandas as pd
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib.pyplot as plt
import seaborn as sns

class HealthcareStatisticalAnalysis:
    @staticmethod
    def run_hypothesis_tests(df: pd.DataFrame) -> dict:
        """Executes inferential statistical tests."""
        results = {}
        
        # Test 1: Welch's t-test: Payment per Episode between High HCC (>2.2) vs Low HCC (<=2.2)
        high_risk = df[df['average_hcc_score'] > 2.2]['payment_per_episode'].dropna()
        low_risk = df[df['average_hcc_score'] <= 2.2]['payment_per_episode'].dropna()
        t_stat, p_val_t = stats.ttest_ind(high_risk, low_risk, equal_var=False)
        results['t_test_hcc_payment'] = {
            'test_name': "Welch's Two-Sample Independent t-test (High vs Low HCC Payment/Episode)",
            'high_risk_mean': high_risk.mean(),
            'low_risk_mean': low_risk.mean(),
            't_statistic': float(t_stat),
            'p_value': float(p_val_t),
            'statistically_significant': bool(p_val_t < 0.05)
        }
        
        # Test 2: Kruskal-Wallis Test: Total Visits across Census Regions
        regions = [group['average_number_of_total_visits_per_episode_non_lupa'].values for _, group in df.groupby('region') if len(group) >= 2]
        kw_stat, p_val_kw = stats.kruskal(*regions)
        results['kruskal_wallis_region_visits'] = {
            'test_name': "Kruskal-Wallis H-test (Visit Intensity across Geographic Regions)",
            'h_statistic': float(kw_stat),
            'p_value': float(p_val_kw),
            'statistically_significant': bool(p_val_kw < 0.05)
        }
        
        # Test 3: Correlation between Dual Eligibility Rate and HCC Risk Score
        valid_data = df[['pct_dual_eligible', 'average_hcc_score']].dropna()
        r_pearson, p_pearson = stats.pearsonr(valid_data['pct_dual_eligible'], valid_data['average_hcc_score'])
        results['correlation_dual_hcc'] = {
            'test_name': "Pearson Correlation (Dual Eligibility Rate vs Patient HCC Risk)",
            'pearson_r': float(r_pearson),
            'p_value': float(p_pearson),
            'statistically_significant': bool(p_pearson < 0.05)
        }
        
        return results

class HealthcarePredictiveModeling:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        
    def train_medicare_payment_regressor(self):
        """Builds multi-variable linear regression model for Medicare Payments."""
        feature_cols = [
            'total_episodes_non_lupa',
            'average_number_of_total_visits_per_episode_non_lupa',
            'average_hcc_score',
            'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
            'pct_dual_eligible',
            'average_age'
        ]
        
        X = self.df[feature_cols].fillna(0)
        y = self.df['total_hha_medicare_payment_amount_non_lupa']
        
        model = LinearRegression()
        model.fit(X, y)
        y_pred = model.predict(X)
        
        r2 = r2_score(y, y_pred)
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        
        coef_df = pd.DataFrame({
            'Feature': feature_cols,
            'Coefficient': model.coef_,
            'Abs_Impact': np.abs(model.coef_)
        }).sort_values(by='Abs_Impact', ascending=False)
        
        return {
            'model': model,
            'features': feature_cols,
            'r2_score': r2,
            'mae': mae,
            'rmse': rmse,
            'intercept': model.intercept_,
            'coefficients': coef_df,
            'predictions': y_pred
        }

class ProviderSegmentation:
    def __init__(self, df: pd.DataFrame, n_clusters: int = 3):
        self.df = df.copy()
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()
        self.features = [
            'total_episodes_non_lupa',
            'average_number_of_total_visits_per_episode_non_lupa',
            'pct_skilled_nursing_visits',
            'pct_therapy_visits_combined',
            'pct_aide_visits',
            'payment_per_episode',
            'average_hcc_score',
            'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
            'pct_dual_eligible'
        ]
        
    def fit_clusters(self):
        """Fits KMeans clustering and labels provider operational archetypes."""
        X = self.df[self.features].fillna(0)
        X_scaled = self.scaler.fit_transform(X)
        
        kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        self.df['cluster_id'] = clusters
        
        # PCA for 2D visualization
        pca = PCA(n_components=2, random_state=42)
        pca_coords = pca.fit_transform(X_scaled)
        self.df['pca_1'] = pca_coords[:, 0]
        self.df['pca_2'] = pca_coords[:, 1]
        
        # Cluster Profile Summary
        cluster_profile = self.df.groupby('cluster_id')[self.features].mean()
        
        # Archetype labeling based on centroid characteristics
        archetype_labels = {}
        for c in range(self.n_clusters):
            row = cluster_profile.loc[c]
            if row['pct_therapy_visits_combined'] >= 45:
                archetype_labels[c] = 'Archetype A: High-Therapy Rehabilitation'
            elif row['outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa'] >= 4.0 or row['average_hcc_score'] >= 2.4:
                archetype_labels[c] = 'Archetype B: High-Acuity Complex Outlier'
            else:
                archetype_labels[c] = 'Archetype C: Standard Volume Nursing Care'
                
        self.df['provider_archetype'] = self.df['cluster_id'].map(archetype_labels)
        
        return {
            'clustered_df': self.df,
            'cluster_profile': cluster_profile,
            'archetype_labels': archetype_labels,
            'pca_explained_variance': pca.explained_variance_ratio_
        }

class FraudAnomalyDetection:
    def __init__(self, df: pd.DataFrame, contamination: float = 0.08):
        self.df = df.copy()
        self.contamination = contamination
        
    def detect_anomalies(self):
        """Identifies billing/utilization anomalies using Isolation Forest."""
        features = [
            'payment_to_charge_ratio',
            'charge_to_payment_markup',
            'payment_per_episode',
            'outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
            'average_number_of_total_visits_per_episode_non_lupa',
            'lupa_episode_rate'
        ]
        
        X = self.df[features].fillna(0)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        iso = IsolationForest(contamination=self.contamination, random_state=42)
        preds = iso.fit_predict(X_scaled)
        
        self.df['is_anomaly'] = np.where(preds == -1, 'Potential Audit Flag', 'Normal')
        self.df['anomaly_score'] = iso.decision_function(X_scaled)
        
        flagged = self.df[self.df['is_anomaly'] == 'Potential Audit Flag'].sort_values(by='anomaly_score')
        return self.df, flagged
