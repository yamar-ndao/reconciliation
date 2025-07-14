# Test spécifique pour diagnostiquer le problème CELCM0001
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Diagnostic du problème CELCM0001 ===" -ForegroundColor Green

# 1. Vérifier les données AgencySummary pour CELCM0001
Write-Host "`n1. Données AgencySummary pour CELCM0001:" -ForegroundColor Yellow

$agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?agence=CELCM0001&service=CASHINMTNCMPART&date=2025-07-01" -Method GET

Write-Host "AgencySummary CELCM0001:" -ForegroundColor Cyan
$agencySummaryResponse | ConvertTo-Json -Depth 5

# 2. Vérifier le frais configuré
Write-Host "`n2. Frais configuré pour CELCM0001:" -ForegroundColor Yellow

$fraisResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET

Write-Host "Frais configuré:" -ForegroundColor Cyan
$fraisResponse | ConvertTo-Json -Depth 5

# 3. Test du calcul avec les données réelles
Write-Host "`n3. Test du calcul avec données réelles:" -ForegroundColor Yellow

$testParams = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    date = "2025-07-01"
}

$response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"

Write-Host "Résultat du test:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10

# 4. Calcul manuel pour vérification
Write-Host "`n4. Calcul manuel de vérification:" -ForegroundColor Yellow

if ($agencySummaryResponse -and $agencySummaryResponse.length -gt 0) {
    $summary = $agencySummaryResponse[0]
    $nombreTransactions = $summary.recordCount
    $volumeTotal = $summary.totalVolume
    
    if ($fraisResponse -and $fraisResponse.montantFrais) {
        $montantFrais = $fraisResponse.montantFrais
        $calculManuel = $montantFrais * $nombreTransactions
        
        Write-Host "Calcul manuel:" -ForegroundColor Green
        Write-Host "  - Nombre de transactions: $nombreTransactions" -ForegroundColor Green
        Write-Host "  - Montant frais configuré: $montantFrais FCFA" -ForegroundColor Green
        Write-Host "  - Calcul: $montantFrais × $nombreTransactions = $calculManuel FCFA" -ForegroundColor Green
        Write-Host "  - Montant calculé par le système: $($response.montantFraisCalcule) FCFA" -ForegroundColor Green
        
        if ($calculManuel -eq $response.montantFraisCalcule) {
            Write-Host "  ✅ Calcul correct!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
            Write-Host "  Différence: $($response.montantFraisCalcule - $calculManuel) FCFA" -ForegroundColor Red
        }
    }
}

# 5. Vérifier les opérations existantes
Write-Host "`n5. Opérations existantes pour CELCM0001:" -ForegroundColor Yellow

$operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-01T00:00:00&dateFin=2025-07-01T23:59:59" -Method GET

Write-Host "Opérations CELCM0001 du 01/07/2025:" -ForegroundColor Cyan
$operationsResponse | ConvertTo-Json -Depth 5

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green 