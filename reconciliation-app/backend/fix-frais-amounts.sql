-- Script de correction des montants des opérations de frais pour le 15/06/2025
-- Exécutez ce script dans votre base de données

-- BETPW8064: 178,112 transactions × 500 FCFA = 89,056,000 FCFA
UPDATE operation 
SET montant = 89056000.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_BETPW8064' 
AND type_operation = 'FRAIS_TRANSACTION';

-- BMOCM8056: 852 transactions × 500 FCFA = 426,000 FCFA  
UPDATE operation 
SET montant = 426000.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_BMOCM8056' 
AND type_operation = 'FRAIS_TRANSACTION';

-- BTWIN8060: 290 transactions × 500 FCFA = 145,000 FCFA
UPDATE operation 
SET montant = 145000.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_BTWIN8060' 
AND type_operation = 'FRAIS_TRANSACTION';

-- MELBT8066: 5,887 transactions × 500 FCFA = 2,943,500 FCFA
UPDATE operation 
SET montant = 2943500.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_MELBT8066' 
AND type_operation = 'FRAIS_TRANSACTION';

-- SGBET8063: 841 transactions × 500 FCFA = 420,500 FCFA
UPDATE operation 
SET montant = 420500.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_SGBET8063' 
AND type_operation = 'FRAIS_TRANSACTION';

-- XBTCM8057: 94,941 transactions × 500 FCFA = 47,470,500 FCFA
UPDATE operation 
SET montant = 47470500.00 
WHERE nom_bordereau = 'FEES_SUMMARY_2025-06-15_XBTCM8057' 
AND type_operation = 'FRAIS_TRANSACTION';

-- Vérification des corrections
SELECT 
    nom_bordereau,
    agence,
    type_operation,
    montant,
    date_operation
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-06-15_%'
AND type_operation = 'FRAIS_TRANSACTION'
ORDER BY agence; 