-- Correction immédiate des frais CELCM0001 du 01/07/2025
-- Basé sur les données agency_summary : 106 transactions × 300 FCFA = 31,800 FCFA

-- 1. Vérifier les données AgencySummary
SELECT 
    date,
    agency,
    service,
    record_count,
    total_volume
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date = '2025-07-01'
ORDER BY service;

-- 2. Vérifier le frais configuré
SELECT 
    id,
    service,
    agence,
    montant_frais,
    type_calcul,
    description,
    actif
FROM frais_transaction 
WHERE agence = 'CELCM0001' 
AND service = 'CASHINMTNCMPART';

-- 3. Vérifier l'opération de frais existante
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    solde_avant,
    solde_apres
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 4. Corriger le montant des frais
UPDATE operation 
SET montant = 31800.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;

-- 5. Recalculer les soldes
-- Récupérer le solde avant de l'opération de frais
UPDATE operation 
SET solde_apres = solde_avant - 31800.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 6. Vérifier la correction
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    solde_avant,
    solde_apres
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 7. Vérifier toutes les opérations CELCM0001 du 01/07/2025
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    solde_avant,
    solde_apres
FROM operation 
WHERE code_proprietaire = 'CELCM0001'
AND DATE(date_operation) = '2025-07-01'
ORDER BY date_operation, type_operation;

-- 8. Calcul de vérification
-- AgencySummary: 106 transactions pour CASHINMTNCMPART
-- Frais configuré: 300 FCFA par transaction
-- Calcul: 300 × 106 = 31,800 FCFA ✅ 