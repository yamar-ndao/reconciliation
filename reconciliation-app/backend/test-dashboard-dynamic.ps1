# Test des métriques dynamiques du dashboard
Write-Host "=== TEST DES MÉTRIQUES DYNAMIQUES DU DASHBOARD ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/statistics"

# Test 1: Métriques sans filtres
Write-Host "`n1. Test des métriques sans filtres..." -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics" -Method GET
Write-Host "Volume total sans filtres: $($response1.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus sans filtres: $($response1.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour sans filtres: $($response1.averageFeesPerDay)" -ForegroundColor Cyan

# Test 2: Métriques avec filtre de période "Aujourd'hui"
Write-Host "`n2. Test des métriques avec filtre 'Aujourd'hui'..." -ForegroundColor Yellow
$response2 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Aujourd'hui" -Method GET
Write-Host "Volume total avec filtre 'Aujourd'hui': $($response2.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus avec filtre 'Aujourd'hui': $($response2.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour avec filtre 'Aujourd'hui': $($response2.averageFeesPerDay)" -ForegroundColor Cyan

# Test 3: Métriques avec filtre de période "Ce mois"
Write-Host "`n3. Test des métriques avec filtre 'Ce mois'..." -ForegroundColor Yellow
$response3 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Ce%20mois" -Method GET
Write-Host "Volume total avec filtre 'Ce mois': $($response3.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus avec filtre 'Ce mois': $($response3.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour avec filtre 'Ce mois': $($response3.averageFeesPerDay)" -ForegroundColor Cyan

# Test 4: Métriques avec filtre de service
Write-Host "`n4. Test des métriques avec filtre de service..." -ForegroundColor Yellow
$response4 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?service=CASHIN" -Method GET
Write-Host "Volume total avec filtre service CASHIN: $($response4.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus avec filtre service CASHIN: $($response4.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour avec filtre service CASHIN: $($response4.averageFeesPerDay)" -ForegroundColor Cyan

# Test 5: Métriques avec filtre d'agence
Write-Host "`n5. Test des métriques avec filtre d'agence..." -ForegroundColor Yellow
$response5 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?agency=celcm0001" -Method GET
Write-Host "Volume total avec filtre agence celcm0001: $($response5.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus avec filtre agence celcm0001: $($response5.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour avec filtre agence celcm0001: $($response5.averageFeesPerDay)" -ForegroundColor Cyan

# Test 6: Métriques avec filtres combinés
Write-Host "`n6. Test des métriques avec filtres combinés..." -ForegroundColor Yellow
$response6 = Invoke-RestMethod -Uri "$baseUrl/detailed-metrics?timeFilter=Ce%20mois&service=CASHIN&agency=celcm0001" -Method GET
Write-Host "Volume total avec filtres combinés: $($response6.totalVolume)" -ForegroundColor Cyan
Write-Host "Volume des revenus avec filtres combinés: $($response6.totalFees)" -ForegroundColor Cyan
Write-Host "Revenu moyen/jour avec filtres combinés: $($response6.averageFeesPerDay)" -ForegroundColor Cyan

# Vérification que les valeurs changent
Write-Host "`n=== VÉRIFICATION DES CHANGEMENTS ===" -ForegroundColor Green

if ($response1.totalFees -ne $response2.totalFees) {
    Write-Host "✅ Le volume des revenus change avec le filtre de période" -ForegroundColor Green
} else {
    Write-Host "❌ Le volume des revenus ne change pas avec le filtre de période" -ForegroundColor Red
}

if ($response1.averageFeesPerDay -ne $response2.averageFeesPerDay) {
    Write-Host "✅ Le revenu moyen/jour change avec le filtre de période" -ForegroundColor Green
} else {
    Write-Host "❌ Le revenu moyen/jour ne change pas avec le filtre de période" -ForegroundColor Red
}

if ($response1.totalFees -ne $response4.totalFees) {
    Write-Host "✅ Le volume des revenus change avec le filtre de service" -ForegroundColor Green
} else {
    Write-Host "❌ Le volume des revenus ne change pas avec le filtre de service" -ForegroundColor Red
}

if ($response1.totalFees -ne $response5.totalFees) {
    Write-Host "✅ Le volume des revenus change avec le filtre d'agence" -ForegroundColor Green
} else {
    Write-Host "❌ Le volume des revenus ne change pas avec le filtre d'agence" -ForegroundColor Red
}

Write-Host "`n=== TEST TERMINÉ ===" -ForegroundColor Green 