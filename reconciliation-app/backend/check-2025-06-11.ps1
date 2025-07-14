# Vérifier les données pour le 11/06/2025
$baseUrl = "http://localhost:8080"

Write-Host "=== Vérification des données pour 2025-06-11 ===" -ForegroundColor Green

# 1. Vérifier les agency summaries pour cette date
Write-Host "1. Agency summaries pour 2025-06-11:" -ForegroundColor Yellow
try {
    $summaries = Invoke-RestMethod -Uri "$baseUrl/api/agency-summary" -Method GET
    $summariesForDate = $summaries | Where-Object { $_.date -eq "2025-06-11" }
    
    if ($summariesForDate.Count -gt 0) {
        foreach ($summary in $summariesForDate) {
            Write-Host "  ✅ Date: $($summary.date) - Agence: $($summary.agency) - Service: $($summary.service) - Transactions: $($summary.recordCount)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ Aucune donnée trouvée pour 2025-06-11" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des summaries: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Vérifier les frais de transaction pour cette date
Write-Host "2. Frais de transaction pour 2025-06-11:" -ForegroundColor Yellow
try {
    $frais = Invoke-RestMethod -Uri "$baseUrl/api/frais-transaction" -Method GET
    foreach ($f in $frais) {
        Write-Host "  Agence: $($f.agence) - Service: $($f.service) - Type: $($f.typeCalcul) - Montant: $($f.montantFrais)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Tester le calcul de frais pour une agence spécifique
Write-Host "3. Test de calcul de frais pour BETPW8064 le 11/06/2025:" -ForegroundColor Yellow
try {
    $testUrl = "$baseUrl/api/frais-transaction/test-calcul?service=PAIEMENTMARCHAND_MTN_CM&agence=BETPW8064&date=2025-06-11"
    $testResult = Invoke-RestMethod -Uri $testUrl -Method GET
    
    Write-Host "Résultat du test:" -ForegroundColor Cyan
    Write-Host ($testResult | ConvertTo-Json -Depth 5) -ForegroundColor White
    
    if ($testResult.success) {
        if ($testResult.agencySummaryTrouve) {
            Write-Host "✅ AgencySummary trouvé!" -ForegroundColor Green
            Write-Host "Montant calculé: $($testResult.montantFraisCalcule) FCFA" -ForegroundColor Green
        } else {
            Write-Host "❌ AgencySummary non trouvé" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Erreur dans le test: $($testResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Vérification terminée ===" -ForegroundColor Green 