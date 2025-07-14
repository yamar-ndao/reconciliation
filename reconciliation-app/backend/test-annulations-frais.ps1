# Test pour vérifier que les annulations calculent automatiquement leurs frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test des frais automatiques pour les annulations ===" -ForegroundColor Green

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer une annulation BO avec service et recordCount
    Write-Host "`n2. Création d'une annulation BO avec frais automatiques..." -ForegroundColor Cyan
    
    $annulationBO = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "annulation_bo"
        montant = 5000000  # 5,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "ANNULATION_BO_TEST"
        service = "CASHINOMCMPART2"  # Service avec frais configurés
        dateOperation = "2025-07-08"
        recordCount = 25  # 25 transactions pour cette annulation
    }
    
    $jsonBody = $annulationBO | ConvertTo-Json -Depth 3
    Write-Host "Données annulation BO: $jsonBody" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Annulation BO créée avec ID: $($result.id)" -ForegroundColor Green
    
    # 3. Attendre le calcul des frais
    Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # 4. Créer une annulation Partenaire avec service et recordCount
    Write-Host "`n4. Création d'une annulation Partenaire avec frais automatiques..." -ForegroundColor Cyan
    
    $annulationPartenaire = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "annulation_partenaire"
        montant = 3000000  # 3,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "ANNULATION_PARTENAIRE_TEST"
        service = "CM_PAIEMENTMARCHAND_OM_TP"  # Service avec frais en pourcentage
        dateOperation = "2025-07-08"
        recordCount = 15  # 15 transactions pour cette annulation
    }
    
    $jsonBody2 = $annulationPartenaire | ConvertTo-Json -Depth 3
    Write-Host "Données annulation Partenaire: $jsonBody2" -ForegroundColor Yellow
    
    $response2 = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody2 -ContentType "application/json"
    $result2 = $response2.Content | ConvertFrom-Json
    
    Write-Host "✅ Annulation Partenaire créée avec ID: $($result2.id)" -ForegroundColor Green
    
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
    foreach ($op in $recentOperations) {
        Write-Host "  - ID: $($op.id), Type: $($op.typeOperation), Montant: $($op.montant) FCFA, Service: $($op.service)" -ForegroundColor White
        
        if ($op.typeOperation -eq "annulation_bo" -and $op.service -eq "CASHINOMCMPART2") {
            Write-Host "    📋 Annulation BO créée avec montant: $($op.montant) FCFA" -ForegroundColor Cyan
        } elseif ($op.typeOperation -eq "annulation_partenaire" -and $op.service -eq "CM_PAIEMENTMARCHAND_OM_TP") {
            Write-Host "    📋 Annulation Partenaire créée avec montant: $($op.montant) FCFA" -ForegroundColor Cyan
        } elseif ($op.typeOperation -eq "FRAIS_TRANSACTION") {
            if ($op.service -eq "CASHINOMCMPART2") {
                $fraisAttendus = 1 * 300  # 1 transaction × montant paramétré (pour annulation)
                if ($op.montant -eq $fraisAttendus) {
                    Write-Host "    ✅ Frais corrects pour annulation BO: $($op.montant) FCFA (1 × 300)" -ForegroundColor Green
                } else {
                    Write-Host "    ❌ Frais incorrects pour annulation BO: $($op.montant) FCFA (attendu: $fraisAttendus)" -ForegroundColor Red
                }
            } elseif ($op.service -eq "CM_PAIEMENTMARCHAND_OM_TP") {
                $fraisAttendus = 3000000 * 0.01  # montant × 1%
                if ($op.montant -eq $fraisAttendus) {
                    Write-Host "    ✅ Frais corrects pour annulation Partenaire: $($op.montant) FCFA (1% de 3,000,000)" -ForegroundColor Green
                } else {
                    Write-Host "    ❌ Frais incorrects pour annulation Partenaire: $($op.montant) FCFA (attendu: $fraisAttendus)" -ForegroundColor Red
                }
            }
        }
    }
    
    # 7. Vérifier les logs
    Write-Host "`n7. Vérification des logs..." -ForegroundColor Cyan
    Write-Host "Regardez les logs de l'application Spring Boot pour voir les messages DEBUG" -ForegroundColor Yellow
    Write-Host "Vous devriez voir:" -ForegroundColor Yellow
    Write-Host "  - 'Opération: annulation_bo - CASHINOMCMPART2 - CELCM0001'" -ForegroundColor White
    Write-Host "  - 'Opération: annulation_partenaire - CM_PAIEMENTMARCHAND_OM_TP - CELCM0001'" -ForegroundColor White
    Write-Host "  - 'Calcul frais fixe' ou 'Calcul frais en pourcentage'" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 