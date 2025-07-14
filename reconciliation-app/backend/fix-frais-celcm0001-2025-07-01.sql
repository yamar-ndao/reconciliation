-- Correction du montant des frais pour CELCM0001 du 01/07/2025
-- Basé sur les données agency_summary : 106 transactions × 300 FCFA = 31,800 FCFA

-- Vérifier l'opération de frais existante
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- Corriger le montant des frais
UPDATE operation 
SET montant = 31800.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;

-- Vérifier la correction
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- Vérifier les données AgencySummary pour confirmation
SELECT 
    date,
    agency,
    service,
    record_count,
    total_volume
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date = '2025-07-01'
AND service = 'CASHINMTNCMPART';

-- Calcul de vérification
-- 106 transactions × 300 FCFA = 31,800 FCFA ✅ 