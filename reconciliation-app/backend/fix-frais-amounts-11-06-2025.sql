-- Correction des montants des frais pour le 11/06/2025
-- Basé sur les données agency_summary

-- BETPW8064: 178112 transactions * 500 = 89,056,000 FCFA
UPDATE operation 
SET montant = 89056000.0
WHERE type_operation = 'FRAIS_TRANSACTION' 
  AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_BETPW8064'
  AND montant = 500.0;

-- BMOCM8056: 852 transactions * 500 = 426,000 FCFA
UPDATE operation 
SET montant = 426000.0
WHERE type_operation = 'FRAIS_TRANSACTION' 
  AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_BMOCM8056'
  AND montant = 500.0;

-- BTWIN8060: Pas de données agency_summary pour cette date, garder 500 FCFA
-- UPDATE operation 
-- SET montant = XXX
-- WHERE type_operation = 'FRAIS_TRANSACTION' 
--   AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_BTWIN8060'
--   AND montant = 500.0;

-- MELBT8066: Pas de données agency_summary pour cette date, garder 500 FCFA
-- UPDATE operation 
-- SET montant = XXX
-- WHERE type_operation = 'FRAIS_TRANSACTION' 
--   AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_MELBT8066'
--   AND montant = 500.0;

-- SGBET8063: Pas de données agency_summary pour cette date, garder 500 FCFA
-- UPDATE operation 
-- SET montant = XXX
-- WHERE type_operation = 'FRAIS_TRANSACTION' 
--   AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_SGBET8063'
--   AND montant = 500.0;

-- XBTCM8057: 94941 transactions * 500 = 47,470,500 FCFA
UPDATE operation 
SET montant = 47470500.0
WHERE type_operation = 'FRAIS_TRANSACTION' 
  AND nom_bordereau = 'FEES_SUMMARY_2025-06-11_XBTCM8057'
  AND montant = 500.0;

-- Vérification des mises à jour
SELECT 
    id,
    nom_bordereau,
    montant,
    CASE 
        WHEN nom_bordereau = 'FEES_SUMMARY_2025-06-11_BETPW8064' THEN 'BETPW8064: 178112 * 500 = 89,056,000'
        WHEN nom_bordereau = 'FEES_SUMMARY_2025-06-11_BMOCM8056' THEN 'BMOCM8056: 852 * 500 = 426,000'
        WHEN nom_bordereau = 'FEES_SUMMARY_2025-06-11_XBTCM8057' THEN 'XBTCM8057: 94941 * 500 = 47,470,500'
        ELSE 'Autres agences: 500 (pas de données agency_summary)'
    END as calcul
FROM operation 
WHERE type_operation = 'FRAIS_TRANSACTION' 
  AND nom_bordereau LIKE 'FEES_SUMMARY_2025-06-11_%'
ORDER BY nom_bordereau; 