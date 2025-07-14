-- Correction du montant des frais pour CELCM0001 du 02/07/2025
-- Basé sur les données AgencySummary

-- 1. Vérifier les données AgencySummary pour CELCM0001 du 02/07/2025
SELECT 
    date,
    agency,
    service,
    record_count,
    total_volume
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date = '2025-07-02'
AND service = 'CASHINMTNCMPART';

-- 2. Vérifier l'opération de frais existante
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 3. Calculer le montant correct
-- Montant correct = record_count × 300 FCFA
-- Si record_count = 106, alors montant correct = 106 × 300 = 31,800 FCFA

-- 4. Corriger le montant des frais
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-02' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;

-- 5. Vérifier la correction
SELECT 
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    CASE 
        WHEN montant = 3776700.0 THEN '❌ Montant incorrect (avant correction)'
        WHEN montant = (SELECT record_count FROM agency_summary 
                       WHERE agency = 'CELCM0001' 
                       AND date = '2025-07-02' 
                       AND service = 'CASHINMTNCMPART') * 300.0 THEN '✅ Montant correct'
        ELSE '⚠️ Montant modifié mais à vérifier'
    END as statut
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 6. Vérification finale avec les données AgencySummary
SELECT 
    'AgencySummary' as source,
    agency,
    service,
    record_count as nombre_transactions,
    total_volume,
    record_count * 300.0 as frais_calcule
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date = '2025-07-02'
AND service = 'CASHINMTNCMPART'

UNION ALL

SELECT 
    'Operation' as source,
    code_proprietaire as agency,
    service,
    NULL as nombre_transactions,
    NULL as total_volume,
    montant as frais_calcule
FROM operation 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION';

-- 7. Calcul de vérification
-- Si l'AgencySummary indique 106 transactions:
-- 106 × 300 = 31,800 FCFA ✅
-- 
-- Si l'AgencySummary indique un autre nombre:
-- nombre_transactions × 300 = montant_correct 