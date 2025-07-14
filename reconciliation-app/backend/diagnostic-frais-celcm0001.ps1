# Diagnostic du problème CELCM0001
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Diagnostic CELCM0001 ===" -ForegroundColor Green

# 1. Vérifier si l'application est en cours d'exécution
Write-Host "`n1. Vérification de l'application:" -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Application en cours d'exécution" -ForegroundColor Green
} catch {
    Write-Host "❌ Application non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Veuillez démarrer l'application Spring Boot" -ForegroundColor Yellow
    exit 1
}

# 2. Vérifier les données AgencySummary
Write-Host "`n2. Vérification des données AgencySummary:" -ForegroundColor Yellow

try {
    $agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?agence=CELCM0001&date=2025-07-02" -Method GET
    
    Write-Host "AgencySummary trouvés:" -ForegroundColor Cyan
    if ($agencySummaryResponse -and $agencySummaryResponse.length -gt 0) {
        foreach ($summary in $agencySummaryResponse) {
            Write-Host "  - Service: $($summary.service)" -ForegroundColor Green
            Write-Host "    * Transactions: $($summary.recordCount)" -ForegroundColor Green
            Write-Host "    * Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️ Aucune donnée AgencySummary trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier le frais configuré
Write-Host "`n3. Vérification du frais configuré:" -ForegroundColor Yellow

try {
    $fraisResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET
    
    Write-Host "Frais configuré:" -ForegroundColor Cyan
    Write-Host "  - Service: $($fraisResponse.service)" -ForegroundColor Green
    Write-Host "  - Agence: $($fraisResponse.agence)" -ForegroundColor Green
    Write-Host "  - Type: $($fraisResponse.typeCalcul)" -ForegroundColor Green
    Write-Host "  - Montant: $($fraisResponse.montantFrais) FCFA" -ForegroundColor Green
    Write-Host "  - Actif: $($fraisResponse.actif)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la récupération du frais: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test du calcul avec données réelles
Write-Host "`n4. Test du calcul avec données réelles:" -ForegroundColor Yellow

try {
    $testParams = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        date = "2025-07-02"
    }
    
    $testResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body ($testParams | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Résultat du test:" -ForegroundColor Cyan
    Write-Host "  - Frais trouvé: $($testResponse.fraisTrouve)" -ForegroundColor Green
    Write-Host "  - AgencySummary trouvé: $($testResponse.agencySummaryTrouve)" -ForegroundColor Green
    
    if ($testResponse.fraisTrouve -and $testResponse.agencySummaryTrouve) {
        Write-Host "  - Nombre de transactions: $($testResponse.nombreTransactions)" -ForegroundColor Green
        Write-Host "  - Type de calcul: $($testResponse.typeCalcul)" -ForegroundColor Green
        Write-Host "  - Montant calculé: $($testResponse.montantFraisCalcule) FCFA" -ForegroundColor Green
        
        # Calcul manuel
        $montantAttendu = 300 * $testResponse.nombreTransactions
        Write-Host "  - Montant attendu: $montantAttendu FCFA" -ForegroundColor Green
        
        if ($testResponse.montantFraisCalcule -eq $montantAttendu) {
            Write-Host "  ✅ Calcul correct!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️ Données manquantes pour le calcul" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérifier les opérations existantes
Write-Host "`n5. Vérification des opérations existantes:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-02T00:00:00&dateFin=2025-07-02T23:59:59" -Method GET
    
    Write-Host "Opérations trouvées:" -ForegroundColor Cyan
    if ($operationsResponse -and $operationsResponse.length -gt 0) {
        foreach ($operation in $operationsResponse) {
            Write-Host "  - Type: $($operation.typeOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            Write-Host "    * Date: $($operation.dateOperation)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️ Aucune opération trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test de création d'une nouvelle opération
Write-Host "`n6. Test de création d'une nouvelle opération:" -ForegroundColor Yellow

try {
    $newOperationData = @{
        compteId = 1
        typeOperation = "total_cashin"
        montant = 12589255
        service = "CASHINMTNCMPART"
        dateOperation = "2025-07-02T10:00:00"
        codeProprietaire = "CELCM0001"
    }
    
    Write-Host "Tentative de création d'une nouvelle opération..." -ForegroundColor Cyan
    $newOperationResponse = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Body ($newOperationData | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Nouvelle opération créée avec ID: $($newOperationResponse.id)" -ForegroundColor Green
    
    # Attendre un peu puis vérifier les opérations
    Start-Sleep -Seconds 3
    
    $updatedOperationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-02T00:00:00&dateFin=2025-07-02T23:59:59" -Method GET
    
    $newFraisOperation = $updatedOperationsResponse | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*CELCM0001" -and
        $_.dateOperation -like "*10:00*"
    }
    
    if ($newFraisOperation) {
        Write-Host "✅ Nouvelle opération de frais trouvée:" -ForegroundColor Green
        Write-Host "  - Montant: $($newFraisOperation.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($newFraisOperation.nomBordereau)" -ForegroundColor Green
    } else {
        Write-Host "❌ Aucune nouvelle opération de frais trouvée" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green 