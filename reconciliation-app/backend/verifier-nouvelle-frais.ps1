# Vérification de la nouvelle opération de frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Vérification de la nouvelle opération de frais ===" -ForegroundColor Green

try {
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    # Trouver la plus récente opération de frais
    $fraisOperations = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.service -eq "CASHINMTNCMPART" 
    } | Sort-Object dateOperation -Descending
    
    if ($fraisOperations -and $fraisOperations.length -gt 0) {
        $latestFrais = $fraisOperations[0]
        
        Write-Host "Dernière opération de frais créée:" -ForegroundColor Cyan
        Write-Host "  - ID: $($latestFrais.id)" -ForegroundColor Green
        Write-Host "  - Date: $($latestFrais.dateOperation)" -ForegroundColor Green
        Write-Host "  - Montant: $($latestFrais.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($latestFrais.nomBordereau)" -ForegroundColor Green
        
        if ($latestFrais.montant -eq 31800.0) {
            Write-Host "  ✅ MONTANT CORRECT (31,800 FCFA)" -ForegroundColor Green
            Write-Host "  🎉 Le calcul automatique fonctionne !" -ForegroundColor Green
        } elseif ($latestFrais.montant -eq 755355.3) {
            Write-Host "  ❌ MONTANT INCORRECT (755,355.30 FCFA)" -ForegroundColor Red
            Write-Host "  ⚠️ Le calcul automatique ne fonctionne pas encore" -ForegroundColor Red
        } else {
            Write-Host "  ⚠️ MONTANT INATTENDU: $($latestFrais.montant) FCFA" -ForegroundColor Yellow
        }
        
        # Afficher toutes les opérations de frais récentes
        Write-Host "`nToutes les opérations de frais récentes:" -ForegroundColor Cyan
        foreach ($frais in $fraisOperations[0..4]) {
            Write-Host "  - ID: $($frais.id), Date: $($frais.dateOperation), Montant: $($frais.montant) FCFA" -ForegroundColor White
        }
        
    } else {
        Write-Host "❌ Aucune opération de frais trouvée" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Vérification terminée ===" -ForegroundColor Green 