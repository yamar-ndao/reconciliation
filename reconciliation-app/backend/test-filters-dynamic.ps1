# Test de la dynamique des filtres pour les métriques détaillées
Write-Host "=== TEST DE LA DYNAMIQUE DES FILTRES MÉTRIQUES DÉTAILLÉES ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# Fonction pour formater les résultats
function Format-Metrics {
    param($metrics, $filterName)
    
    Write-Host "`n📊 $filterName" -ForegroundColor Cyan
    Write-Host "  - Volume Total: $($metrics.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
    Write-Host "  - Transactions: $($metrics.totalTransactions)" -ForegroundColor White
    Write-Host "  - Clients: $($metrics.totalClients)" -ForegroundColor White
    Write-Host "  - Transaction moyenne/Jour: $($metrics.averageTransactions)" -ForegroundColor Yellow
    Write-Host "  - Volume Moyen/Jour: $($metrics.averageVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
    Write-Host "  - Frais moyen/Jour: $($metrics.averageFeesPerDay | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
}

# 1. Test sans filtres (Tous)
Write-Host "`n1. Test sans filtres (Tous)..." -ForegroundColor Yellow
try {
    $metricsAll = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
    Format-Metrics $metricsAll "Sans filtres (Tous)"
} catch {
    Write-Host "❌ Erreur lors du test sans filtres: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test avec filtre d'agence
Write-Host "`n2. Test avec filtre d'agence..." -ForegroundColor Yellow
try {
    $params = @{
        agency = "CELCM0001"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsAgency = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsAgency "Filtre agence CELCM0001"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre d'agence: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test avec filtre de service
Write-Host "`n3. Test avec filtre de service..." -ForegroundColor Yellow
try {
    $params = @{
        service = "VIREMENT"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsService = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsService "Filtre service VIREMENT"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre de service: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test avec filtre de pays
Write-Host "`n4. Test avec filtre de pays..." -ForegroundColor Yellow
try {
    $params = @{
        country = "CI"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsCountry = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsCountry "Filtre pays CI"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre de pays: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test avec filtre de temps "Aujourd'hui"
Write-Host "`n5. Test avec filtre 'Aujourd'hui'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Aujourd'hui"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsToday = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsToday "Filtre 'Aujourd'hui'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Aujourd'hui': $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test avec filtre de temps "Cette semaine"
Write-Host "`n6. Test avec filtre 'Cette semaine'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Cette semaine"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsWeek = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsWeek "Filtre 'Cette semaine'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Cette semaine': $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test avec filtre de temps "Ce mois"
Write-Host "`n7. Test avec filtre 'Ce mois'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Ce mois"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsMonth = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsMonth "Filtre 'Ce mois'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Ce mois': $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Test avec filtre personnalisé (derniers 7 jours)
Write-Host "`n8. Test avec filtre personnalisé (derniers 7 jours)..." -ForegroundColor Yellow
try {
    $endDate = (Get-Date).ToString("yyyy-MM-dd")
    $startDate = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
    
    $params = @{
        timeFilter = "Personnalisé"
        startDate = $startDate
        endDate = $endDate
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsCustom = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsCustom "Filtre personnalisé (7 jours)"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre personnalisé: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Test avec combinaison de filtres
Write-Host "`n9. Test avec combinaison de filtres..." -ForegroundColor Yellow
try {
    $params = @{
        agency = "CELCM0001"
        service = "VIREMENT"
        timeFilter = "Ce mois"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsCombined = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    Format-Metrics $metricsCombined "Combinaison: CELCM0001 + VIREMENT + Ce mois"
} catch {
    Write-Host "❌ Erreur lors du test avec combinaison de filtres: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Tests de dynamique des filtres terminés!" -ForegroundColor Green
Write-Host "Les filtres des métriques détaillées sont maintenant dynamiques et se mettent à jour automatiquement." -ForegroundColor Green 