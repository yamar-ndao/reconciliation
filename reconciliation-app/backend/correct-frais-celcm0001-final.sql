-- Correction finale des frais CELCM0001
-- Basé sur les données AgencySummary réelles

-- 1. Vérifier les données AgencySummary pour CELCM0001
SELECT 
    'AgencySummary' as source,
    date,
    agency,
    service,
    record_count as nombre_transactions,
    total_volume,
    record_count * 300.0 as frais_calcule
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date IN ('2025-07-01', '2025-07-02')
AND service = 'CASHINMTNCMPART'

UNION ALL

SELECT 
    'Operation' as source,
    date_operation as date,
    code_proprietaire as agency,
    service,
    NULL as nombre_transactions,
    NULL as total_volume,
    montant as frais_calcule
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART';

-- 2. Corriger le montant des frais pour 01/07/2025
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-01' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART'
AND montant = 3776700.0;

-- 3. Corriger le montant des frais pour 02/07/2025
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-02' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART'
AND montant = 3776700.0;

-- 4. Vérifier les corrections appliquées
SELECT 
    'Après correction' as status,
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    CASE 
        WHEN montant = 3776700.0 THEN '❌ Montant incorrect (avant correction)'
        WHEN montant = 31800.0 THEN '✅ Montant correct (31,800 FCFA)'
        ELSE '⚠️ Montant modifié mais à vérifier'
    END as statut
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART';

-- 5. Vérification finale avec calcul
SELECT 
    'Vérification finale' as type,
    o.date_operation,
    o.code_proprietaire,
    o.service,
    o.montant as montant_operation,
    a.record_count as nombre_transactions,
    a.record_count * 300.0 as montant_calcule,
    CASE 
        WHEN o.montant = a.record_count * 300.0 THEN '✅ Correct'
        ELSE '❌ Incorrect'
    END as validation
FROM operation o
LEFT JOIN agency_summary a ON 
    a.agency = o.code_proprietaire 
    AND a.date = DATE(o.date_operation)
    AND a.service = o.service
WHERE o.nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND o.type_operation = 'FRAIS_TRANSACTION'
AND o.service = 'CASHINMTNCMPART';

-- 6. Résumé des corrections
SELECT 
    'Résumé' as type,
    COUNT(*) as total_operations,
    SUM(CASE WHEN montant = 31800.0 THEN 1 ELSE 0 END) as operations_correctes,
    SUM(CASE WHEN montant = 3776700.0 THEN 1 ELSE 0 END) as operations_incorrectes,
    SUM(CASE WHEN montant NOT IN (31800.0, 3776700.0) THEN 1 ELSE 0 END) as operations_autres
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART'; 