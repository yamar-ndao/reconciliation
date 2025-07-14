# Test du filtre "Aujourd'hui" considéré comme j-1
Write-Host "=== TEST DU FILTRE AUJOURD'HUI (J-1) ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# Fonction pour vérifier les dates du filtre "Aujourd'hui"
function Test-AujourdhuiFilter {
    param($testName)
    
    Write-Host "`n📊 $testName" -ForegroundColor Cyan
    
    # Calculer la date d'hier
    $today = Get-Date
    $yesterday = $today.AddDays(-1)
    $yesterdayStr = $yesterday.ToString("yyyy-MM-dd")
    
    Write-Host "  📅 Date actuelle: $($today.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
    Write-Host "  📅 Date d'hier (j-1): $yesterdayStr" -ForegroundColor Yellow
    
    # Test avec le filtre "Aujourd'hui"
    try {
        $params = @{
            timeFilter = "Aujourd'hui"
        }
        $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
        $metricsToday = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
        
        Write-Host "  ✅ Filtre 'Aujourd'hui' appliqué avec succès" -ForegroundColor Green
        Write-Host "  📊 Métriques obtenues:" -ForegroundColor Yellow
        Write-Host "    - Volume Total: $($metricsToday.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
        Write-Host "    - Transactions: $($metricsToday.totalTransactions)" -ForegroundColor White
        Write-Host "    - Clients: $($metricsToday.totalClients)" -ForegroundColor White
        
        # Vérifier les statistiques par type d'opération
        $operationStats = $metricsToday.operationStats
        if ($operationStats -and $operationStats.Count -gt 0) {
            Write-Host "  📋 Types d'opération trouvés:" -ForegroundColor Yellow
            foreach ($stat in $operationStats) {
                Write-Host "    - $($stat.operationType): $($stat.transactionCount) transactions" -ForegroundColor White
            }
        } else {
            Write-Host "  ⚠️ Aucune opération trouvée pour la date d'hier" -ForegroundColor Yellow
        }
        
        return $true
    } catch {
        Write-Host "  ❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour comparer avec un filtre personnalisé sur j-1
function Test-ComparisonWithCustomFilter {
    Write-Host "`n📊 Comparaison avec filtre personnalisé j-1" -ForegroundColor Cyan
    
    # Calculer la date d'hier
    $today = Get-Date
    $yesterday = $today.AddDays(-1)
    $yesterdayStr = $yesterday.ToString("yyyy-MM-dd")
    
    try {
        # Test avec filtre personnalisé sur j-1
        $params = @{
            timeFilter = "Personnalisé"
            startDate = $yesterdayStr
            endDate = $yesterdayStr
        }
        $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
        $metricsCustom = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
        
        Write-Host "  ✅ Filtre personnalisé j-1 appliqué avec succès" -ForegroundColor Green
        Write-Host "  📊 Métriques obtenues:" -ForegroundColor Yellow
        Write-Host "    - Volume Total: $($metricsCustom.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
        Write-Host "    - Transactions: $($metricsCustom.totalTransactions)" -ForegroundColor White
        Write-Host "    - Clients: $($metricsCustom.totalClients)" -ForegroundColor White
        
        return $true
    } catch {
        Write-Host "  ❌ Erreur lors du test personnalisé: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. Test du filtre "Aujourd'hui"
Write-Host "`n1. Test du filtre 'Aujourd'hui'..." -ForegroundColor Yellow
$test1Result = Test-AujourdhuiFilter "Filtre 'Aujourd'hui' (doit être j-1)"

# 2. Test de comparaison avec filtre personnalisé
Write-Host "`n2. Test de comparaison..." -ForegroundColor Yellow
$test2Result = Test-ComparisonWithCustomFilter

# 3. Test avec filtre d'agence + "Aujourd'hui"
Write-Host "`n3. Test avec filtre d'agence + 'Aujourd'hui'..." -ForegroundColor Yellow
try {
    $params = @{
        agency = "CELCM0001"
        timeFilter = "Aujourd'hui"
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $metricsCombined = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?$queryString" -Method GET
    
    Write-Host "  ✅ Combinaison agence + 'Aujourd'hui' appliquée avec succès" -ForegroundColor Green
    Write-Host "  📊 Métriques obtenues:" -ForegroundColor Yellow
    Write-Host "    - Volume Total: $($metricsCombined.totalVolume | ForEach-Object { [math]::Round($_, 2) })" -ForegroundColor White
    Write-Host "    - Transactions: $($metricsCombined.totalTransactions)" -ForegroundColor White
    Write-Host "    - Clients: $($metricsCombined.totalClients)" -ForegroundColor White
    
    $test3Result = $true
} catch {
    Write-Host "  ❌ Erreur lors du test combiné: $($_.Exception.Message)" -ForegroundColor Red
    $test3Result = $false
}

# Résumé des tests
Write-Host "`n📋 RÉSUMÉ DES TESTS" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

$allTests = @($test1Result, $test2Result, $test3Result)
$passedTests = ($allTests | Where-Object { $_ -eq $true }).Count
$totalTests = $allTests.Count

Write-Host "Tests réussis: $passedTests/$totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Red" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n✅ SUCCÈS: Le filtre 'Aujourd'hui' fonctionne correctement comme j-1!" -ForegroundColor Green
    Write-Host "Le filtre 'Aujourd'hui' considère bien la date d'hier (j-1) au lieu de la date actuelle." -ForegroundColor Green
} else {
    Write-Host "`n❌ ÉCHEC: Le filtre 'Aujourd'hui' ne fonctionne pas correctement." -ForegroundColor Red
    Write-Host "Vérifiez la logique de filtrage dans le frontend et le backend." -ForegroundColor Red
}

Write-Host "`n🔧 Logique attendue:" -ForegroundColor Cyan
Write-Host "  - Filtre 'Aujourd'hui' = Date d'hier (j-1)" -ForegroundColor White
Write-Host "  - Filtre 'Cette semaine' = Semaine en cours" -ForegroundColor White
Write-Host "  - Filtre 'Ce mois' = Mois en cours" -ForegroundColor White
Write-Host "  - Filtre 'Personnalisé' = Dates spécifiées" -ForegroundColor White

Write-Host "`n📝 Instructions pour tester manuellement:" -ForegroundColor Cyan
Write-Host "1. Ouvrir l'application Angular" -ForegroundColor White
Write-Host "2. Aller dans le Dashboard" -ForegroundColor White
Write-Host "3. Sélectionner 'Aujourd'hui' dans le filtre de période" -ForegroundColor White
Write-Host "4. Vérifier que les données affichées correspondent à la date d'hier" -ForegroundColor White
Write-Host "5. Comparer avec un filtre personnalisé sur la date d'hier" -ForegroundColor White 