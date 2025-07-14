# Test des métriques détaillées avec frais de transaction
Write-Host "=== Test des métriques détaillées avec frais de transaction ===" -ForegroundColor Green

# URL de base
$baseUrl = "http://localhost:8080/api/statistics"

# Test 1: Récupérer les métriques détaillées sans filtres
Write-Host "`n1. Métriques détaillées sans filtres..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
    Write-Host "Métriques détaillées récupérées avec succès:" -ForegroundColor Green
    Write-Host "  - Volume total: $($response.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
    Write-Host "  - Transactions totales: $($response.totalTransactions)" -ForegroundColor Cyan
    Write-Host "  - Clients totaux: $($response.totalClients)" -ForegroundColor Cyan
    Write-Host "  - Volume moyen/jour: $($response.averageVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
    Write-Host "  - Transactions moyennes/jour: $($response.averageTransactions)" -ForegroundColor Cyan
    Write-Host "  - Frais moyen/jour: $($response.averageFeesPerDay | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
    
    if ($response.averageFeesPerDay -ne $null) {
        Write-Host "  ✅ SUCCÈS: La métrique des frais de transaction moyen par jour est disponible" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ERREUR: La métrique des frais de transaction moyen par jour n'est pas disponible" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de la récupération des métriques détaillées: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Vérifier les données de frais de transaction
Write-Host "`n2. Vérification des données de frais de transaction..." -ForegroundColor Yellow
try {
    $feesResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction" -Method GET
    Write-Host "Nombre total de frais de transaction: $($feesResponse.Count)" -ForegroundColor Cyan
    
    if ($feesResponse.Count -gt 0) {
        Write-Host "Détails des frais de transaction:" -ForegroundColor Green
        foreach ($fee in $feesResponse) {
            Write-Host "  - ID: $($fee.id), Agence: $($fee.agence), Service: $($fee.service), Montant calculé: $($fee.montantCalcule), Date: $($fee.dateCalcul)" -ForegroundColor White
        }
        
        $totalFees = ($feesResponse | Measure-Object -Property montantCalcule -Sum).Sum
        Write-Host "Total des frais calculés: $($totalFees | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
        
        $distinctDates = $feesResponse | Select-Object -ExpandProperty dateCalcul | Sort-Object -Unique
        Write-Host "Nombre de jours avec des frais: $($distinctDates.Count)" -ForegroundColor Cyan
        Write-Host "Dates avec des frais: $($distinctDates -join ', ')" -ForegroundColor Cyan
        
        if ($distinctDates.Count -gt 0) {
            $averageFeesPerDay = $totalFees / $distinctDates.Count
            Write-Host "Frais moyen par jour (calculé): $($averageFeesPerDay | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Erreur lors de la vérification des frais de transaction: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Tester avec des filtres spécifiques
Write-Host "`n3. Test avec filtres spécifiques..." -ForegroundColor Yellow
try {
    # Test avec une agence spécifique
    $response = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?agency=XBTCM8057" -Method GET
    Write-Host "Frais moyen/jour pour XBTCM8057: $($response.averageFeesPerDay | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
    
    # Test avec un service spécifique
    $response = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?service=PAIEMENTMARCHAND_MTN_CM" -Method GET
    Write-Host "Frais moyen/jour pour PAIEMENTMARCHAND_MTN_CM: $($response.averageFeesPerDay | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor Cyan
} catch {
    Write-Host "Erreur lors du test avec filtres: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Tests terminés ===" -ForegroundColor Green 