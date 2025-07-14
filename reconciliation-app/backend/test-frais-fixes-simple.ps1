# Test simple du calcul des frais fixes
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test simple du calcul des frais fixes ===" -ForegroundColor Green

# 1. Test du calcul manuel
Write-Host "`n1. Test du calcul manuel:" -ForegroundColor Yellow

$testParams = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    typeCalcul = "NOMINAL"
    montantFrais = 300
    nombreTransactions = 106
    volumeOperation = 12589255
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation" -Method GET -Body $testParams -ContentType "application/json"
    
    Write-Host "Résultat du test manuel:" -ForegroundColor Cyan
    Write-Host "  - Type: $($response.type)" -ForegroundColor Green
    Write-Host "  - Formule: $($response.formule)" -ForegroundColor Green
    Write-Host "  - Montant paramétré: $($response.montantParametre) FCFA" -ForegroundColor Green
    Write-Host "  - Nombre de transactions: $($response.nombreTransactions)" -ForegroundColor Green
    Write-Host "  - Montant calculé: $($response.montantFraisCalcule) FCFA" -ForegroundColor Green
    
    # Vérifier le calcul
    $calculAttendu = 300 * 106
    if ($response.montantFraisCalcule -eq $calculAttendu) {
        Write-Host "  ✅ Calcul correct! $calculAttendu FCFA" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
        Write-Host "    - Attendu: $calculAttendu FCFA" -ForegroundColor Red
        Write-Host "    - Calculé: $($response.montantFraisCalcule) FCFA" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors du test manuel: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test avec données réelles (si disponibles)
Write-Host "`n2. Test avec données réelles:" -ForegroundColor Yellow

try {
    $realTestParams = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        date = "2025-07-01"
    }
    
    $realResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $realTestParams -ContentType "application/json"
    
    Write-Host "Résultat du test avec données réelles:" -ForegroundColor Cyan
    Write-Host "  - Frais trouvé: $($realResponse.fraisTrouve)" -ForegroundColor Green
    Write-Host "  - AgencySummary trouvé: $($realResponse.agencySummaryTrouve)" -ForegroundColor Green
    
    if ($realResponse.fraisTrouve -and $realResponse.agencySummaryTrouve) {
        Write-Host "  - Nombre de transactions: $($realResponse.nombreTransactions)" -ForegroundColor Green
        Write-Host "  - Type de calcul: $($realResponse.typeCalcul)" -ForegroundColor Green
        Write-Host "  - Formule: $($realResponse.formule)" -ForegroundColor Green
        Write-Host "  - Montant calculé: $($realResponse.montantFraisCalcule) FCFA" -ForegroundColor Green
        
        # Vérifier si c'est un frais fixe
        if ($realResponse.typeCalcul -eq "Frais fixe") {
            Write-Host "  ✅ Frais fixe détecté!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Frais en pourcentage détecté" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️ Données manquantes pour le test" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test avec données réelles: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test de correction automatique
Write-Host "`n3. Test de correction automatique:" -ForegroundColor Yellow

try {
    $correctionParams = @{
        date = "2025-07-01"
        service = "CASHINMTNCMPART"
        agences = @("CELCM0001")
    }
    
    $correctionResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/correct-frais-amounts" -Method GET -Body $correctionParams -ContentType "application/json"
    
    Write-Host "Résultat de la correction:" -ForegroundColor Cyan
    Write-Host "  - Total agences: $($correctionResponse.totalAgences)" -ForegroundColor Green
    Write-Host "  - Corrections appliquées: $($correctionResponse.correctionsAppliquees)" -ForegroundColor Green
    
    if ($correctionResponse.corrections -and $correctionResponse.corrections.length -gt 0) {
        foreach ($correction in $correctionResponse.corrections) {
            Write-Host "  - Agence: $($correction.agence)" -ForegroundColor Green
            Write-Host "    * Status: $($correction.status)" -ForegroundColor Green
            if ($correction.operationTrouvee) {
                Write-Host "    * Montant actuel: $($correction.montantActuel) FCFA" -ForegroundColor Green
                Write-Host "    * Montant correct: $($correction.montantCorrect) FCFA" -ForegroundColor Green
                if ($correction.correctionAppliquee) {
                    Write-Host "    * ✅ Correction appliquée!" -ForegroundColor Green
                }
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 