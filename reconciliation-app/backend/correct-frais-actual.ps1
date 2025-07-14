# Correction des frais CELCM0001 - Montant actuel
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Correction des frais CELCM0001 ===" -ForegroundColor Green

# 1. Correction pour le 01/07/2025
Write-Host "`n1. Correction pour le 01/07/2025:" -ForegroundColor Yellow

try {
    $correctionParams1 = @{
        date = "2025-07-01"
        service = "CASHINMTNCMPART"
        agences = @("CELCM0001")
    }
    
    $jsonBody1 = $correctionParams1 | ConvertTo-Json
    $correctionResponse1 = Invoke-WebRequest -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body $jsonBody1 -ContentType "application/json"
    $result1 = $correctionResponse1.Content | ConvertFrom-Json
    
    Write-Host "Résultat de la correction 01/07/2025:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($result1.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($result1.correctionsAppliquees)" -ForegroundColor Green
    
    if ($result1.corrections -and $result1.corrections.length -gt 0) {
        foreach ($correction in $result1.corrections) {
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
    
    $jsonBody2 = $correctionParams2 | ConvertTo-Json
    $correctionResponse2 = Invoke-WebRequest -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body $jsonBody2 -ContentType "application/json"
    $result2 = $correctionResponse2.Content | ConvertFrom-Json
    
    Write-Host "Résultat de la correction 02/07/2025:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($result2.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($result2.correctionsAppliquees)" -ForegroundColor Green
    
    if ($result2.corrections -and $result2.corrections.length -gt 0) {
        foreach ($correction in $result2.corrections) {
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
    $verificationResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $verificationResponse.Content | ConvertFrom-Json
    
    Write-Host "Opérations CELCM0001 après correction:" -ForegroundColor Cyan
    foreach ($operation in $operations) {
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION" -and $operation.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
            Write-Host "    * Type: $($operation.typeOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            
            # Vérifier si le montant est correct
            if ($operation.montant -eq 220402.8) {
                Write-Host "    * ❌ Montant incorrect (220,402.80 FCFA)" -ForegroundColor Red
            } elseif ($operation.montant -eq 31800.0) {
                Write-Host "    * ✅ Montant correct (31,800 FCFA)" -ForegroundColor Green
            } else {
                Write-Host "    * ⚠️ Montant modifié: $($operation.montant) FCFA" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Correction terminée ===" -ForegroundColor Green 