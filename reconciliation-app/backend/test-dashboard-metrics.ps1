# Test des métriques du dashboard
Write-Host "=== Test des métriques du dashboard ===" -ForegroundColor Green

# URL de base
$baseUrl = "http://localhost:8080/api/statistics"

# Test 1: Récupérer les métriques du dashboard
Write-Host "`n1. Récupération des métriques du dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/dashboard-metrics" -Method GET
    Write-Host "Métriques récupérées avec succès:" -ForegroundColor Green
    Write-Host "  - Total réconciliations: $($response.totalReconciliations)" -ForegroundColor Cyan
    Write-Host "  - Fichiers traités: $($response.totalFiles)" -ForegroundColor Cyan
    Write-Host "  - Dernière activité: $($response.lastActivity)" -ForegroundColor Cyan
    Write-Host "  - Réconciliations aujourd'hui: $($response.todayReconciliations)" -ForegroundColor Cyan
    
    # Vérifier que totalReconciliations = totalFiles
    if ($response.totalReconciliations -eq $response.totalFiles) {
        Write-Host "  ✅ SUCCÈS: Le nombre de fichiers traités correspond au nombre d'enregistrements du résumé" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ERREUR: Le nombre de fichiers traités ne correspond pas au nombre d'enregistrements du résumé" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de la récupération des métriques: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Vérifier les données brutes dans agency_summary
Write-Host "`n2. Vérification des données dans agency_summary..." -ForegroundColor Yellow
try {
    $agencySummaryResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    Write-Host "Nombre total d'enregistrements dans agency_summary: $($agencySummaryResponse.Count)" -ForegroundColor Cyan
    
    # Compter les agences distinctes pour comparaison
    $distinctAgencies = $agencySummaryResponse | Select-Object -ExpandProperty agency | Sort-Object -Unique
    Write-Host "Nombre d'agences distinctes: $($distinctAgencies.Count)" -ForegroundColor Cyan
    
    Write-Host "  ✅ Le nombre de fichiers traités correspond maintenant au nombre total d'enregistrements" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la vérification des données agency_summary: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier les options de filtres
Write-Host "`n3. Vérification des options de filtres..." -ForegroundColor Yellow
try {
    $filterOptions = Invoke-RestMethod -Uri "$baseUrl/filter-options" -Method GET
    Write-Host "Options de filtres récupérées:" -ForegroundColor Green
    Write-Host "  - Agences: $($filterOptions.agencies.Count) options" -ForegroundColor Cyan
    Write-Host "  - Services: $($filterOptions.services.Count) options" -ForegroundColor Cyan
    Write-Host "  - Pays: $($filterOptions.countries.Count) options" -ForegroundColor Cyan
    Write-Host "  - Filtres temporels: $($filterOptions.timeFilters.Count) options" -ForegroundColor Cyan
} catch {
    Write-Host "Erreur lors de la récupération des options de filtres: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Tests terminés ===" -ForegroundColor Green 