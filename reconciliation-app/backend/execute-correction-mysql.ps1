# Exécution des corrections SQL via MySQL
Write-Host "=== Exécution des corrections SQL CELCM0001 ===" -ForegroundColor Green

# Configuration de la base de données
$mysqlHost = "localhost"
$mysqlPort = "3306"
$mysqlDatabase = "top20"
$mysqlUser = "root"
$mysqlPassword = ""

Write-Host "`n1. Connexion à la base de données MySQL..." -ForegroundColor Yellow
Write-Host "  - Host: $mysqlHost" -ForegroundColor Cyan
Write-Host "  - Port: $mysqlPort" -ForegroundColor Cyan
Write-Host "  - Database: $mysqlDatabase" -ForegroundColor Cyan
Write-Host "  - User: $mysqlUser" -ForegroundColor Cyan

# 1. Vérifier l'état avant correction
Write-Host "`n2. État avant correction:" -ForegroundColor Yellow

$checkQuery = @"
SELECT 
    'Avant correction' as status,
    id,
    type_operation,
    montant,
    nom_bordereau,
    date_operation,
    service,
    code_proprietaire
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART';
"@

try {
    $checkResult = mysql -h $mysqlHost -P $mysqlPort -u $mysqlUser -p$mysqlPassword $mysqlDatabase -e "$checkQuery"
    Write-Host "Opérations trouvées avant correction:" -ForegroundColor Cyan
    Write-Host $checkResult -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vérifiez que MySQL est installé et accessible" -ForegroundColor Yellow
}

# 2. Exécuter les corrections
Write-Host "`n3. Exécution des corrections:" -ForegroundColor Yellow

# Correction pour 01/07/2025
$correction1Query = @"
UPDATE operation 
SET montant = 31800.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION' 
AND service = 'CASHINMTNCMPART'
AND montant = 3776700.0;
"@

try {
    Write-Host "Correction pour 01/07/2025..." -ForegroundColor Cyan
    $result1 = mysql -h $mysqlHost -P $mysqlPort -u $mysqlUser -p$mysqlPassword $mysqlDatabase -e "$correction1Query"
    Write-Host "✅ Correction 01/07/2025 appliquée" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la correction 01/07/2025: $($_.Exception.Message)" -ForegroundColor Red
}

# Correction pour 02/07/2025
$correction2Query = @"
UPDATE operation 
SET montant = 31800.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION' 
AND service = 'CASHINMTNCMPART'
AND montant = 3776700.0;
"@

try {
    Write-Host "Correction pour 02/07/2025..." -ForegroundColor Cyan
    $result2 = mysql -h $mysqlHost -P $mysqlPort -u $mysqlUser -p$mysqlPassword $mysqlDatabase -e "$correction2Query"
    Write-Host "✅ Correction 02/07/2025 appliquée" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la correction 02/07/2025: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier l'état après correction
Write-Host "`n4. État après correction:" -ForegroundColor Yellow

$verifyQuery = @"
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
        WHEN montant = 3776700.0 THEN '❌ Montant incorrect'
        WHEN montant = 31800.0 THEN '✅ Montant correct'
        ELSE '⚠️ Montant modifié'
    END as statut
FROM operation 
WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART';
"@

try {
    $verifyResult = mysql -h $mysqlHost -P $mysqlPort -u $mysqlUser -p$mysqlPassword $mysqlDatabase -e "$verifyQuery"
    Write-Host "Opérations après correction:" -ForegroundColor Cyan
    Write-Host $verifyResult -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Vérification avec AgencySummary
Write-Host "`n5. Vérification avec AgencySummary:" -ForegroundColor Yellow

$agencyQuery = @"
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
"@

try {
    $agencyResult = mysql -h $mysqlHost -P $mysqlPort -u $mysqlUser -p$mysqlPassword $mysqlDatabase -e "$agencyQuery"
    Write-Host "Vérification avec AgencySummary:" -ForegroundColor Cyan
    Write-Host $agencyResult -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la vérification AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Corrections terminées ===" -ForegroundColor Green 