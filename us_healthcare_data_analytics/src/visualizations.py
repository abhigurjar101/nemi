"""
Data Visualization Suite for Healthcare Analytics
Provides clean, aesthetic charts for EDA, Geospatial, Clinical, and Financial Analysis.
"""

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Set cohesive professional styling
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#CCCCCC'
plt.rcParams['axes.linewidth'] = 0.8

def plot_financial_distributions(df: pd.DataFrame, figsize=(15, 5)):
    """Plots distributions of Total Charges, Medicare Payments, and Standard Payments."""
    fig, axes = plt.subplots(1, 3, figsize=figsize)
    
    # 1. Total Charges
    sns.histplot(df['total_hha_charge_amount_non_lupa'] / 1e6, kde=True, ax=axes[0], color='#2b5c8f', bins=15)
    axes[0].set_title('Billed Charges Distribution ($M)', fontsize=12, fontweight='bold', pad=10)
    axes[0].set_xlabel('Total Charges ($ Millions)', fontsize=10)
    axes[0].set_ylabel('Provider Count', fontsize=10)
    
    # 2. Medicare Actual Payments
    sns.histplot(df['total_hha_medicare_payment_amount_non_lupa'] / 1e6, kde=True, ax=axes[1], color='#2a9d8f', bins=15)
    axes[1].set_title('Medicare Actual Payments ($M)', fontsize=12, fontweight='bold', pad=10)
    axes[1].set_xlabel('Medicare Payment ($ Millions)', fontsize=10)
    axes[1].set_ylabel('Provider Count', fontsize=10)
    
    # 3. Reimbursement per Episode
    sns.histplot(df['payment_per_episode'], kde=True, ax=axes[2], color='#e76f51', bins=15)
    axes[2].set_title('Payment Per Episode ($)', fontsize=12, fontweight='bold', pad=10)
    axes[2].set_xlabel('Reimbursement per Episode ($)', fontsize=10)
    axes[2].set_ylabel('Provider Count', fontsize=10)
    
    plt.tight_layout()
    return fig

def plot_state_comparison(state_df: pd.DataFrame, figsize=(14, 6)):
    """Bar chart comparing Total Medicare Payments and Avg Visits across US States."""
    fig, ax1 = plt.subplots(figsize=figsize)
    
    sorted_df = state_df.sort_values(by='total_medicare_payments', ascending=False)
    
    # Bar Plot for Total Payments
    color_bar = '#1f77b4'
    ax1.set_xlabel('US State', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Total Medicare Payments ($ Millions)', color=color_bar, fontsize=12, fontweight='bold')
    bars = ax1.bar(sorted_df['state'], sorted_df['total_medicare_payments'] / 1e6, color=color_bar, alpha=0.85, width=0.55, label='Medicare Payments ($M)')
    ax1.tick_params(axis='y', labelcolor=color_bar)
    
    # Value annotations on bars
    for bar in bars:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2.0, yval + 0.5, f"${yval:.1f}M", ha='center', va='bottom', fontsize=9, fontweight='bold')
        
    # Twin axis for Average Visits per Episode
    ax2 = ax1.twinx()
    color_line = '#e63946'
    ax2.set_ylabel('Avg Visits per Episode', color=color_line, fontsize=12, fontweight='bold')
    ax2.plot(sorted_df['state'], sorted_df['avg_visits'], color=color_line, marker='o', linewidth=2.5, markersize=8, label='Avg Visits/Episode')
    ax2.tick_params(axis='y', labelcolor=color_line)
    ax2.grid(False)
    
    plt.title('State-Level Medicare Payment Volume vs. Care Episode Visit Intensity', fontsize=14, fontweight='bold', pad=15)
    plt.tight_layout()
    return fig

def plot_clinical_correlation_matrix(df: pd.DataFrame, figsize=(12, 10)):
    """Heatmap showing correlation between Chronic Diseases and Patient HCC Risk Score."""
    clinical_cols = [
        'average_hcc_score', 'percent_of_beneficiaries_with_chf',
        'percent_of_beneficiaries_with_copd', 'percent_of_beneficiaries_with_chronic_kidney_disease',
        'percent_of_beneficiaries_with_diabetes', 'percent_of_beneficiaries_with_hypertension',
        'percent_of_beneficiaries_with_hyperlipidemia', 'percent_of_beneficiaries_with_ihd',
        'percent_of_beneficiaries_with_alzheimers', 'percent_of_beneficiaries_with_depression',
        'percent_of_beneficiaries_with_cancer', 'percent_of_beneficiaries_with_stroke',
        'percent_of_beneficiaries_with_atrial_fibrillation', 'percent_of_beneficiaries_with_asthma',
        'percent_of_beneficiaries_with_osteoporosis', 'percent_of_beneficiaries_with_schizophrenia'
    ]
    
    sub_df = df[[c for c in clinical_cols if c in df.columns]].copy()
    sub_df.columns = [c.replace('percent_of_beneficiaries_with_', '').upper() for c in sub_df.columns]
    
    corr = sub_df.corr()
    
    fig, ax = plt.subplots(figsize=figsize)
    mask = np.triu(np.ones_like(corr, dtype=bool))
    cmap = sns.diverging_palette(230, 20, as_cmap=True)
    
    sns.heatmap(corr, mask=mask, cmap=cmap, vmax=1.0, vmin=-0.5, center=0,
                square=True, linewidths=.5, cbar_kws={"shrink": .8}, annot=True, fmt='.2f', annot_kws={"size": 8}, ax=ax)
    
    plt.title('Clinical Comorbidities & HCC Risk Score Correlation Matrix', fontsize=14, fontweight='bold', pad=15)
    plt.tight_layout()
    return fig

def plot_discipline_service_mix(df: pd.DataFrame, figsize=(12, 6)):
    """Stacked bar plot of discipline utilization percentages across top states."""
    disc_cols = [
        'pct_skilled_nursing_visits', 'pct_pt_visits',
        'pct_ot_visits', 'pct_st_visits', 'pct_aide_visits'
    ]
    labels = ['Skilled Nursing', 'Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'Home Health Aide']
    colors = ['#4575b4', '#74add1', '#abd9e9', '#fdae61', '#f46d43']
    
    state_mix = df.groupby('state')[disc_cols].mean()
    # Normalize to 100%
    state_mix_norm = state_mix.div(state_mix.sum(axis=1), axis=0) * 100
    
    fig, ax = plt.subplots(figsize=figsize)
    state_mix_norm.plot(kind='bar', stacked=True, color=colors, ax=ax, width=0.6)
    
    plt.title('Clinical Service Discipline Mix by State (% of Total Visits)', fontsize=14, fontweight='bold', pad=15)
    plt.xlabel('State', fontsize=12, fontweight='bold')
    plt.ylabel('Percentage of Visits (%)', fontsize=12, fontweight='bold')
    plt.legend(labels, bbox_to_anchor=(1.02, 1), loc='upper left', frameon=True)
    plt.xticks(rotation=0)
    plt.tight_layout()
    return fig

def plot_outlier_vs_risk(df: pd.DataFrame, figsize=(10, 6)):
    """Scatter plot: Outlier Payment Percentage vs HCC Risk Acuity."""
    fig, ax = plt.subplots(figsize=figsize)
    
    scatter = sns.scatterplot(
        data=df,
        x='average_hcc_score',
        y='outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
        hue='hcc_risk_tier',
        size='total_episodes_non_lupa',
        sizes=(40, 400),
        palette={'Tier 1: Low Risk (<1.80)': '#2a9d8f', 'Tier 2: Moderate Risk (1.80-2.40)': '#e9c46a', 'Tier 3: High Acuity (>2.40)': '#e76f51'},
        alpha=0.85,
        edgecolor='black',
        linewidth=0.5,
        ax=ax
    )
    
    # Add trend line
    sns.regplot(
        data=df,
        x='average_hcc_score',
        y='outlier_payments_as_a_percent_of_medicare_payment_amount_non_lupa',
        scatter=False,
        ax=ax,
        color='#264653',
        line_kws={'linestyle': '--', 'linewidth': 1.8}
    )
    
    plt.title('Medicare Outlier Payment Percentage vs. Patient HCC Risk Acuity', fontsize=14, fontweight='bold', pad=15)
    plt.xlabel('Average Patient HCC Risk Score', fontsize=12, fontweight='bold')
    plt.ylabel('Outlier Payment (% of Total Medicare Payment)', fontsize=12, fontweight='bold')
    plt.legend(bbox_to_anchor=(1.02, 1), loc='upper left', frameon=True)
    plt.tight_layout()
    return fig
