# Test simple de la dynamique de "Transaction moyenne/Jour"
Write-Host "=== TEST DYNAMIQUE TRANSACTION MOYENNE/JOUR ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# 1. Test sans filtres
Write-Host "`n1. Test sans filtres..." -ForegroundColor Yellow
try {
    $metricsAll = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
    Write-Host "✅ Sans filtres - Transaction moyenne/Jour: $($metricsAll.averageTransactions)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test avec filtre "Ce mois"
Write-Host "`n2. Test avec filtre 'Ce mois'..." -ForegroundColor Yellow
try {
    $metricsMonth = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Ce%20mois" -Method GET
    Write-Host "✅ Ce mois - Transaction moyenne/Jour: $($metricsMonth.averageTransactions)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test avec filtre "Cette semaine"
Write-Host "`n3. Test avec filtre 'Cette semaine'..." -ForegroundColor Yellow
try {
    $metricsWeek = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Cette%20semaine" -Method GET
    Write-Host "✅ Cette semaine - Transaction moyenne/Jour: $($metricsWeek.averageTransactions)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test avec filtre "Aujourd'hui"
Write-Host "`n4. Test avec filtre 'Aujourd'hui'..." -ForegroundColor Yellow
try {
    $metricsToday = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Aujourd%27hui" -Method GET
    Write-Host "✅ Aujourd'hui - Transaction moyenne/Jour: $($metricsToday.averageTransactions)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Analyse
Write-Host "`n=== ANALYSE ===" -ForegroundColor Cyan

$values = @()
if ($metricsAll) { $values += $metricsAll.averageTransactions }
if ($metricsMonth) { $values += $metricsMonth.averageTransactions }
if ($metricsWeek) { $values += $metricsWeek.averageTransactions }
if ($metricsToday) { $values += $metricsToday.averageTransactions }

$uniqueValues = ($values | Sort-Object -Unique).Count

if ($uniqueValues -gt 1) {
    Write-Host "✅ SUCCÈS: La 'Transaction moyenne/Jour' est dynamique!" -ForegroundColor Green
    Write-Host "   Valeurs uniques trouvées: $uniqueValues" -ForegroundColor Green
} else {
    Write-Host "❌ PROBLÈME: La 'Transaction moyenne/Jour' n'est pas dynamique!" -ForegroundColor Red
    Write-Host "   Toutes les valeurs sont identiques: $($values[0])" -ForegroundColor Red
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Green 