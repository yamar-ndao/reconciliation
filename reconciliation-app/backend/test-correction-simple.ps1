# Test simple des corrections des frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test simple des corrections des frais ===" -ForegroundColor Green

# Attendre que l'application soit prête
Write-Host "Attente du démarrage de l'application..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 1. Test de base - vérifier que l'API répond
try {
    Write-Host "`n1. Test de connectivité API..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "$baseUrl/agency-summary" -Method GET -TimeoutSec 10
    Write-Host "✅ API accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ API non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "L'application n'est peut-être pas encore démarrée." -ForegroundColor Yellow
    exit 1
}

# 2. Vérifier les données AgencySummary pour CELCM0001
Write-Host "`n2. Vérification des données AgencySummary..." -ForegroundColor Yellow
try {
    $agencySummaryResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary?agence=CELCM0001&date=2025-07-01" -Method GET
    $agencyData = $agencySummaryResponse.Content | ConvertFrom-Json
    
    Write-Host "AgencySummary trouvés:" -ForegroundColor Cyan
    foreach ($summary in $agencyData) {
        Write-Host "  - Service: $($summary.service), Transactions: $($summary.recordCount), Volume: $($summary.totalVolume) FCFA" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier le frais configuré
Write-Host "`n3. Vérification du frais configuré..." -ForegroundColor Yellow
try {
    $fraisResponse = Invoke-WebRequest -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET
    $fraisData = $fraisResponse.Content | ConvertFrom-Json
    
    Write-Host "Frais configuré:" -ForegroundColor Cyan
    Write-Host "  - Montant: $($fraisData.montantFrais) FCFA" -ForegroundColor Cyan
    Write-Host "  - Type: $($fraisData.typeCalcul)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la récupération du frais: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test du calcul avec les données réelles
Write-Host "`n4. Test du calcul avec données réelles..." -ForegroundColor Yellow
try {
    $testParams = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        date = "2025-07-01"
    }
    
    $testResponse = Invoke-WebRequest -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"
    $testData = $testResponse.Content | ConvertFrom-Json
    
    Write-Host "Résultat du test:" -ForegroundColor Cyan
    Write-Host "  - Nombre de transactions: $($testData.nombreTransactions)" -ForegroundColor Cyan
    Write-Host "  - Montant calculé: $($testData.montantFraisCalcule) FCFA" -ForegroundColor Cyan
    Write-Host "  - Type de calcul: $($testData.typeCalcul)" -ForegroundColor Cyan
    
    # Vérifier si le calcul est correct
    $montantAttendu = 31800
    if ($testData.montantFraisCalcule -eq $montantAttendu) {
        Write-Host "  ✅ Calcul correct! Montant attendu: $montantAttendu FCFA" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
        Write-Host "    - Montant calculé: $($testData.montantFraisCalcule) FCFA" -ForegroundColor Red
        Write-Host "    - Montant attendu: $montantAttendu FCFA" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors du test de calcul: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 