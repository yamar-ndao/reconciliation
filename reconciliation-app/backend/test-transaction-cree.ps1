# Test pour vérifier que les transactions créées calculent automatiquement leurs frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test des frais automatiques pour les transactions créées ===" -ForegroundColor Green

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer une transaction créée avec frais fixes
    Write-Host "`n2. Création d'une transaction créée avec frais fixes..." -ForegroundColor Cyan
    
    $transactionCree = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "transaction_cree"
        montant = 2000000  # 2,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "TRANSACTION_CREE_FIXES_TEST"
        service = "CASHINOMCMPART2"  # Service avec frais fixes (300 FCFA)
        dateOperation = "2025-07-08"
        recordCount = 10  # 10 transactions (ne doit PAS être utilisé pour les frais)
    }
    
    $jsonBody = $transactionCree | ConvertTo-Json -Depth 3
    Write-Host "Données transaction créée: $jsonBody" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Transaction créée avec ID: $($result.id)" -ForegroundColor Green
    
    # 3. Attendre le calcul des frais
    Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # 4. Créer une transaction créée avec frais en pourcentage
    Write-Host "`n4. Création d'une transaction créée avec frais en pourcentage..." -ForegroundColor Cyan
    
    $transactionCreePct = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "transaction_cree"
        montant = 1500000  # 1,500,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "TRANSACTION_CREE_PCT_TEST"
        service = "CM_PAIEMENTMARCHAND_OM_TP"  # Service avec frais en pourcentage (1%)
        dateOperation = "2025-07-08"
        recordCount = 8  # 8 transactions (ne doit PAS être utilisé pour les frais)
    }
    
    $jsonBody2 = $transactionCreePct | ConvertTo-Json -Depth 3
    Write-Host "Données transaction créée (pourcentage): $jsonBody2" -ForegroundColor Yellow
    
    $response2 = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody2 -ContentType "application/json"
    $result2 = $response2.Content | ConvertFrom-Json
    
    Write-Host "✅ Transaction créée (pourcentage) avec ID: $($result2.id)" -ForegroundColor Green
    
    # 5. Attendre le calcul des frais
    Write-Host "`n5. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # 6. Vérifier les opérations créées
    Write-Host "`n6. Vérification des opérations créées..." -ForegroundColor Cyan
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    $recentOperations = $operations | Where-Object { 
        $_.dateOperation -like "*2025-07-08*" 
    } | Sort-Object dateOperation -Descending
    
    Write-Host "Opérations récentes pour CELCM0001 (2025-07-08):" -ForegroundColor Yellow
    $recentOperations | ForEach-Object {
        $op = $_
        Write-Host "  - ID: $($op.id), Type: $($op.typeOperation), Montant: $($op.montant) FCFA, Service: $($op.service), Bordereau: $($op.nomBordereau)" -ForegroundColor White
    }
    
    # 7. Vérifier spécifiquement les transactions créées
    Write-Host "`n7. Vérification des transactions créées..." -ForegroundColor Cyan
    $transactionsCree = $recentOperations | Where-Object { $_.typeOperation -eq "transaction_cree" }
    $fraisTransactions = $recentOperations | Where-Object { $_.typeOperation -eq "FRAIS_TRANSACTION" }
    
    Write-Host "Transactions créées trouvées: $($transactionsCree.Count)" -ForegroundColor Yellow
    $transactionsCree | ForEach-Object {
        $op = $_
        Write-Host "  - Transaction créée: $($op.montant) FCFA, Service: $($op.service)" -ForegroundColor Green
    }
    
    Write-Host "Frais automatiques générés: $($fraisTransactions.Count)" -ForegroundColor Yellow
    $fraisTransactions | ForEach-Object {
        $op = $_
        Write-Host "  - Frais: $($op.montant) FCFA, Service: $($op.service)" -ForegroundColor Cyan
    }
    
    # 8. Validation des calculs
    Write-Host "`n8. Validation des calculs..." -ForegroundColor Cyan
    
    # Vérifier que les frais fixes sont bien 1 × montant paramétré (300 FCFA)
    $fraisFixes = $fraisTransactions | Where-Object { $_.service -eq "CASHINOMCMPART2" }
    if ($fraisFixes) {
        $montantAttendu = 300  # 1 × 300 FCFA
        if ($fraisFixes.montant -eq $montantAttendu) {
            Write-Host "✅ Frais fixes corrects: $($fraisFixes.montant) FCFA (attendu: $montantAttendu FCFA)" -ForegroundColor Green
        } else {
            Write-Host "❌ Frais fixes incorrects: $($fraisFixes.montant) FCFA (attendu: $montantAttendu FCFA)" -ForegroundColor Red
        }
    }
    
    # Vérifier que les frais en pourcentage sont bien montant × pourcentage
    $fraisPourcentage = $fraisTransactions | Where-Object { $_.service -eq "CM_PAIEMENTMARCHAND_OM_TP" }
    if ($fraisPourcentage) {
        $montantAttendu = 1500000 * 0.01  # 1,500,000 × 1% = 15,000 FCFA
        if ($fraisPourcentage.montant -eq $montantAttendu) {
            Write-Host "✅ Frais en pourcentage corrects: $($fraisPourcentage.montant) FCFA (attendu: $montantAttendu FCFA)" -ForegroundColor Green
        } else {
            Write-Host "❌ Frais en pourcentage incorrects: $($fraisPourcentage.montant) FCFA (attendu: $montantAttendu FCFA)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== Test terminé avec succès ===" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
} 