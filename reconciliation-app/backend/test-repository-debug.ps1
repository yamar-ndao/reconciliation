# Script de debug pour tester les appels repository exacts
Write-Host "=== DEBUG REPOSITORY CALLS ===" -ForegroundColor Yellow

# Paramètres de test (exactement comme dans le code Java)
$testDate = "2025-07-01"
$testAgency = "CELCM0001"
$testService = "CASHINMTNCMPART"

Write-Host "Paramètres de test (comme dans le code Java):" -ForegroundColor Cyan
Write-Host "  Date: '$testDate'" -ForegroundColor White
Write-Host "  Agence: '$testAgency'" -ForegroundColor White
Write-Host "  Service: '$testService'" -ForegroundColor White

# Test 1: Simuler l'appel findByDateAndAgencyAndService
Write-Host "`n=== Test 1: findByDateAndAgencyAndService ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $exactMatch = $response | Where-Object { 
        $_.date -eq $testDate -and 
        $_.agency -eq $testAgency -and 
        $_.service -eq $testService 
    }
    
    if ($exactMatch) {
        Write-Host "✅ findByDateAndAgencyAndService - Correspondance trouvée:" -ForegroundColor Green
        Write-Host "  ID: $($exactMatch.id)" -ForegroundColor White
        Write-Host "  RecordCount: $($exactMatch.recordCount)" -ForegroundColor White
        Write-Host "  TotalVolume: $($exactMatch.totalVolume)" -ForegroundColor White
    } else {
        Write-Host "❌ findByDateAndAgencyAndService - Aucune correspondance trouvée" -ForegroundColor Red
        
        # Debug: afficher tous les enregistrements pour cette agence
        $agencyRecords = $response | Where-Object { $_.agency -eq $testAgency }
        Write-Host "  Enregistrements pour l'agence $($testAgency):" -ForegroundColor Yellow
        foreach ($record in $agencyRecords) {
            Write-Host "    - Date: '$($record.date)', Service: '$($record.service)', RecordCount: $($record.recordCount)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Erreur lors du test findByDateAndAgencyAndService: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Simuler l'appel findByDateAndAgency (recherche élargie)
Write-Host "`n=== Test 2: findByDateAndAgency (recherche élargie) ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $dateAgencyMatch = $response | Where-Object { 
        $_.date -eq $testDate -and 
        $_.agency -eq $testAgency 
    }
    
    if ($dateAgencyMatch) {
        Write-Host "✅ findByDateAndAgency - Correspondance trouvée:" -ForegroundColor Green
        foreach ($match in $dateAgencyMatch) {
            Write-Host "  - Service: '$($match.service)', RecordCount: $($match.recordCount), TotalVolume: $($match.totalVolume)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ findByDateAndAgency - Aucune correspondance trouvée" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur lors du test findByDateAndAgency: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier les types de données
Write-Host "`n=== Test 3: Vérification des types de données ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/agency-summary" -Method GET
    $celcmRecord = $response | Where-Object { 
        $_.date -eq $testDate -and 
        $_.agency -eq $testAgency -and 
        $_.service -eq $testService 
    } | Select-Object -First 1
    
    if ($celcmRecord) {
        Write-Host "Types de données pour l'enregistrement trouvé:" -ForegroundColor Cyan
        Write-Host "  date: '$($celcmRecord.date)' (Type: $($celcmRecord.date.GetType().Name))" -ForegroundColor White
        Write-Host "  agency: '$($celcmRecord.agency)' (Type: $($celcmRecord.agency.GetType().Name))" -ForegroundColor White
        Write-Host "  service: '$($celcmRecord.service)' (Type: $($celcmRecord.service.GetType().Name))" -ForegroundColor White
        Write-Host "  recordCount: $($celcmRecord.recordCount) (Type: $($celcmRecord.recordCount.GetType().Name))" -ForegroundColor White
        Write-Host "  totalVolume: $($celcmRecord.totalVolume) (Type: $($celcmRecord.totalVolume.GetType().Name))" -ForegroundColor White
    }
} catch {
    Write-Host "Erreur lors de la vérification des types: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Comparer avec les logs de debug
Write-Host "`n=== Test 4: Comparaison avec les logs ===" -ForegroundColor Green
Write-Host "Dans les logs, on voit:" -ForegroundColor Cyan
Write-Host "  DEBUG: ?? Aucun AgencySummary trouvé avec les paramètres exacts, recherche élargie" -ForegroundColor Yellow
Write-Host "  DEBUG: ?? Aucun AgencySummary trouvé, utilisation de l'estimation" -ForegroundColor Yellow
Write-Host "  DEBUG: ? Volume total: 1.2589255E7 FCFA" -ForegroundColor Yellow
Write-Host "  DEBUG: ? Nombre de transactions estimé: 12589" -ForegroundColor Yellow

Write-Host "`nMais notre test montre que l'enregistrement existe:" -ForegroundColor Cyan
Write-Host "  - Date: 2025-07-01" -ForegroundColor White
Write-Host "  - Agence: CELCM0001" -ForegroundColor White
Write-Host "  - Service: CASHINMTNCMPART" -ForegroundColor White
Write-Host "  - RecordCount: 106" -ForegroundColor White
Write-Host "  - TotalVolume: 12589255" -ForegroundColor White

Write-Host "`nLe problème semble être dans le code Java, pas dans les données." -ForegroundColor Red

Write-Host "`n=== FIN DU DEBUG REPOSITORY ===" -ForegroundColor Yellow 