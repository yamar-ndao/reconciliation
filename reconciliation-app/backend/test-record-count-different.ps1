# Test pour vérifier que chaque ligne utilise son propre recordCount
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test recordCount différent pour chaque ligne ===" -ForegroundColor Green

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer deux opérations avec des recordCount différents
    Write-Host "`n2. Création d'opérations avec recordCount différents..." -ForegroundColor Cyan
    
    $testData1 = @{
        summary = @(
            @{
                agency = "CELCM0001"
                service = "CASHINOMCMPART2"
                country = "CM"
                date = "2025-07-06"
                totalVolume = 12589255
                recordCount = 50  # Premier recordCount
            }
        )
        timestamp = "2025-07-06T10:00:00"
    }
    
    $testData2 = @{
        summary = @(
            @{
                agency = "CELCM0001"
                service = "CASHINOMCMPART2"
                country = "CM"
                date = "2025-07-07"
                totalVolume = 25178510
                recordCount = 200  # Deuxième recordCount différent
            }
        )
        timestamp = "2025-07-07T10:00:00"
    }
    
    $jsonBody1 = $testData1 | ConvertTo-Json -Depth 3
    $jsonBody2 = $testData2 | ConvertTo-Json -Depth 3
    
    Write-Host "Création opération 1 avec recordCount=50..." -ForegroundColor Yellow
    $response1 = Invoke-WebRequest -Uri "$baseUrl/agency-summary" -Method POST -Body $jsonBody1 -ContentType "application/json"
    $result1 = $response1.Content | ConvertFrom-Json
    Write-Host "✅ Opération 1 créée: $($result1.message)" -ForegroundColor Green
    
    Start-Sleep -Seconds 2
    
    Write-Host "Création opération 2 avec recordCount=200..." -ForegroundColor Yellow
    $response2 = Invoke-WebRequest -Uri "$baseUrl/agency-summary" -Method POST -Body $jsonBody2 -ContentType "application/json"
    $result2 = $response2.Content | ConvertFrom-Json
    Write-Host "✅ Opération 2 créée: $($result2.message)" -ForegroundColor Green
    
    # 3. Attendre le calcul des frais
    Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # 4. Vérifier les opérations créées
    Write-Host "`n4. Vérification des opérations créées..." -ForegroundColor Cyan
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $recentOperations = $operations | Where-Object { 
        $_.dateOperation -like "*2025-07-06*" -or $_.dateOperation -like "*2025-07-07*"
    } | Sort-Object dateOperation -Descending
    
    Write-Host "Opérations récentes pour CELCM0001:" -ForegroundColor Yellow
    foreach ($op in $recentOperations) {
        Write-Host "  - ID: $($op.id), Type: $($op.typeOperation), Montant: $($op.montant) FCFA, Service: $($op.service)" -ForegroundColor White
        
        if ($op.typeOperation -eq "FRAIS_TRANSACTION" -and $op.service -eq "CASHINOMCMPART2") {
            if ($op.montant -eq 15000.0) {
                Write-Host "    ✅ Frais corrects pour recordCount=50: 15,000 FCFA (300 × 50)" -ForegroundColor Green
            } elseif ($op.montant -eq 60000.0) {
                Write-Host "    ✅ Frais corrects pour recordCount=200: 60,000 FCFA (300 × 200)" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Frais incorrects: $($op.montant) FCFA" -ForegroundColor Red
            }
        }
    }
    
    # 5. Vérifier les logs
    Write-Host "`n5. Vérification des logs..." -ForegroundColor Cyan
    Write-Host "Regardez les logs de l'application Spring Boot pour voir les messages DEBUG" -ForegroundColor Yellow
    Write-Host "Vous devriez voir:" -ForegroundColor Yellow
    Write-Host "  - 'Utilisation du recordCount depuis l'opération: 50'" -ForegroundColor White
    Write-Host "  - 'Utilisation du recordCount depuis l'opération: 200'" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 