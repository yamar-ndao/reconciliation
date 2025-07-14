# Script de debug pour tester la recherche AgencySummary
Write-Host "=== DEBUG AGENCY SUMMARY SEARCH ===" -ForegroundColor Yellow

# Paramètres de test (ceux utilisés dans les logs)
$testDate = "2025-07-01"
$testAgency = "CELCM0001"
$testService = "CASHINMTNCMPART"

Write-Host "Paramètres de test:" -ForegroundColor Cyan
Write-Host "  Date: $testDate" -ForegroundColor White
Write-Host "  Agence: $testAgency" -ForegroundColor White
Write-Host "  Service: $testService" -ForegroundColor White

# Test 1: Récupérer tous les AgencySummary
Write-Host "`n=== Test 1: Tous les AgencySummary ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    Write-Host "Nombre total d'AgencySummary: $($response.Count)" -ForegroundColor White
    
    # Filtrer pour CELCM0001
    $celcmSummaries = $response | Where-Object { $_.agency -eq $testAgency }
    Write-Host "AgencySummary pour CELCM0001: $($celcmSummaries.Count)" -ForegroundColor White
    
    foreach ($summary in $celcmSummaries) {
        Write-Host "  - ID: $($summary.id), Date: $($summary.date), Service: $($summary.service), RecordCount: $($summary.recordCount)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Erreur lors de la récupération des AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Recherche exacte par date, agence et service
Write-Host "`n=== Test 2: Recherche exacte ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $exactMatch = $response | Where-Object { 
        $_.date -eq $testDate -and 
        $_.agency -eq $testAgency -and 
        $_.service -eq $testService 
    }
    
    if ($exactMatch) {
        Write-Host "✅ Correspondance exacte trouvée:" -ForegroundColor Green
        Write-Host "  ID: $($exactMatch.id)" -ForegroundColor White
        Write-Host "  RecordCount: $($exactMatch.recordCount)" -ForegroundColor White
        Write-Host "  TotalVolume: $($exactMatch.totalVolume)" -ForegroundColor White
    } else {
        Write-Host "❌ Aucune correspondance exacte trouvée" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de la recherche exacte: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Recherche par date et agence seulement
Write-Host "`n=== Test 3: Recherche par date et agence ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $dateAgencyMatch = $response | Where-Object { 
        $_.date -eq $testDate -and 
        $_.agency -eq $testAgency 
    }
    
    if ($dateAgencyMatch) {
        Write-Host "✅ Correspondance par date et agence trouvée:" -ForegroundColor Green
        foreach ($match in $dateAgencyMatch) {
            Write-Host "  - Service: $($match.service), RecordCount: $($match.recordCount)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Aucune correspondance par date et agence trouvée" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors de la recherche par date et agence: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Vérifier les formats de date
Write-Host "`n=== Test 4: Vérification des formats ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $celcmSummaries = $response | Where-Object { $_.agency -eq $testAgency }
    
    Write-Host "Formats de date pour CELCM0001:" -ForegroundColor Cyan
    foreach ($summary in $celcmSummaries) {
        Write-Host "  - Date: '$($summary.date)' (Type: $($summary.date.GetType().Name))" -ForegroundColor Gray
    }
} catch {
    Write-Host "Erreur lors de la vérification des formats: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DU DEBUG ===" -ForegroundColor Yellow 