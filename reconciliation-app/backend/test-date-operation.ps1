# Test pour vérifier que le champ de date fonctionne dans l'ajout d'opération
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du champ de date dans l'ajout d'opération ===" -ForegroundColor Green

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer une opération avec une date spécifique
    Write-Host "`n2. Création d'une opération avec date spécifique..." -ForegroundColor Cyan
    
    $operationWithDate = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "transaction_cree"
        montant = 1000000  # 1,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "TEST_DATE_OPERATION"
        service = "CASHINOMCMPART2"
        dateOperation = "2025-06-15"  # Date spécifique
    }
    
    $jsonBody = $operationWithDate | ConvertTo-Json -Depth 3
    Write-Host "Données opération avec date: $jsonBody" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Opération créée avec ID: $($result.id)" -ForegroundColor Green
    
    # 3. Vérifier que la date a été correctement enregistrée
    Write-Host "`n3. Vérification de la date enregistrée..." -ForegroundColor Cyan
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $createdOperation = $operations | Where-Object { $_.id -eq $result.id }
    
    if ($createdOperation) {
        Write-Host "✅ Opération trouvée dans la liste" -ForegroundColor Green
        Write-Host "  - ID: $($createdOperation.id)" -ForegroundColor White
        Write-Host "  - Date d'opération: $($createdOperation.dateOperation)" -ForegroundColor White
        Write-Host "  - Type: $($createdOperation.typeOperation)" -ForegroundColor White
        Write-Host "  - Montant: $($createdOperation.montant) FCFA" -ForegroundColor White
        
        # Vérifier que la date correspond à celle envoyée
        $expectedDate = "2025-06-15"
        if ($createdOperation.dateOperation -like "*$expectedDate*") {
            Write-Host "✅ Date correctement enregistrée: $($createdOperation.dateOperation)" -ForegroundColor Green
        } else {
            Write-Host "❌ Date incorrecte: attendu $expectedDate, reçu $($createdOperation.dateOperation)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Opération non trouvée dans la liste" -ForegroundColor Red
    }
    
    # 4. Créer une opération avec la date d'aujourd'hui (par défaut)
    Write-Host "`n4. Création d'une opération avec date d'aujourd'hui..." -ForegroundColor Cyan
    
    $operationToday = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "total_cashin"
        montant = 500000  # 500,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "TEST_DATE_TODAY"
        service = "CASHINOMCMPART2"
        # Pas de dateOperation -> devrait utiliser la date d'aujourd'hui
    }
    
    $jsonBody2 = $operationToday | ConvertTo-Json -Depth 3
    Write-Host "Données opération sans date: $jsonBody2" -ForegroundColor Yellow
    
    $response2 = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody2 -ContentType "application/json"
    $result2 = $response2.Content | ConvertFrom-Json
    
    Write-Host "✅ Opération créée avec ID: $($result2.id)" -ForegroundColor Green
    
    # 5. Vérifier la date de la deuxième opération
    Write-Host "`n5. Vérification de la date par défaut..." -ForegroundColor Cyan
    $operationsResponse2 = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations2 = $operationsResponse2.Content | ConvertFrom-Json
    
    $createdOperation2 = $operations2 | Where-Object { $_.id -eq $result2.id }
    
    if ($createdOperation2) {
        $today = Get-Date -Format "yyyy-MM-dd"
        Write-Host "✅ Opération trouvée dans la liste" -ForegroundColor Green
        Write-Host "  - ID: $($createdOperation2.id)" -ForegroundColor White
        Write-Host "  - Date d'opération: $($createdOperation2.dateOperation)" -ForegroundColor White
        Write-Host "  - Date d'aujourd'hui: $today" -ForegroundColor White
        
        if ($createdOperation2.dateOperation -like "*$today*") {
            Write-Host "✅ Date par défaut correcte (aujourd'hui)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Date différente de celle d'aujourd'hui: $($createdOperation2.dateOperation)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n=== Test terminé avec succès ===" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
} 