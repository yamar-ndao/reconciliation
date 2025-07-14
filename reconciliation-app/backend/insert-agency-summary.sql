-- Insertion des données AgencySummary manquantes pour CELCM0001
-- Ce script doit être exécuté dans votre base de données MySQL

-- 1. Vérifier les données existantes
SELECT 
    'Données existantes' as status,
    date,
    agency,
    service,
    record_count,
    total_volume
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND service = 'CASHINMTNCMPART'
ORDER BY date;

-- 2. Insérer les données manquantes pour les dates futures
INSERT INTO agency_summary (date, agency, service, record_count, total_volume)
VALUES 
('2025-07-04', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-05', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-06', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-07', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-08', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-09', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-10', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255)
ON DUPLICATE KEY UPDATE
    record_count = VALUES(record_count),
    total_volume = VALUES(total_volume);

-- 3. Vérifier les données après insertion
SELECT 
    'Après insertion' as status,
    date,
    agency,
    service,
    record_count,
    total_volume,
    record_count * 300.0 as frais_calcule
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND service = 'CASHINMTNCMPART'
ORDER BY date;

-- 4. Vérifier les opérations de frais récentes
SELECT 
    'Opérations de frais récentes' as type,
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire,
    CASE 
        WHEN montant = 31800.0 THEN '✅ Correct'
        WHEN montant = 3776700.0 THEN '❌ Incorrect (ancien)'
        ELSE '⚠️ Autre montant'
    END as statut
FROM operation 
WHERE code_proprietaire = 'CELCM0001' 
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART'
ORDER BY date_operation DESC;

-- 5. Résumé des corrections
SELECT 
    'Résumé' as type,
    COUNT(*) as total_agency_summary,
    SUM(CASE WHEN date >= '2025-07-04' THEN 1 ELSE 0 END) as nouvelles_donnees,
    SUM(CASE WHEN date < '2025-07-04' THEN 1 ELSE 0 END) as donnees_existantes
FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND service = 'CASHINMTNCMPART'; 