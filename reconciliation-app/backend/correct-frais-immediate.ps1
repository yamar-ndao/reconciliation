# Correction immédiate des frais CELCM0001
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Correction immédiate des frais CELCM0001 ===" -ForegroundColor Green

# 1. Correction pour le 01/07/2025
Write-Host "`n1. Correction pour le 01/07/2025:" -ForegroundColor Yellow

try {
    $correctionParams1 = @{
        date = "2025-07-01"
        service = "CASHINMTNCMPART"
        agences = @("CELCM0001")
    }
    
    $correctionResponse1 = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body ($correctionParams1 | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat de la correction 01/07/2025:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($correctionResponse1.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($correctionResponse1.correctionsAppliquees)" -ForegroundColor Green
    
    if ($correctionResponse1.corrections -and $correctionResponse1.corrections.length -gt 0) {
        foreach ($correction in $correctionResponse1.corrections) {
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
    Write-Host "❌ Erreur lors de la correction 01/07/2025: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Correction pour le 02/07/2025
Write-Host "`n2. Correction pour le 02/07/2025:" -ForegroundColor Yellow

try {
    $correctionParams2 = @{
        date = "2025-07-02"
        service = "CASHINMTNCMPART"
        agences = @("CELCM0001")
    }
    
    $correctionResponse2 = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body ($correctionParams2 | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat de la correction 02/07/2025:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($correctionResponse2.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($correctionResponse2.correctionsAppliquees)" -ForegroundColor Green
    
    if ($correctionResponse2.corrections -and $correctionResponse2.corrections.length -gt 0) {
        foreach ($correction in $correctionResponse2.corrections) {
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
    Write-Host "❌ Erreur lors de la correction 02/07/2025: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérification finale
Write-Host "`n3. Vérification finale:" -ForegroundColor Yellow

try {
    $verificationResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-01T00:00:00&dateFin=2025-07-02T23:59:59" -Method GET
    
    Write-Host "Opérations CELCM0001 après correction:" -ForegroundColor Cyan
    if ($verificationResponse -and $verificationResponse.length -gt 0) {
        foreach ($operation in $verificationResponse) {
            if ($operation.typeOperation -eq "FRAIS_TRANSACTION") {
                Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
                Write-Host "    * Type: $($operation.typeOperation)" -ForegroundColor Green
                Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
                Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
                Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
                
                # Vérifier si le montant est correct
                if ($operation.montant -eq 3776700.0) {
                    Write-Host "    * ❌ Montant incorrect (3,776,700 FCFA)" -ForegroundColor Red
                } elseif ($operation.montant -eq 31800.0) {
                    Write-Host "    * ✅ Montant correct (31,800 FCFA)" -ForegroundColor Green
                } else {
                    Write-Host "    * ⚠️ Montant modifié: $($operation.montant) FCFA" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  ⚠️ Aucune opération trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Correction terminée ===" -ForegroundColor Green 