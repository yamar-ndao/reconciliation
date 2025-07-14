# Test d'une nouvelle opération pour vérifier le calcul automatique des frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test d'une nouvelle opération CELCM0001 ===" -ForegroundColor Green

# 1. Vérifier l'état actuel
Write-Host "`n1. État actuel des opérations CELCM0001:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $fraisOperations = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.service -eq "CASHINMTNCMPART" 
    }
    
    Write-Host "Opérations de frais existantes:" -ForegroundColor Cyan
    foreach ($operation in $fraisOperations) {
        Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
        Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
        Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Créer une nouvelle opération de test
Write-Host "`n2. Création d'une nouvelle opération de test:" -ForegroundColor Yellow

try {
    $newOperationData = @{
        compteId = 1
        typeOperation = "total_cashin"
        montant = 12589255
        service = "CASHINMTNCMPART"
        dateOperation = "2025-07-04T10:00:00"
        codeProprietaire = "CELCM0001"
        pays = "CM"
        banque = "SYSTEM"
    }
    
    $jsonBody = $newOperationData | ConvertTo-Json
    Write-Host "Données de la nouvelle opération:" -ForegroundColor Cyan
    Write-Host "  - Type: $($newOperationData.typeOperation)" -ForegroundColor Green
    Write-Host "  - Montant: $($newOperationData.montant) FCFA" -ForegroundColor Green
    Write-Host "  - Service: $($newOperationData.service)" -ForegroundColor Green
    Write-Host "  - Agence: $($newOperationData.codeProprietaire)" -ForegroundColor Green
    Write-Host "  - Date: $($newOperationData.dateOperation)" -ForegroundColor Green
    
    Write-Host "`nCréation de l'opération..." -ForegroundColor Cyan
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $newOperation = $createResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Nouvelle opération créée avec ID: $($newOperation.id)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Attendre un peu pour que les frais soient calculés
Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 4. Vérifier les nouvelles opérations
Write-Host "`n4. Vérification des nouvelles opérations:" -ForegroundColor Yellow

try {
    $updatedOperationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $updatedOperations = $updatedOperationsResponse.Content | ConvertFrom-Json
    
    # Trouver les opérations créées aujourd'hui
    $today = Get-Date -Format "yyyy-MM-dd"
    $newOperations = $updatedOperations | Where-Object { 
        $_.dateOperation -like "*$today*" 
    }
    
    Write-Host "Nouvelles opérations créées aujourd'hui:" -ForegroundColor Cyan
    foreach ($operation in $newOperations) {
        Write-Host "  - ID: $($operation.id)" -ForegroundColor Green
        Write-Host "    * Type: $($operation.typeOperation)" -ForegroundColor Green
        Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
        Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
        Write-Host "    * Date: $($operation.dateOperation)" -ForegroundColor Green
        Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
        
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION") {
            if ($operation.montant -eq 31800.0) {
                Write-Host "    * ✅ Montant correct (31,800 FCFA)" -ForegroundColor Green
            } elseif ($operation.montant -eq 3776700.0) {
                Write-Host "    * ❌ Montant incorrect (3,776,700 FCFA)" -ForegroundColor Red
            } else {
                Write-Host "    * ⚠️ Montant: $($operation.montant) FCFA" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérifier les données AgencySummary
Write-Host "`n5. Vérification des données AgencySummary:" -ForegroundColor Yellow

try {
    $agencySummaryResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary?agence=CELCM0001" -Method GET
    $agencySummaries = $agencySummaryResponse.Content | ConvertFrom-Json
    
    Write-Host "Données AgencySummary pour CELCM0001:" -ForegroundColor Cyan
    foreach ($summary in $agencySummaries) {
        if ($summary.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($summary.date)" -ForegroundColor Green
            Write-Host "    * Transactions: $($summary.recordCount)" -ForegroundColor Green
            Write-Host "    * Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
            Write-Host "    * Frais calculé (300 × $($summary.recordCount)): $($summary.recordCount * 300) FCFA" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Résumé du test
Write-Host "`n6. Résumé du test:" -ForegroundColor Yellow
Write-Host "  - Nouvelle opération créée pour tester le calcul automatique" -ForegroundColor Cyan
Write-Host "  - Frais attendus: 300 FCFA × nombre_transactions" -ForegroundColor Cyan
Write-Host "  - Si les frais sont corrects (31,800 FCFA), le système fonctionne" -ForegroundColor Green
Write-Host "  - Si les frais sont incorrects, il faut vérifier la logique de calcul" -ForegroundColor Red

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 