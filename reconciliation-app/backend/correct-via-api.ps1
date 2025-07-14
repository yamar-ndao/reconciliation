# Correction des frais CELCM0001 via l'API
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Correction des frais CELCM0001 via l'API ===" -ForegroundColor Green

# 1. Vérifier l'état avant correction
Write-Host "`n1. État avant correction:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    Write-Host "Opérations FRAIS_TRANSACTION CELCM0001:" -ForegroundColor Cyan
    foreach ($operation in $operations) {
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION" -and $operation.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
            Write-Host "    * Montant actuel: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            
            if ($operation.montant -eq 3776700.0) {
                Write-Host "    * ❌ À corriger (3,776,700 FCFA)" -ForegroundColor Red
            } elseif ($operation.montant -eq 31800.0) {
                Write-Host "    * ✅ Déjà correct (31,800 FCFA)" -ForegroundColor Green
            } else {
                Write-Host "    * ⚠️ Montant inattendu: $($operation.montant) FCFA" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Exécuter la correction via l'API
Write-Host "`n2. Exécution de la correction via l'API:" -ForegroundColor Yellow

try {
    Write-Host "Appel de l'endpoint de correction..." -ForegroundColor Cyan
    $correctionResponse = Invoke-WebRequest -Uri "$baseUrl/sql/correct-frais-celcm0001" -Method POST -ContentType "application/json"
    $correctionResult = $correctionResponse.Content | ConvertFrom-Json
    
    if ($correctionResult.success) {
        Write-Host "✅ Correction réussie!" -ForegroundColor Green
        Write-Host "  - Lignes affectées 01/07/2025: $($correctionResult.affectedRows1)" -ForegroundColor Green
        Write-Host "  - Lignes affectées 02/07/2025: $($correctionResult.affectedRows2)" -ForegroundColor Green
        Write-Host "  - Message: $($correctionResult.message)" -ForegroundColor Green
        
        # Afficher les résultats avant correction
        if ($correctionResult.beforeCorrection) {
            Write-Host "`n  État avant correction:" -ForegroundColor Cyan
            foreach ($row in $correctionResult.beforeCorrection) {
                Write-Host "    - ID: $($row[0]), Montant: $($row[2]) FCFA, Bordereau: $($row[3])" -ForegroundColor White
            }
        }
        
        # Afficher les résultats après correction
        if ($correctionResult.afterCorrection) {
            Write-Host "`n  État après correction:" -ForegroundColor Cyan
            foreach ($row in $correctionResult.afterCorrection) {
                Write-Host "    - ID: $($row[0]), Montant: $($row[2]) FCFA, Bordereau: $($row[3])" -ForegroundColor White
            }
        }
        
    } else {
        Write-Host "❌ Erreur lors de la correction: $($correctionResult.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'appel API: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérification finale via l'API
Write-Host "`n3. Vérification finale:" -ForegroundColor Yellow

try {
    $finalResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $finalOperations = $finalResponse.Content | ConvertFrom-Json
    
    Write-Host "Opérations FRAIS_TRANSACTION CELCM0001 après correction:" -ForegroundColor Cyan
    foreach ($operation in $finalOperations) {
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION" -and $operation.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
            Write-Host "    * Type: $($operation.typeOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            
            # Vérifier si le montant est correct
            if ($operation.montant -eq 3776700.0) {
                Write-Host "    * ❌ Toujours incorrect (3,776,700 FCFA)" -ForegroundColor Red
            } elseif ($operation.montant -eq 31800.0) {
                Write-Host "    * ✅ Correct (31,800 FCFA)" -ForegroundColor Green
            } else {
                Write-Host "    * ⚠️ Montant modifié: $($operation.montant) FCFA" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Résumé
Write-Host "`n4. Résumé:" -ForegroundColor Yellow
Write-Host "  - Frais configuré: 300 FCFA par transaction" -ForegroundColor Cyan
Write-Host "  - Nombre de transactions (AgencySummary): 106" -ForegroundColor Cyan
Write-Host "  - Montant attendu: 300 × 106 = 31,800 FCFA" -ForegroundColor Cyan
Write-Host "  - Montant incorrect: 3,776,700 FCFA" -ForegroundColor Red
Write-Host "  - Correction appliquée via l'API" -ForegroundColor Green

Write-Host "`n=== Correction terminée ===" -ForegroundColor Green 