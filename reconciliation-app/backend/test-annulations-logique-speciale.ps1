# Test de la logique spéciale pour les annulations
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test de la logique spéciale pour les annulations ===" -ForegroundColor Green

try {
    # 1. Vérifier l'état de l'application
    Write-Host "1. Vérification de l'application..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method GET
    Write-Host "✅ Application accessible" -ForegroundColor Green
    
    # 2. Créer une annulation BO avec frais fixes
    Write-Host "`n2. Création d'une annulation BO avec frais fixes..." -ForegroundColor Cyan
    
    $annulationBO = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "annulation_bo"
        montant = 5000000  # 5,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "ANNULATION_BO_FIXES_TEST"
        service = "CASHINOMCMPART2"  # Service avec frais fixes (300 FCFA)
        dateOperation = "2025-07-08"
        recordCount = 25  # 25 transactions (ne doit PAS être utilisé pour les frais)
    }
    
    $jsonBody = $annulationBO | ConvertTo-Json -Depth 3
    Write-Host "Données annulation BO: $jsonBody" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$baseUrl/operations" -Method POST -Body $jsonBody -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Annulation BO créée avec ID: $($result.id)" -ForegroundColor Green
    
    # 3. Attendre le calcul des frais
    Write-Host "`n3. Attente du calcul automatique des frais..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # 4. Créer une annulation Partenaire avec frais en pourcentage
    Write-Host "`n4. Création d'une annulation Partenaire avec frais en pourcentage..." -ForegroundColor Cyan
    
    $annulationPartenaire = @{
        compteId = 1  # ID du compte CELCM0001
        typeOperation = "annulation_partenaire"
        montant = 3000000  # 3,000,000 FCFA
        banque = "SYSTEM"
        nomBordereau = "ANNULATION_PARTENAIRE_PCT_TEST"
        service = "CM_PAIEMENTMARCHAND_OM_TP"  # Service avec frais en pourcentage (1%)
        dateOperation = "2025-07-08"
        recordCount = 15  # 15 transactions (ne doit PAS être utilisé pour les frais)
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
                $fraisAttendus = 1 * 300  # 1 transaction × 300 FCFA (logique spéciale pour annulation)
                if ($op.montant -eq $fraisAttendus) {
                    Write-Host "    ✅ Frais corrects pour annulation BO: $($op.montant) FCFA (1 × 300)" -ForegroundColor Green
                    Write-Host "    ✅ Logique spéciale respectée: toujours 1 transaction pour les annulations" -ForegroundColor Green
                } else {
                    Write-Host "    ❌ Frais incorrects pour annulation BO: $($op.montant) FCFA (attendu: $fraisAttendus)" -ForegroundColor Red
                    Write-Host "    ❌ La logique spéciale n'est pas respectée" -ForegroundColor Red
                }
            } elseif ($op.service -eq "CM_PAIEMENTMARCHAND_OM_TP") {
                $fraisAttendus = 3000000 * 0.01  # montant × 1%
                if ($op.montant -eq $fraisAttendus) {
                    Write-Host "    ✅ Frais corrects pour annulation Partenaire: $($op.montant) FCFA (1% de 3,000,000)" -ForegroundColor Green
                    Write-Host "    ✅ Utilise le montant de l'annulation pour les frais en pourcentage" -ForegroundColor Green
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
    Write-Host "  - 'Calcul frais fixe pour ANNULATION:'" -ForegroundColor White
    Write-Host "  - 'Type: annulation_bo' ou 'Type: annulation_partenaire'" -ForegroundColor White
    Write-Host "  - 'Nombre de transactions: 1 (toujours 1 pour les annulations)'" -ForegroundColor White
    Write-Host "  - 'Montant frais: 300 FCFA' (pour annulation BO)" -ForegroundColor White
    Write-Host "  - 'Montant frais: 30000 FCFA' (pour annulation Partenaire)" -ForegroundColor White
    
    # 8. Résumé de la logique
    Write-Host "`n8. Résumé de la logique spéciale pour les annulations:" -ForegroundColor Cyan
    Write-Host "  ✅ Frais fixes: Toujours 1 transaction (pas le recordCount)" -ForegroundColor Green
    Write-Host "  ✅ Frais en pourcentage: Utilise le montant de l'annulation" -ForegroundColor Green
    Write-Host "  ✅ Logique différente des autres opérations (total_cashin, total_paiement)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 