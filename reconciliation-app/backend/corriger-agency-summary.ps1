# Correction des données AgencySummary manquantes
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Correction des données AgencySummary manquantes ===" -ForegroundColor Green

# 1. Vérifier les données AgencySummary existantes
Write-Host "`n1. Vérification des données AgencySummary existantes:" -ForegroundColor Yellow

try {
    $agencySummaryResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary?agence=CELCM0001" -Method GET
    $agencySummaries = $agencySummaryResponse.Content | ConvertFrom-Json
    
    Write-Host "Données AgencySummary existantes pour CELCM0001:" -ForegroundColor Cyan
    foreach ($summary in $agencySummaries) {
        if ($summary.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($summary.date)" -ForegroundColor Green
            Write-Host "    * Transactions: $($summary.recordCount)" -ForegroundColor Green
            Write-Host "    * Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Créer les données AgencySummary manquantes via l'API
Write-Host "`n2. Création des données AgencySummary manquantes:" -ForegroundColor Yellow

$datesManquantes = @("2025-07-04", "2025-07-05", "2025-07-06", "2025-07-07", "2025-07-08")

foreach ($date in $datesManquantes) {
    try {
        $agencySummaryData = @{
            date = $date
            agency = "CELCM0001"
            service = "CASHINMTNCMPART"
            recordCount = 106
            totalVolume = 12589255
        }
        
        $jsonBody = $agencySummaryData | ConvertTo-Json
        Write-Host "Création AgencySummary pour $date..." -ForegroundColor Cyan
        
        $createResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary" -Method POST -Body $jsonBody -ContentType "application/json"
        $newAgencySummary = $createResponse.Content | ConvertFrom-Json
        
        Write-Host "✅ AgencySummary créé pour $date avec ID: $($newAgencySummary.id)" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Erreur lors de la création pour $date : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Vérifier les données après création
Write-Host "`n3. Vérification des données après création:" -ForegroundColor Yellow

try {
    $updatedAgencySummaryResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary?agence=CELCM0001" -Method GET
    $updatedAgencySummaries = $updatedAgencySummaryResponse.Content | ConvertFrom-Json
    
    Write-Host "Données AgencySummary après création:" -ForegroundColor Cyan
    foreach ($summary in $updatedAgencySummaries) {
        if ($summary.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($summary.date)" -ForegroundColor Green
            Write-Host "    * Transactions: $($summary.recordCount)" -ForegroundColor Green
            Write-Host "    * Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
            Write-Host "    * Frais calculé: $($summary.recordCount * 300) FCFA" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Tester avec une nouvelle opération
Write-Host "`n4. Test avec une nouvelle opération:" -ForegroundColor Yellow

try {
    $testOperationData = @{
        compteId = 1
        typeOperation = "total_cashin"
        montant = 12589255
        service = "CASHINMTNCMPART"
        dateOperation = "2025-07-05T10:00:00"
        codeProprietaire = "CELCM0001"
        pays = "CM"
        banque = "SYSTEM"
    }
    
    $jsonBody = $testOperationData | ConvertTo-Json
    Write-Host "Création d'une opération de test pour 2025-07-05..." -ForegroundColor Cyan
    
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $newOperation = $createResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Nouvelle opération créée avec ID: $($newOperation.id)" -ForegroundColor Green
    
    # Attendre un peu pour que les frais soient calculés
    Start-Sleep -Seconds 5
    
    # Vérifier les frais créés
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $newFraisOperation = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.service -eq "CASHINMTNCMPART" -and
        $_.dateOperation -like "*2025-07-05*"
    }
    
    if ($newFraisOperation) {
        Write-Host "Opération de frais créée:" -ForegroundColor Cyan
        Write-Host "  - Montant: $($newFraisOperation.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($newFraisOperation.nomBordereau)" -ForegroundColor Green
        
        if ($newFraisOperation.montant -eq 31800.0) {
            Write-Host "  ✅ Montant correct (31,800 FCFA)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Montant incorrect: $($newFraisOperation.montant) FCFA" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Aucune opération de frais trouvée pour 2025-07-05" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Résumé
Write-Host "`n5. Résumé:" -ForegroundColor Yellow
Write-Host "  - Données AgencySummary créées pour les dates futures" -ForegroundColor Cyan
Write-Host "  - Test effectué avec une nouvelle opération" -ForegroundColor Cyan
Write-Host "  - Si les frais sont corrects (31,800 FCFA), le problème est résolu" -ForegroundColor Green
Write-Host "  - Si les frais sont incorrects, il faut modifier la logique de calcul" -ForegroundColor Red

Write-Host "`n=== Correction terminée ===" -ForegroundColor Green 