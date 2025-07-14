# Test spécifique pour CELCM0001 du 02/07/2025
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test CELCM0001 du 02/07/2025 ===" -ForegroundColor Green

# 1. Test du calcul avec données réelles
Write-Host "`n1. Test du calcul avec données réelles:" -ForegroundColor Yellow

try {
    $testParams = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        date = "2025-07-02"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body ($testParams | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat du test:" -ForegroundColor Cyan
    Write-Host "  - Frais trouvé: $($response.fraisTrouve)" -ForegroundColor Green
    Write-Host "  - AgencySummary trouvé: $($response.agencySummaryTrouve)" -ForegroundColor Green
    
    if ($response.fraisTrouve -and $response.agencySummaryTrouve) {
        Write-Host "  - Nombre de transactions: $($response.nombreTransactions)" -ForegroundColor Green
        Write-Host "  - Type de calcul: $($response.typeCalcul)" -ForegroundColor Green
        Write-Host "  - Formule: $($response.formule)" -ForegroundColor Green
        Write-Host "  - Montant calculé: $($response.montantFraisCalcule) FCFA" -ForegroundColor Green
        
        # Calcul manuel pour vérification
        $montantAttendu = 300 * $response.nombreTransactions
        Write-Host "  - Montant attendu (300 × $($response.nombreTransactions)): $montantAttendu FCFA" -ForegroundColor Green
        
        if ($response.montantFraisCalcule -eq $montantAttendu) {
            Write-Host "  ✅ Calcul correct!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️ Données manquantes" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test de correction automatique
Write-Host "`n2. Test de correction automatique:" -ForegroundColor Yellow

try {
    $correctionParams = @{
        date = "2025-07-02"
        service = "CASHINMTNCMPART"
        agences = @("CELCM0001")
    }
    
    $correctionResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body ($correctionParams | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat de la correction:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($correctionResponse.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($correctionResponse.correctionsAppliquees)" -ForegroundColor Green
    
    if ($correctionResponse.corrections -and $correctionResponse.corrections.length -gt 0) {
        foreach ($correction in $correctionResponse.corrections) {
            Write-Host "  - Agence: $($correction.agence)" -ForegroundColor Green
            Write-Host "    * Status: $($correction.status)" -ForegroundColor Green
            if ($correction.operationTrouvee) {
                Write-Host "    * Montant actuel: $($correction.montantActuel) FCFA" -ForegroundColor Green
                Write-Host "    * Montant correct: $($correction.montantCorrect) FCFA" -ForegroundColor Green
                if ($correction.correctionAppliquee) {
                    Write-Host "    * ✅ Correction appliquée!" -ForegroundColor Green
                }
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 