# Test simple des opérations avec frais
Write-Host "=== TEST SIMPLE DES OPÉRATIONS AVEC FRAIS ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# Test 1: Récupérer toutes les opérations avec frais
Write-Host "`n1. Test endpoint /operations/with-frais..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/operations/with-frais" -Method GET
    Write-Host "✅ Succès: ${response.Count} opérations récupérées" -ForegroundColor Green
    
    $operationsWithFrais = $response | Where-Object { $_.fraisApplicable -eq $true }
    Write-Host "📊 Opérations avec frais applicables: ${operationsWithFrais.Count}" -ForegroundColor Cyan
    
    if ($operationsWithFrais.Count -gt 0) {
        Write-Host "📋 Premier exemple:" -ForegroundColor Cyan
        $first = $operationsWithFrais[0]
        Write-Host "  - ID: $($first.id), Service: $($first.service)" -ForegroundColor White
        Write-Host "  - Frais: $($first.montantFrais) FCFA" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Récupérer une opération spécifique
Write-Host "`n2. Test endpoint /operations/{id}/with-frais..." -ForegroundColor Yellow
try {
    $operations = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    if ($operations.Count -gt 0) {
        $firstId = $operations[0].id
        $response = Invoke-RestMethod -Uri "$baseUrl/operations/$firstId/with-frais" -Method GET
        Write-Host "✅ Succès: Opération $firstId récupérée" -ForegroundColor Green
        Write-Host "  - Frais applicable: $($response.fraisApplicable)" -ForegroundColor White
        if ($response.fraisApplicable) {
            Write-Host "  - Montant frais: $($response.montantFrais) FCFA" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Green 