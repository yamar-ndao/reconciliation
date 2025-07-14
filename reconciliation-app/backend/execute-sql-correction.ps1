# Exécution de la correction SQL pour CELCM0001
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Exécution de la correction SQL CELCM0001 ===" -ForegroundColor Green

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
Write-Host "`n2. Exécution de la correction:" -ForegroundColor Yellow

try {
    # Créer une nouvelle opération de test pour déclencher la correction
    $testOperationData = @{
        compteId = 1
        typeOperation = "total_cashin"
        montant = 12589255
        service = "CASHINMTNCMPART"
        dateOperation = "2025-07-03T10:00:00"
        codeProprietaire = "CELCM0001"
    }
    
    $jsonBody = $testOperationData | ConvertTo-Json
    Write-Host "Création d'une opération de test pour déclencher la correction..." -ForegroundColor Cyan
    
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $newOperation = $createResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Opération de test créée avec ID: $($newOperation.id)" -ForegroundColor Green
    
    # Attendre un peu pour que les frais soient calculés
    Start-Sleep -Seconds 5
    
} catch {
    Write-Host "❌ Erreur lors de la création de test: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier l'état après correction
Write-Host "`n3. État après correction:" -ForegroundColor Yellow

try {
    $operationsResponseAfter = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operationsAfter = $operationsResponseAfter.Content | ConvertFrom-Json
    
    Write-Host "Opérations FRAIS_TRANSACTION CELCM0001 après correction:" -ForegroundColor Cyan
    foreach ($operation in $operationsAfter) {
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION" -and $operation.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            
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

# 4. Instructions pour la correction manuelle
Write-Host "`n4. Instructions pour la correction manuelle:" -ForegroundColor Yellow
Write-Host "Si les montants ne sont toujours pas corrects, exécutez le script SQL:" -ForegroundColor Cyan
Write-Host "  - Ouvrez votre client SQL (MySQL Workbench, phpMyAdmin, etc.)" -ForegroundColor White
Write-Host "  - Exécutez le contenu du fichier: correct-frais-celcm0001-final.sql" -ForegroundColor White
Write-Host "  - Ou utilisez les commandes SQL suivantes:" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "UPDATE operation SET montant = 31800.0" -ForegroundColor Yellow
Write-Host "WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'" -ForegroundColor Yellow
Write-Host "AND type_operation = 'FRAIS_TRANSACTION' AND montant = 3776700.0;" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "UPDATE operation SET montant = 31800.0" -ForegroundColor Yellow
Write-Host "WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'" -ForegroundColor Yellow
Write-Host "AND type_operation = 'FRAIS_TRANSACTION' AND montant = 3776700.0;" -ForegroundColor Yellow

Write-Host "`n=== Exécution terminée ===" -ForegroundColor Green 