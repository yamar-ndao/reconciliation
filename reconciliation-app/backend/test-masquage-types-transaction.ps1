# Test du masquage des types de transaction dans les métriques détaillées
Write-Host "=== TEST DU MASQUAGE DES TYPES DE TRANSACTION ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# Fonction pour vérifier l'absence des types exclus
function Test-ExcludedTypes {
    param($metrics, $testName)
    
    Write-Host "`n📊 $testName" -ForegroundColor Cyan
    
    # Vérifier les statistiques par type d'opération
    $operationStats = $metrics.operationStats
    $excludedTypes = @("transaction_cree", "annulation_bo", "annulation_partenaire")
    
    Write-Host "  🔍 Vérification des types exclus dans operationStats:" -ForegroundColor Yellow
    $foundExcludedTypes = @()
    
    foreach ($stat in $operationStats) {
        if ($excludedTypes -contains $stat.operationType) {
            $foundExcludedTypes += $stat.operationType
        }
    }
    
    if ($foundExcludedTypes.Count -eq 0) {
        Write-Host "    ✅ Aucun type exclu trouvé dans operationStats" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Types exclus trouvés dans operationStats: $($foundExcludedTypes -join ', ')" -ForegroundColor Red
    }
    
    # Vérifier les statistiques de fréquence
    $frequencyStats = $metrics.frequencyStats
    
    Write-Host "  🔍 Vérification des types exclus dans frequencyStats:" -ForegroundColor Yellow
    $foundExcludedTypesFreq = @()
    
    foreach ($freq in $frequencyStats) {
        if ($excludedTypes -contains $freq.operationType) {
            $foundExcludedTypesFreq += $freq.operationType
        }
    }
    
    if ($foundExcludedTypesFreq.Count -eq 0) {
        Write-Host "    ✅ Aucun type exclu trouvé dans frequencyStats" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Types exclus trouvés dans frequencyStats: $($foundExcludedTypesFreq -join ', ')" -ForegroundColor Red
    }
    
    # Afficher les types présents
    Write-Host "  📋 Types d'opération affichés:" -ForegroundColor Yellow
    $operationTypes = $operationStats | ForEach-Object { $_.operationType }
    $frequencyTypes = $frequencyStats | ForEach-Object { $_.operationType }
    
    Write-Host "    OperationStats: $($operationTypes -join ', ')" -ForegroundColor White
    Write-Host "    FrequencyStats: $($frequencyTypes -join ', ')" -ForegroundColor White
    
    # Retourner le résultat du test
    return ($foundExcludedTypes.Count -eq 0) -and ($foundExcludedTypesFreq.Count -eq 0)
}

# 1. Test sans filtres (Tous)
Write-Host "`n1. Test sans filtres (Tous)..." -ForegroundColor Yellow
try {
    $metricsAll = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
    $test1Result = Test-ExcludedTypes $metricsAll "Sans filtres (Tous)"
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
    $test2Result = Test-ExcludedTypes $metricsAgency "Filtre agence CELCM0001"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre d'agence: $($_.Exception.Message)" -ForegroundColor Red
    $test2Result = $false
}

# 3. Test avec filtre de service
Write-Host "`n3. Test avec filtre de service..." -ForegroundColor Yellow
try {
    $params = @{
        service = "VIREMENT"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsService = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    $test3Result = Test-ExcludedTypes $metricsService "Filtre service VIREMENT"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre de service: $($_.Exception.Message)" -ForegroundColor Red
    $test3Result = $false
}

# 4. Test avec filtre de temps "Ce mois"
Write-Host "`n4. Test avec filtre 'Ce mois'..." -ForegroundColor Yellow
try {
    $params = @{
        timeFilter = "Ce mois"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsMonth = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    $test4Result = Test-ExcludedTypes $metricsMonth "Filtre 'Ce mois'"
} catch {
    Write-Host "❌ Erreur lors du test avec filtre 'Ce mois': $($_.Exception.Message)" -ForegroundColor Red
    $test4Result = $false
}

# 5. Test avec combinaison de filtres
Write-Host "`n5. Test avec combinaison de filtres..." -ForegroundColor Yellow
try {
    $params = @{
        agency = "CELCM0001"
        service = "VIREMENT"
        timeFilter = "Ce mois"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsCombined = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    $test5Result = Test-ExcludedTypes $metricsCombined "Combinaison: CELCM0001 + VIREMENT + Ce mois"
} catch {
    Write-Host "❌ Erreur lors du test avec combinaison de filtres: $($_.Exception.Message)" -ForegroundColor Red
    $test5Result = $false
}

# Résumé des tests
Write-Host "`n📋 RÉSUMÉ DES TESTS" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

$allTests = @($test1Result, $test2Result, $test3Result, $test4Result, $test5Result)
$passedTests = ($allTests | Where-Object { $_ -eq $true }).Count
$totalTests = $allTests.Count

Write-Host "Tests réussis: $passedTests/$totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Red" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n✅ SUCCÈS: Tous les types de transaction exclus sont bien masqués!" -ForegroundColor Green
    Write-Host "Les types 'transaction_cree', 'annulation_bo' et 'annulation_partenaire' ne sont plus affichés dans les métriques détaillées." -ForegroundColor Green
} else {
    Write-Host "`n❌ ÉCHEC: Certains types exclus sont encore visibles dans les métriques détaillées." -ForegroundColor Red
    Write-Host "Vérifiez la configuration du filtre dans StatisticsService.java" -ForegroundColor Red
}

Write-Host "`n🔧 Types exclus configurés:" -ForegroundColor Cyan
Write-Host "  - transaction_cree" -ForegroundColor White
Write-Host "  - annulation_bo" -ForegroundColor White
Write-Host "  - annulation_partenaire" -ForegroundColor White 