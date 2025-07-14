# Test de création d'une nouvelle opération pour vérifier le calcul des frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test de création d'opération avec calcul des frais corrigé ===" -ForegroundColor Green

# 1. Vérifier les données AgencySummary
Write-Host "`n1. Données AgencySummary pour CELCM0001:" -ForegroundColor Yellow

$agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?agence=CELCM0001&date=2025-07-01" -Method GET

Write-Host "AgencySummary disponibles:" -ForegroundColor Cyan
foreach ($summary in $agencySummaryResponse) {
    Write-Host "  - Service: $($summary.service), Transactions: $($summary.recordCount), Volume: $($summary.totalVolume) FCFA" -ForegroundColor Cyan
}

# 2. Vérifier le frais configuré
Write-Host "`n2. Frais configuré:" -ForegroundColor Yellow

$fraisResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET

Write-Host "Frais configuré:" -ForegroundColor Cyan
Write-Host "  - Montant: $($fraisResponse.montantFrais) FCFA" -ForegroundColor Cyan
Write-Host "  - Type: $($fraisResponse.typeCalcul)" -ForegroundColor Cyan

# 3. Calculer le montant attendu
$targetSummary = $agencySummaryResponse | Where-Object { $_.service -eq "CASHINMTNCMPART" }
if ($targetSummary) {
    $nombreTransactions = $targetSummary.recordCount
    $montantFrais = $fraisResponse.montantFrais
    $montantAttendu = $montantFrais * $nombreTransactions
    
    Write-Host "`n3. Calcul attendu:" -ForegroundColor Yellow
    Write-Host "  - Nombre de transactions: $nombreTransactions" -ForegroundColor Green
    Write-Host "  - Montant frais: $montantFrais FCFA" -ForegroundColor Green
    Write-Host "  - Montant attendu: $montantAttendu FCFA" -ForegroundColor Green
}

# 4. Créer une nouvelle opération avec un timestamp unique
$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
$operationData = @{
    compteId = 1
    typeOperation = "total_cashin"
    montant = 12589255
    service = "CASHINMTNCMPART"
    dateOperation = "2025-07-01T$timestamp"
    codeProprietaire = "CELCM0001"
}

Write-Host "`n4. Création d'une nouvelle opération:" -ForegroundColor Yellow
Write-Host "  - Date: $($operationData.dateOperation)" -ForegroundColor Cyan
Write-Host "  - Service: $($operationData.service)" -ForegroundColor Cyan
Write-Host "  - Montant: $($operationData.montant) FCFA" -ForegroundColor Cyan

try {
    $operationResponse = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Body ($operationData | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Opération créée avec ID: $($operationResponse.id)" -ForegroundColor Green
    
    # 5. Attendre un peu puis vérifier les opérations
    Write-Host "`n5. Vérification des opérations créées:" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-01T00:00:00&dateFin=2025-07-01T23:59:59" -Method GET
    
    # Chercher l'opération de frais créée pour cette nouvelle opération
    $newFraisOperation = $operationsResponse | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*CELCM0001" -and 
        $_.dateOperation -like "*$timestamp*"
    }
    
    if ($newFraisOperation) {
        Write-Host "✅ Nouvelle opération de frais trouvée:" -ForegroundColor Green
        Write-Host "  - Montant: $($newFraisOperation.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($newFraisOperation.nomBordereau)" -ForegroundColor Green
        Write-Host "  - Date: $($newFraisOperation.dateOperation)" -ForegroundColor Green
        
        # Vérifier si le calcul est correct
        if ($newFraisOperation.montant -eq $montantAttendu) {
            Write-Host "  ✅ Calcul correct! Montant attendu: $montantAttendu FCFA" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
            Write-Host "    - Montant calculé: $($newFraisOperation.montant) FCFA" -ForegroundColor Red
            Write-Host "    - Montant attendu: $montantAttendu FCFA" -ForegroundColor Red
            Write-Host "    - Différence: $($newFraisOperation.montant - $montantAttendu) FCFA" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Aucune nouvelle opération de frais trouvée" -ForegroundColor Red
        
        # Afficher toutes les opérations de frais pour cette date
        $allFraisOperations = $operationsResponse | Where-Object { $_.typeOperation -eq "FRAIS_TRANSACTION" -and $_.nomBordereau -like "*CELCM0001" }
        Write-Host "Opérations de frais existantes:" -ForegroundColor Cyan
        foreach ($frais in $allFraisOperations) {
            Write-Host "  - Montant: $($frais.montant) FCFA, Date: $($frais.dateOperation), Bordereau: $($frais.nomBordereau)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la création de l'opération: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test du calcul via l'API de test
Write-Host "`n6. Test du calcul via l'API:" -ForegroundColor Yellow

$testParams = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    date = "2025-07-01"
}

$testResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"

Write-Host "Résultat du test API:" -ForegroundColor Cyan
$testResponse | ConvertTo-Json -Depth 10

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 