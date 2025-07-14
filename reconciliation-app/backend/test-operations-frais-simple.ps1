# Test simple des opérations avec frais
Write-Host "=== TEST DES OPÉRATIONS AVEC FRAIS ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# Test 1: Récupérer toutes les opérations avec frais
Write-Host "`n1. Test endpoint /operations/with-frais..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/operations/with-frais" -Method GET
    $operations = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: ${operations.Count} opérations récupérées" -ForegroundColor Green
    
    $operationsWithFrais = $operations | Where-Object { $_.fraisApplicable -eq $true }
    Write-Host "📊 Opérations avec frais applicables: ${operationsWithFrais.Count}" -ForegroundColor Cyan
    
    if ($operationsWithFrais.Count -gt 0) {
        Write-Host "📋 Premier exemple:" -ForegroundColor Cyan
        $first = $operationsWithFrais[0]
        Write-Host "  - ID: $($first.id), Service: $($first.service)" -ForegroundColor White
        Write-Host "  - Montant: $($first.montant) FCFA" -ForegroundColor White
        Write-Host "  - Frais: $($first.montantFrais) FCFA" -ForegroundColor White
        Write-Host "  - Type calcul: $($first.typeCalculFrais)" -ForegroundColor White
        Write-Host "  - Description: $($first.descriptionFrais)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Récupérer une opération spécifique avec frais
Write-Host "`n2. Test endpoint /operations/{id}/with-frais..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/operations/19/with-frais" -Method GET
    $operation = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: Opération 19 récupérée" -ForegroundColor Green
    Write-Host "📋 Détails:" -ForegroundColor Cyan
    Write-Host "  - ID: $($operation.id), Type: $($operation.typeOperation)" -ForegroundColor White
    Write-Host "  - Service: $($operation.service)" -ForegroundColor White
    Write-Host "  - Montant: $($operation.montant) FCFA" -ForegroundColor White
    Write-Host "  - Frais applicable: $($operation.fraisApplicable)" -ForegroundColor White
    if ($operation.fraisApplicable) {
        Write-Host "  - Montant frais: $($operation.montantFrais) FCFA" -ForegroundColor White
        Write-Host "  - Type calcul: $($operation.typeCalculFrais)" -ForegroundColor White
        Write-Host "  - Description: $($operation.descriptionFrais)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Green 