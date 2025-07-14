# Test de la dynamique de "Transaction moyenne/Jour" pour tous les filtres du dashboard
Write-Host "=== TEST DE LA DYNAMIQUE TRANSACTION MOYENNE/JOUR ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/dashboard"

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

# 2. Test avec filtre de temps "Aujourd'hui"
Write-Host "`n2. Test avec filtre 'Aujourd'hui'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Aujourd'hui"
    }
    $metricsToday = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
    Format-Metrics $metricsToday "Filtre 'Aujourd'hui'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Aujourd'hui': $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test avec filtre de temps "Cette semaine"
Write-Host "`n3. Test avec filtre 'Cette semaine'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Cette semaine"
    }
    $metricsWeek = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
    Format-Metrics $metricsWeek "Filtre 'Cette semaine'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Cette semaine': $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test avec filtre de temps "Ce mois"
Write-Host "`n4. Test avec filtre 'Ce mois'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Ce mois"
    }
    $metricsMonth = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
    Format-Metrics $metricsMonth "Filtre 'Ce mois'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Ce mois': $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test avec filtre personnalisé (derniers 7 jours)
Write-Host "`n5. Test avec filtre personnalisé (derniers 7 jours)..." -ForegroundColor Yellow
try {
    $endDate = (Get-Date).ToString("yyyy-MM-dd")
    $startDate = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
    
    $params = @{
        timeFilter = "Personnalisé"
        startDate = $startDate
        endDate = $endDate
    }
    $metricsCustom = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
    Format-Metrics $metricsCustom "Filtre personnalisé (7 jours)"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre personnalisé: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test avec filtre d'agence
Write-Host "`n6. Test avec filtre d'agence..." -ForegroundColor Yellow
try {
    # Récupérer d'abord les options de filtre pour avoir une agence valide
    $filterOptions = Invoke-RestMethod -Uri "$baseUrl/filter-options" -Method GET
    
    if ($filterOptions.agencies -and $filterOptions.agencies.Count -gt 1) {
        $testAgency = $filterOptions.agencies[1] # Prendre la deuxième agence (la première est souvent "Toutes les agences")
        
        $params = @{
            agency = $testAgency
        }
        $metricsAgency = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
        Format-Metrics $metricsAgency "Filtre agence: $testAgency"
    } else {
        Write-Host "⚠️ Aucune agence disponible pour le test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors du test avec filtre d'agence: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test avec filtre de service
Write-Host "`n7. Test avec filtre de service..." -ForegroundColor Yellow
try {
    if ($filterOptions.services -and $filterOptions.services.Count -gt 1) {
        $testService = $filterOptions.services[1] # Prendre le deuxième service
        
        $params = @{
            service = $testService
        }
        $metricsService = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
        Format-Metrics $metricsService "Filtre service: $testService"
    } else {
        Write-Host "⚠️ Aucun service disponible pour le test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors du test avec filtre de service: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Test avec combinaison de filtres
Write-Host "`n8. Test avec combinaison de filtres..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Ce mois"
        service = $testService
    }
    $metricsCombined = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET -Body ($params | ConvertTo-Json) -ContentType "application/json"
    Format-Metrics $metricsCombined "Combinaison: Ce mois + $testService"
} catch {
    Write-Host "❌ Erreur lors du test avec combinaison de filtres: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Analyse de la dynamique
Write-Host "`n=== ANALYSE DE LA DYNAMIQUE ===" -ForegroundColor Green

# Collecter tous les résultats pour comparaison
$results = @()

if ($metricsAll) { $results += @{ Name = "Sans filtres"; Value = $metricsAll.averageTransactions } }
if ($metricsToday) { $results += @{ Name = "Aujourd'hui"; Value = $metricsToday.averageTransactions } }
if ($metricsWeek) { $results += @{ Name = "Cette semaine"; Value = $metricsWeek.averageTransactions } }
if ($metricsMonth) { $results += @{ Name = "Ce mois"; Value = $metricsMonth.averageTransactions } }
if ($metricsCustom) { $results += @{ Name = "7 jours"; Value = $metricsCustom.averageTransactions } }

Write-Host "`n📈 Comparaison des 'Transaction moyenne/Jour':" -ForegroundColor Cyan
foreach ($result in $results) {
    Write-Host "  $($result.Name): $($result.Value)" -ForegroundColor White
}

# Vérifier si les valeurs sont différentes (indiquant que c'est dynamique)
$uniqueValues = ($results | Select-Object -ExpandProperty Value | Sort-Object -Unique).Count
if ($uniqueValues -gt 1) {
    Write-Host "`n✅ SUCCÈS: La 'Transaction moyenne/Jour' est dynamique!" -ForegroundColor Green
    Write-Host "   Les valeurs varient selon les filtres appliqués." -ForegroundColor Green
} else {
    Write-Host "`n❌ PROBLÈME: La 'Transaction moyenne/Jour' n'est pas dynamique!" -ForegroundColor Red
    Write-Host "   Toutes les valeurs sont identiques." -ForegroundColor Red
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Green 