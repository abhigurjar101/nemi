-- ============================================================================
-- CMS HOME HEALTH AGENCY (HHA) BASIC SQL ANALYST QUERIES
-- Designed for Level 1: Basic Data Analyst Fundamentals
-- ============================================================================

-- Query B1: Basic SELECT, WHERE, and ORDER BY
-- Question: Find all home health agencies in California with more than 500 episodes
SELECT 
    provider_id,
    agency_name,
    city,
    state,
    total_episodes_non_lupa,
    total_medicare_payment_amount
FROM dim_provider p
JOIN fact_hha_episodes_financials f ON p.provider_id = f.provider_id
WHERE p.state = 'CA' AND f.total_episodes_non_lupa > 500
ORDER BY f.total_episodes_non_lupa DESC;

-- Query B2: Basic Aggregation with GROUP BY and HAVING
-- Question: Calculate total episodes, total Medicare payments, and average payment per agency by State
-- Filter only states with at least 3 agencies
SELECT 
    p.state,
    COUNT(p.provider_id) AS agency_count,
    SUM(f.total_episodes_non_lupa) AS total_episodes,
    SUM(f.total_medicare_payment_amount) AS total_medicare_payments,
    AVG(f.payment_per_episode) AS avg_payment_per_episode
FROM dim_provider p
JOIN fact_hha_episodes_financials f ON p.provider_id = f.provider_id
GROUP BY p.state
HAVING COUNT(p.provider_id) >= 3
ORDER BY total_medicare_payments DESC;

-- Query B3: Basic JOIN across Provider, Demographics, and Clinical Conditions
-- Question: Retrieve agency details along with average age, dual-eligible rate, and patient HCC risk
SELECT 
    p.provider_id,
    p.agency_name,
    p.state,
    d.average_age,
    d.pct_dual_eligible,
    c.average_hcc_score,
    c.hcc_risk_tier
FROM dim_provider p
JOIN dim_patient_demographics d ON p.provider_id = d.provider_id
JOIN dim_clinical_conditions c ON p.provider_id = c.provider_id
WHERE c.average_hcc_score > 2.50
ORDER BY c.average_hcc_score DESC
LIMIT 10;
