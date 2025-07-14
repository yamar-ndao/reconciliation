# Test du calcul des frais fixes pour CELCM0001
# Basé sur les données fournies par l'utilisateur
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du calcul des frais fixes pour CELCM0001 ===" -ForegroundColor Green

# Données fournies par l'utilisateur
Write-Host "`n📊 Données fournies:" -ForegroundColor Yellow
Write-Host "  - Date: 01/07/2025" -ForegroundColor Cyan
Write-Host "  - Agence: CELCM0001" -ForegroundColor Cyan
Write-Host "  - Service: CASHINMTNCMPART" -ForegroundColor Cyan
Write-Host "  - Frais configuré: 300 FCFA par transaction" -ForegroundColor Cyan
Write-Host "  - Opération TOTAL_CASHIN: 12,589,255.00 FCFA" -ForegroundColor Cyan
Write-Host "  - Opération FRAIS_TRANSACTION: 3,776,700.00 FCFA (incorrect)" -ForegroundColor Cyan

# 1. Vérifier les données AgencySummary pour CELCM0001
Write-Host "`n1. Vérification des données AgencySummary:" -ForegroundColor Yellow

try {
    $agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?agence=CELCM0001`&date=2025-07-01" -Method GET
    
    Write-Host "AgencySummary trouvés:" -ForegroundColor Cyan
    foreach ($summary in $agencySummaryResponse) {
        Write-Host "  - Service: $($summary.service)" -ForegroundColor Green
        Write-Host "    * Nombre de transactions: $($summary.recordCount)" -ForegroundColor Green
        Write-Host "    * Volume total: $($summary.totalVolume) FCFA" -ForegroundColor Green
    }
    
    # Chercher l'AgencySummary pour CASHINMTNCMPART
    $targetSummary = $agencySummaryResponse | Where-Object { $_.service -eq "CASHINMTNCMPART" }
    
    if ($targetSummary) {
        $nombreTransactions = $targetSummary.recordCount
        $volumeTotal = $targetSummary.totalVolume
        Write-Host "`n✅ Données trouvées pour CASHINMTNCMPART:" -ForegroundColor Green
        Write-Host "  - Nombre de transactions: $nombreTransactions" -ForegroundColor Green
        Write-Host "  - Volume total: $volumeTotal FCFA" -ForegroundColor Green
    } else {
        Write-Host "❌ Aucune donnée AgencySummary trouvée pour CASHINMTNCMPART" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des données AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Vérifier le frais configuré
Write-Host "`n2. Vérification du frais configuré:" -ForegroundColor Yellow

try {
    $fraisResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART`&agence=CELCM0001" -Method GET
    
    Write-Host "Frais configuré:" -ForegroundColor Cyan
    Write-Host "  - Service: $($fraisResponse.service)" -ForegroundColor Green
    Write-Host "  - Agence: $($fraisResponse.agence)" -ForegroundColor Green
    Write-Host "  - Type de calcul: $($fraisResponse.typeCalcul)" -ForegroundColor Green
    Write-Host "  - Montant paramétré: $($fraisResponse.montantFrais) FCFA" -ForegroundColor Green
    Write-Host "  - Description: $($fraisResponse.description)" -ForegroundColor Green
    
    $montantFrais = $fraisResponse.montantFrais
    
} catch {
    Write-Host "❌ Erreur lors de la récupération du frais: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Calcul manuel du montant des frais
Write-Host "`n3. Calcul manuel des frais:" -ForegroundColor Yellow

$montantCalcule = $montantFrais * $nombreTransactions

Write-Host "Formule: Montant paramétré × Nombre de transactions" -ForegroundColor Cyan
Write-Host "Calcul: $montantFrais FCFA × $nombreTransactions transactions = $montantCalcule FCFA" -ForegroundColor Green

# 4. Comparaison avec le montant actuel
Write-Host "`n4. Comparaison avec le montant actuel:" -ForegroundColor Yellow

$montantActuel = 3776700.0
$difference = $montantActuel - $montantCalcule

Write-Host "  - Montant actuel en base: $montantActuel FCFA" -ForegroundColor Cyan
Write-Host "  - Montant calculé correct: $montantCalcule FCFA" -ForegroundColor Green
Write-Host "  - Différence: $difference FCFA" -ForegroundColor $(if ($difference -eq 0) { "Green" } else { "Red" })

if ($difference -eq 0) {
    Write-Host "  ✅ Le montant est correct!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Le montant est incorrect!" -ForegroundColor Red
    Write-Host "  📝 Correction nécessaire: $montantCalcule FCFA" -ForegroundColor Yellow
}

# 5. Test via l'API de calcul
Write-Host "`n5. Test via l'API de calcul:" -ForegroundColor Yellow

try {
    $testParams = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        date = "2025-07-01"
    }
    
    $testResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body ($testParams | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat de l'API:" -ForegroundColor Cyan
    Write-Host "  - Frais trouvé: $($testResponse.fraisTrouve)" -ForegroundColor Green
    Write-Host "  - AgencySummary trouvé: $($testResponse.agencySummaryTrouve)" -ForegroundColor Green
    Write-Host "  - Nombre de transactions: $($testResponse.nombreTransactions)" -ForegroundColor Green
    Write-Host "  - Type de calcul: $($testResponse.typeCalcul)" -ForegroundColor Green
    Write-Host "  - Formule: $($testResponse.formule)" -ForegroundColor Green
    Write-Host "  - Montant calculé: $($testResponse.montantFraisCalcule) FCFA" -ForegroundColor Green
    
    # Vérifier si le calcul de l'API correspond au calcul manuel
    if ($testResponse.montantFraisCalcule -eq $montantCalcule) {
        Write-Host "  ✅ Calcul de l'API correct!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Calcul de l'API incorrect!" -ForegroundColor Red
        Write-Host "    - Calcul manuel: $montantCalcule FCFA" -ForegroundColor Red
        Write-Host "    - Calcul API: $($testResponse.montantFraisCalcule) FCFA" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors du test API: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Résumé et recommandations
Write-Host "`n6. Résumé et recommandations:" -ForegroundColor Yellow

Write-Host "📋 Résumé du calcul des frais fixes:" -ForegroundColor Cyan
Write-Host "  - Agence: CELCM0001" -ForegroundColor White
Write-Host "  - Service: CASHINMTNCMPART" -ForegroundColor White
Write-Host "  - Date: 01/07/2025" -ForegroundColor White
Write-Host "  - Nombre de transactions (AgencySummary): $nombreTransactions" -ForegroundColor White
Write-Host "  - Montant frais paramétré: $montantFrais FCFA" -ForegroundColor White
Write-Host "  - Montant frais calculé: $montantCalcule FCFA" -ForegroundColor White
Write-Host "  - Montant frais actuel: $montantActuel FCFA" -ForegroundColor White

if ($montantCalcule -ne $montantActuel) {
    Write-Host "`n🔧 Action recommandée:" -ForegroundColor Yellow
    Write-Host "  Exécuter le script SQL de correction:" -ForegroundColor Cyan
    Write-Host "  UPDATE operation SET montant = $montantCalcule" -ForegroundColor White
    Write-Host "  WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'" -ForegroundColor White
    Write-Host "  AND type_operation = 'FRAIS_TRANSACTION';" -ForegroundColor White
}

Write-Host "`n✅ Test terminé!" -ForegroundColor Green 