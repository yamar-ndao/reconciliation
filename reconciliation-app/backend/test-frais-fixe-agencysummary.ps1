# Test du calcul des frais fixes avec AgencySummary
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du calcul des frais fixes avec AgencySummary ===" -ForegroundColor Green

# 1. Vérifier les données AgencySummary
Write-Host "`n1. Vérification des données AgencySummary:" -ForegroundColor Yellow

$agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary" -Method GET

Write-Host "Données AgencySummary disponibles:" -ForegroundColor Cyan
$agencySummaryResponse | ConvertTo-Json -Depth 5

# 2. Test avec données réelles
Write-Host "`n2. Test avec données réelles:" -ForegroundColor Yellow

if ($agencySummaryResponse -and $agencySummaryResponse.length -gt 0) {
    $firstSummary = $agencySummaryResponse[0]
    $testDate = $firstSummary.date
    $testAgency = $firstSummary.agency
    $testService = $firstSummary.service
    
    Write-Host "Test avec: Date=$testDate, Agence=$testAgency, Service=$testService" -ForegroundColor Cyan
    
    $testParams = @{
        service = $testService
        agence = $testAgency
        date = $testDate
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"
    
    Write-Host "Résultat du test:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 