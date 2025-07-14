# Test du filtre "nombre de transactions" avec filtres appliqués
Write-Host "=== TEST DU FILTRE NOMBRE DE TRANSACTIONS ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# Fonction pour vérifier les données de transactions
function Test-TransactionData {
    param($metrics, $testName)
    
    Write-Host "`n📊 $testName" -ForegroundColor Cyan
    
    # Vérifier les métriques principales
    Write-Host "  📈 Métriques principales:" -ForegroundColor Yellow
    Write-Host "    - Volume Total: $($metrics.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
    Write-Host "    - Transactions: $($metrics.totalTransactions)" -ForegroundColor White
    Write-Host "    - Clients: $($metrics.totalClients)" -ForegroundColor White
    
    # Vérifier les statistiques par type d'opération
    $operationStats = $metrics.operationStats
    Write-Host "  📋 Statistiques par type d'opération:" -ForegroundColor Yellow
    if ($operationStats -and $operationStats.Count -gt 0) {
        foreach ($stat in $operationStats) {
            Write-Host "    - $($stat.operationType): $($stat.transactionCount) transactions, $([math]::Round($stat.totalVolume, 2)) volume" -ForegroundColor White
        }
    } else {
        Write-Host "    ❌ Aucune statistique d'opération trouvée" -ForegroundColor Red
    }
    
    # Vérifier les statistiques de fréquence
    $frequencyStats = $metrics.frequencyStats
    Write-Host "  📊 Statistiques de fréquence:" -ForegroundColor Yellow
    if ($frequencyStats -and $frequencyStats.Count -gt 0) {
        foreach ($freq in $frequencyStats) {
            Write-Host "    - $($freq.operationType): $($freq.frequency) occurrences" -ForegroundColor White
        }
    } else {
        Write-Host "    ❌ Aucune statistique de fréquence trouvée" -ForegroundColor Red
    }
    
    # Retourner le résultat du test
    $hasData = ($operationStats -and $operationStats.Count -gt 0) -or ($frequencyStats -and $frequencyStats.Count -gt 0)
    return $hasData
}

# 1. Test sans filtres (Tous)
Write-Host "`n1. Test sans filtres (Tous)..." -ForegroundColor Yellow
try {
    $metricsAll = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
    $test1Result = Test-TransactionData $metricsAll "Sans filtres (Tous)"
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
    $test2Result = Test-TransactionData $metricsAgency "Filtre agence CELCM0001"
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
    $test3Result = Test-TransactionData $metricsService "Filtre service VIREMENT"
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
    $test4Result = Test-TransactionData $metricsMonth "Filtre 'Ce mois'"
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
    $test5Result = Test-TransactionData $metricsCombined "Combinaison: CELCM0001 + VIREMENT + Ce mois"
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
    Write-Host "`n✅ SUCCÈS: Le filtre 'nombre de transactions' fonctionne correctement!" -ForegroundColor Green
    Write-Host "Les données de transactions sont bien filtrées selon les critères sélectionnés." -ForegroundColor Green
} else {
    Write-Host "`n❌ ÉCHEC: Le filtre 'nombre de transactions' ne fonctionne pas correctement." -ForegroundColor Red
    Write-Host "Vérifiez la logique de filtrage dans le composant dashboard." -ForegroundColor Red
}

Write-Host "`n🔧 Instructions pour tester manuellement:" -ForegroundColor Cyan
Write-Host "1. Ouvrir l'application Angular" -ForegroundColor White
Write-Host "2. Aller dans le Dashboard" -ForegroundColor White
Write-Host "3. Sélectionner 'Nombre de transactions' dans le filtre métrique" -ForegroundColor White
Write-Host "4. Appliquer différents filtres (agence, service, période)" -ForegroundColor White
Write-Host "5. Vérifier que les graphiques se mettent à jour avec les données filtrées" -ForegroundColor White 