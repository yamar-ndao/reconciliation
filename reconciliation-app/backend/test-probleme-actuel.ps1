# Test pour identifier le problème actuel
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test du problème actuel ===" -ForegroundColor Red

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer une nouvelle opération avec recordCount explicite
    Write-Host "`n2. Création d'une nouvelle opération de test..." -ForegroundColor Cyan
    
    $testData = @{
        summary = @(
            @{
                agency = "CELCM0001"
                service = "CASHINMTNCMPART"
                country = "CM"
                date = "2025-07-05"
                totalVolume = 12589255
                recordCount = 106
            }
        )
        timestamp = "2025-07-05T10:00:00"
    }
    
    $jsonBody = $testData | ConvertTo-Json -Depth 3
    Write-Host "Données envoyées: $jsonBody" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$baseUrl/agency-summary" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Opération créée: $($result.message)" -ForegroundColor Green
    
    # 3. Attendre le calcul des frais
    Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # 4. Vérifier les opérations créées
    Write-Host "`n4. Vérification des opérations créées..." -ForegroundColor Cyan
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $recentOperations = $operations | Where-Object { 
        $_.dateOperation -like "*2025-07-05*" 
    } | Sort-Object dateOperation -Descending
    
    Write-Host "Opérations récentes pour CELCM0001:" -ForegroundColor Yellow
    foreach ($op in $recentOperations) {
        Write-Host "  - ID: $($op.id), Type: $($op.typeOperation), Montant: $($op.montant) FCFA" -ForegroundColor White
        
        if ($op.typeOperation -eq "FRAIS_TRANSACTION") {
            if ($op.montant -eq 31800.0) {
                Write-Host "    ✅ Frais corrects: 31,800 FCFA" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Frais incorrects: $($op.montant) FCFA (attendu: 31,800 FCFA)" -ForegroundColor Red
            }
        }
    }
    
    # 5. Vérifier les logs de l'application
    Write-Host "`n5. Vérification des logs..." -ForegroundColor Cyan
    Write-Host "Regardez les logs de l'application Spring Boot pour voir les messages DEBUG" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Red 