# Test du calcul des frais fixes avec nombre de transactions depuis AgencySummary
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du calcul des frais fixes avec AgencySummary ===" -ForegroundColor Green

# 1. Test avec des données réelles
Write-Host "`n1. Test avec données réelles:" -ForegroundColor Yellow

$testParams = @{
    service = "total_cashin"
    agence = "AG001"
    date = "2025-06-11"
}

$response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"

Write-Host "Résultat du test:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10

# 2. Test avec calcul manuel
Write-Host "`n2. Test avec calcul manuel:" -ForegroundColor Yellow

$testParams2 = @{
    service = "total_cashin"
    agence = "AG001"
    typeCalcul = "NOMINAL"
    montantFrais = 500
    nombreTransactions = 10
}

$response2 = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation" -Method GET -Body $testParams2 -ContentType "application/json"

Write-Host "Résultat du test manuel:" -ForegroundColor Cyan
$response2 | ConvertTo-Json -Depth 10

# 3. Vérifier les données AgencySummary
Write-Host "`n3. Vérification des données AgencySummary:" -ForegroundColor Yellow

$agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?date=2025-06-11&agence=AG001&service=total_cashin" -Method GET

Write-Host "Données AgencySummary:" -ForegroundColor Cyan
$agencySummaryResponse | ConvertTo-Json -Depth 10

# 4. Test de création d'opération avec frais automatiques
Write-Host "`n4. Test de création d'opération avec frais automatiques:" -ForegroundColor Yellow

$operationData = @{
    compteId = 1
    typeOperation = "total_cashin"
    montant = 50000
    service = "total_cashin"
    dateOperation = "2025-06-11T10:00:00"
    codeProprietaire = "AG001"
}

$operationResponse = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Body ($operationData | ConvertTo-Json) -ContentType "application/json"

Write-Host "Opération créée:" -ForegroundColor Cyan
$operationResponse | ConvertTo-Json -Depth 10

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 