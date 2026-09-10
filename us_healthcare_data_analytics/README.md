# 🏥 US Healthcare Medicare Home Health Agency (HHA) Analytics & Data Science Project

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Database: SQLite](https://img.shields.io/badge/database-SQLite-003B57.svg)](https://www.sqlite.org/)
[![Analytics: Star Schema](https://img.shields.io/badge/schema-Dimensional%20Star-success.svg)](#)
[![Jupyter Notebook](https://img.shields.io/badge/notebook-Jupyter-orange.svg)](us_healthcare_analytics.ipynb)

A comprehensive, enterprise-grade data analytics and data science project analyzing **CMS (Centers for Medicare & Medicaid Services) Home Health Agency (HHA)** utilization, reimbursement mechanics, clinical comorbidity burden, and provider practice patterns.

---

## 📂 Project Structure

```
us_healthcare_data_analytics/
├── data/
│   ├── us_healthcare_hha_data.csv        # Cleaned raw dataset (82 providers, 49 features)
│   └── healthcare_warehouse.db           # SQLite Star Schema Data Warehouse
├── sql/
│   ├── 01_create_schema.sql             # DDL for Star Schema & performance indexes
│   └── 02_analyst_queries.sql           # Production SQL BI queries (CTEs, Window functions)
├── src/
│   ├── data_cleaning.py                 # Imputation, suppression handling & feature engineering
│   ├── db_manager.py                    # ETL loader & SQLite warehouse connection manager
│   ├── sql_analysis.py                  # Python interface for SQL analytical queries
│   ├── visualizations.py                # Publication-quality plotting suite (Seaborn & Matplotlib)
│   └── ml_models.py                     # Statistics, OLS regression, K-Means clustering & Isolation Forest
├── notebooks/
│   └── us_healthcare_analytics_master.ipynb # Master compiled Jupyter Notebook
├── us_healthcare_analytics.ipynb        # Root interactive Jupyter Notebook
├── build_and_execute_notebook.py        # Automated notebook builder & executor
├── main.py                              # Command-line analytics pipeline runner
├── requirements.txt                     # Python dependencies
└── README.md                            # Comprehensive project documentation
```

---

## 🏗️ Dimensional Data Architecture (Star Schema)

The dataset is modeled into a 3NF / Star Schema relational structure within SQLite:

```
                  ┌───────────────────────────────┐
                  │          dim_provider         │
                  ├───────────────────────────────┤
                  │ provider_id (PK)              │
                  │ agency_name, address, city... │
                  └───────────────┬───────────────┘
                                  │ 1
                                  │
                                  │ *
┌───────────────────────────┐     │     ┌─────────────────────────────┐
│       dim_geography       │     │     │   dim_patient_demographics  │
├───────────────────────────┤     │     ├─────────────────────────────┤
│ zip_code (PK), city,      │     ├─────┤ provider_id (PK/FK)         │
│ state, region             │     │     │ avg_age, pct_dual_eligible  │
└───────────────────────────┘     │     └─────────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │ fact_hha_episodes_financials  │
                  ├───────────────────────────────┤
                  │ fact_id (PK), provider_id(FK) │
                  │ total_episodes_non_lupa       │
                  │ total_medicare_payment_amount │
                  │ payment_per_episode           │
                  │ avg_visits_per_episode        │
                  │ outlier_payments_percent      │
                  │ lupa_episode_rate             │
                  └───────────────┬───────────────┘
                                  │
                                  │ 1
                                  │
                  ┌───────────────┴───────────────┐
                  │    dim_clinical_conditions    │
                  ├───────────────────────────────┤
                  │ provider_id (PK/FK)           │
                  │ average_hcc_score             │
                  │ hcc_risk_tier                 │
                  │ pct_chf, pct_copd, pct_ckd... │
                  └───────────────────────────────┘
```

---

## 📊 Analytical Scope & Capabilities

### 1. Advanced SQL Business Intelligence
* **State Market Share & Financial Ratios:** Measures national revenue concentration, charge markups, and episode reimbursement rates using window aggregations.
* **Top Provider Benchmarking:** National and state-level rankings utilizing `DENSE_RANK()`, `NTILE(4)` revenue quartiles, and `PERCENT_RANK()` reimbursement percentiles.
* **Clinical Acuity Stratification (HCC Tiers):** Evaluates financial margins across Low Acuity ($HCC < 1.8$), Moderate Acuity ($1.8 \le HCC \le 2.4$), and High Acuity ($HCC > 2.4$) patient populations.
* **Discipline & Service Mix Analysis:** Identifies operating models (*Therapy-Intensive*, *Nursing-Centric*, *Balanced Multi-Disciplinary*).
* **LUPA & Outlier Compliance Screening:** Flags agencies with outlier payments $>5.0\%$ or elevated LUPA rates for audit readiness.
* **Health Equity & Dual-Eligibility Analysis:** Quantifies clinical disparities in Medicaid-Medicare dual-eligible patient cohorts.

### 2. Statistical Inference & Hypothesis Testing
* **Welch's Two-Sample t-Test:** Tests differences in episode reimbursement between high-acuity and low-acuity agencies.
* **Kruskal-Wallis Test ($p < 0.001$):** Demonstrates statistically significant geographic regional variation in visit delivery intensity.
* **Pearson & Spearman Correlation:** Measures relationships between socioeconomic vulnerability (dual eligibility) and chronic illness burden.

### 3. Predictive Machine Learning & Provider Segmentation
* **OLS Multi-Variable Linear Regression ($R^2 = 0.980$):** Explains $98\%$ of variance in Total Medicare Payments driven by non-LUPA episode volume, visit intensity, and patient risk.
* **K-Means Provider Archetype Segmentation:** Groups agencies into 3 distinct practice patterns:
  1. *Archetype A: High-Therapy Rehabilitation* ($>45\%$ PT/OT/ST visits)
  2. *Archetype B: High-Acuity Complex Outlier* (High HCC, elevated outlier payments)
  3. *Archetype C: Standard Routine Nursing* (Balanced multi-visit nursing model)
* **Principal Component Analysis (PCA):** 2D visual projection of provider operational clusters.
* **Isolation Forest Anomaly Detection:** Identifies statistically aberrant billing patterns for CMS audit prioritization.

---

## 🚀 How to Run the Project

### Option A: Interactive Jupyter Notebook
Launch the master notebook in VS Code, JupyterLab, or Jupyter Notebook:
```bash
jupyter notebook us_healthcare_analytics.ipynb
```

### Option B: Command-Line Pipeline Runner
Execute the full data warehouse build, SQL reports, statistical tests, and ML models in one step:
```bash
python3 main.py
```

### Option C: Regenerate & Execute Notebook Programmatically
```bash
python3 build_and_execute_notebook.py
```

---

## 💡 Executive Insights & Strategic Takeaways

1. **LUPA Threshold Protection:** Agencies with LUPA rates exceeding $8\%$ experience steep revenue erosion. Implementing visit schedule tracking systems prevents premature episode drop-offs.
2. **Wage Index Regional Variance:** Urban Northeast and West Coast agencies receive significant wage index premiums over standard Medicare rates, while Midwest/Southern agencies face discounts.
3. **Audit Preparedness for Outliers:** Agencies with outlier payments exceeding $5.0\%$ must ensure documentation rigorously demonstrates medical necessity for extended visit frequencies.
