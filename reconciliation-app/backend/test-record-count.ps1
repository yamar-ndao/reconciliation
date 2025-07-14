# Test du recordCount dans le calcul des frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du recordCount dans le calcul des frais ===" -ForegroundColor Green

try {
    # 1. Créer une nouvelle opération avec recordCount
    $testData = @{
        summary = @(
            @{
                agency = "CELCM0001"
                service = "CASHINMTNCMPART"
                country = "CM"
                date = "2025-07-04"
                totalVolume = 12589255
                recordCount = 106
            }
        )
        timestamp = "2025-07-04T10:00:00"
    }
    
    $jsonBody = $testData | ConvertTo-Json -Depth 3
    Write-Host "Création d'une nouvelle opération avec recordCount=106..." -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri "$baseUrl/agency-summary/save" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Réponse reçue:" -ForegroundColor Green
    Write-Host "Status: $($result.status)" -ForegroundColor White
    Write-Host "Message: $($result.message)" -ForegroundColor White
    
    # 2. Attendre un peu pour que les frais soient calculés
    Write-Host "`nAttente du calcul automatique des frais..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # 3. Vérifier les opérations créées
    Write-Host "`nVérification des opérations créées:" -ForegroundColor Cyan
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    # Trouver les opérations récentes
    $recentOperations = $operations | Where-Object { 
        $_.dateOperation -like "*2025-07-04*" 
    } | Sort-Object dateOperation -Descending
    
    Write-Host "Opérations créées le 2025-07-04:" -ForegroundColor White
    foreach ($op in $recentOperations[0..4]) {
        Write-Host "  - ID: $($op.id), Type: $($op.typeOperation), Montant: $($op.montant) FCFA, Bordereau: $($op.nomBordereau)" -ForegroundColor White
    }
    
    # 4. Vérifier les frais calculés
    $fraisOperations = $recentOperations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.service -eq "CASHINMTNCMPART" 
    }
    
    if ($fraisOperations -and $fraisOperations.length -gt 0) {
        $latestFrais = $fraisOperations[0]
        Write-Host "`nDernière opération de frais:" -ForegroundColor Cyan
        Write-Host "  - ID: $($latestFrais.id)" -ForegroundColor Green
        Write-Host "  - Montant: $($latestFrais.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($latestFrais.nomBordereau)" -ForegroundColor Green
        
        # Vérifier si le montant est correct (300 × 106 = 31,800)
        if ($latestFrais.montant -eq 31800.0) {
            Write-Host "  ✅ MONTANT CORRECT (31,800 FCFA = 300 × 106)" -ForegroundColor Green
            Write-Host "  🎉 Le recordCount est bien utilisé !" -ForegroundColor Green
        } else {
            Write-Host "  ❌ MONTANT INCORRECT: $($latestFrais.montant) FCFA" -ForegroundColor Red
            Write-Host "  ⚠️ Le recordCount n'est pas utilisé correctement" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Aucune opération de frais trouvée" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 