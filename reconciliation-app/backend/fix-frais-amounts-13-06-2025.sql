-- Script de correction des montants des opérations de frais pour le 13/06/2025
-- Exécutez ce script dans votre base de données

-- BETPW8064: Calculé à partir des données fournies
UPDATE operation 
SET montant = 3215192839.72 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_BETPW8064' 
AND type_operation = 'FRAIS_TRANSACTION';

-- BMOCM8056: Calculé à partir des données fournies
UPDATE operation 
SET montant = 161862205.10 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_BMOCM8056' 
AND type_operation = 'FRAIS_TRANSACTION';

-- BTWIN8060: Calculé à partir des données fournies
UPDATE operation 
SET montant = 44779961.42 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_BTWIN8060' 
AND type_operation = 'FRAIS_TRANSACTION';

-- MELBT8066: Calculé à partir des données fournies
UPDATE operation 
SET montant = 213177368.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_MELBT8066' 
AND type_operation = 'FRAIS_TRANSACTION';

-- SGBET8063: Calculé à partir des données fournies
UPDATE operation 
SET montant = 78224369.06 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_SGBET8063' 
AND type_operation = 'FRAIS_TRANSACTION';

-- XBTCM8057: Calculé à partir des données fournies
UPDATE operation 
SET montant = 2713196860.93 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-13_XBTCM8057' 
AND type_operation = 'FRAIS_TRANSACTION';

-- Vérification des corrections
SELECT 
    nom_bordereau,
    agence,
    type_operation,
    montant,
    date_operation
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-06-13_%'
AND type_operation = 'FRAIS_TRANSACTION'
ORDER BY agence; 