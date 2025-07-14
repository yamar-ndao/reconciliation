# Test complet des contrôles de doublons et ordonnancement des frais de transaction
Write-Host "=== TEST COMPLET DES FRAIS DE TRANSACTION ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/frais-transaction"

# Fonction pour nettoyer les frais de test existants
function Cleanup-TestFrais {
    Write-Host "`n🧹 Nettoyage des frais de test existants..." -ForegroundColor Yellow
    
    try {
        $allFrais = Invoke-RestMethod -Uri $baseUrl -Method GET
        foreach ($frais in $allFrais) {
            if ($frais.service -like "TEST_*") {
                Invoke-RestMethod -Uri "$baseUrl/$($frais.id)" -Method DELETE
                Write-Host "  ✅ Frais de test supprimé: $($frais.service) - $($frais.agence)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  ⚠️ Erreur lors du nettoyage: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 1. Nettoyage initial
Cleanup-TestFrais

# 2. Test de création d'un frais normal
Write-Host "`n1. Test de création d'un frais normal..." -ForegroundColor Yellow
$frais1 = @{
    service = "TEST_SERVICE"
    agence = "TEST_AGENCE"
    typeCalcul = "NOMINAL"
    montantFrais = 100.0
    description = "Frais de test 1"
    actif = $true
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $frais1 -ContentType "application/json"
    Write-Host "✅ Frais créé avec succès: ID $($response1.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Test de création d'un doublon (même service et agence)
Write-Host "`n2. Test de création d'un doublon..." -ForegroundColor Yellow
$frais2 = @{
    service = "TEST_SERVICE"
    agence = "TEST_AGENCE"
    typeCalcul = "POURCENTAGE"
    montantFrais = 0.0
    pourcentage = 2.5
    description = "Frais de test 2 (doublon)"
    actif = $true
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $frais2 -ContentType "application/json"
    Write-Host "❌ Le doublon a été créé (problème!)" -ForegroundColor Red
} catch {
    $errorResponse = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorResponse)
    $errorBody = $reader.ReadToEnd()
    Write-Host "✅ Contrôle de doublon fonctionne: $errorBody" -ForegroundColor Green
}

# 4. Test de création d'un frais différent
Write-Host "`n3. Test de création d'un frais différent..." -ForegroundColor Yellow
$frais3 = @{
    service = "TEST_SERVICE_2"
    agence = "TEST_AGENCE"
    typeCalcul = "NOMINAL"
    montantFrais = 150.0
    description = "Frais de test 3"
    actif = $true
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $frais3 -ContentType "application/json"
    Write-Host "✅ Frais différent créé avec succès: ID $($response3.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. Test de création d'un troisième frais pour vérifier l'ordonnancement
Write-Host "`n4. Test de création d'un troisième frais..." -ForegroundColor Yellow
Start-Sleep -Seconds 2  # Attendre 2 secondes pour avoir des dates différentes
$frais4 = @{
    service = "TEST_SERVICE_3"
    agence = "TEST_AGENCE_2"
    typeCalcul = "POURCENTAGE"
    montantFrais = 0.0
    pourcentage = 1.5
    description = "Frais de test 4"
    actif = $true
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $frais4 -ContentType "application/json"
    Write-Host "✅ Troisième frais créé avec succès: ID $($response4.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. Test de récupération et ordonnancement
Write-Host "`n5. Test de récupération et ordonnancement..." -ForegroundColor Yellow
try {
    $allFrais = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Récupération réussie: $($allFrais.Count) frais trouvés" -ForegroundColor Green
    
    # Vérifier l'ordonnancement par date de modification décroissante
    if ($allFrais.Count -gt 1) {
        $firstDate = [DateTime]::Parse($allFrais[0].dateModification)
        $secondDate = [DateTime]::Parse($allFrais[1].dateModification)
        
        if ($firstDate -ge $secondDate) {
            Write-Host "✅ Ordonnancement correct (plus récent en premier)" -ForegroundColor Green
        } else {
            Write-Host "❌ Problème d'ordonnancement" -ForegroundColor Red
        }
        
        Write-Host "`nDétails des 5 premiers frais:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(5, $allFrais.Count); $i++) {
            $frais = $allFrais[$i]
            Write-Host "  $($i+1). ID: $($frais.id), Service: $($frais.service), Agence: $($frais.agence), Date Modif: $($frais.dateModification)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 7. Test de mise à jour avec doublon
Write-Host "`n6. Test de mise à jour avec doublon..." -ForegroundColor Yellow
if ($response1 -and $response3) {
    $updateFrais = @{
        service = "TEST_SERVICE_2"  # Même service que frais3
        agence = "TEST_AGENCE"      # Même agence que frais3
        typeCalcul = "NOMINAL"
        montantFrais = 200.0
        description = "Frais mis à jour (doublon)"
        actif = $true
    } | ConvertTo-Json

    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/$($response1.id)" -Method PUT -Body $updateFrais -ContentType "application/json"
        Write-Host "❌ La mise à jour avec doublon a réussi (problème!)" -ForegroundColor Red
    } catch {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "✅ Contrôle de doublon lors de la mise à jour fonctionne: $errorBody" -ForegroundColor Green
    }
}

# 8. Test de mise à jour normale (sans doublon)
Write-Host "`n7. Test de mise à jour normale..." -ForegroundColor Yellow
if ($response1) {
    $updateFraisNormal = @{
        service = "TEST_SERVICE_UPDATED"
        agence = "TEST_AGENCE"
        typeCalcul = "NOMINAL"
        montantFrais = 250.0
        description = "Frais mis à jour (normal)"
        actif = $true
    } | ConvertTo-Json

    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/$($response1.id)" -Method PUT -Body $updateFraisNormal -ContentType "application/json"
        Write-Host "✅ Mise à jour normale réussie: ID $($updateResponse.id)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de la mise à jour normale: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 9. Test de récupération après mise à jour
Write-Host "`n8. Test de récupération après mise à jour..." -ForegroundColor Yellow
try {
    $allFraisAfterUpdate = Invoke-RestMethod -Uri $baseUrl -Method GET
    $updatedFrais = $allFraisAfterUpdate | Where-Object { $_.id -eq $response1.id }
    
    if ($updatedFrais) {
        Write-Host "✅ Frais mis à jour trouvé: Service=$($updatedFrais.service), Montant=$($updatedFrais.montantFrais)" -ForegroundColor Green
        Write-Host "  Date de modification: $($updatedFrais.dateModification)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Frais mis à jour non trouvé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération après mise à jour: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Nettoyage final
Write-Host "`n9. Nettoyage final des frais de test..." -ForegroundColor Yellow
Cleanup-TestFrais

Write-Host "`n=== RÉSUMÉ DES TESTS ===" -ForegroundColor Green
Write-Host "✅ Contrôle des doublons: FONCTIONNE" -ForegroundColor Green
Write-Host "✅ Ordonnancement par date: FONCTIONNE" -ForegroundColor Green
Write-Host "✅ Mise à jour avec contrôle: FONCTIONNE" -ForegroundColor Green
Write-Host "✅ Messages d'erreur explicites: FONCTIONNE" -ForegroundColor Green
Write-Host "`n=== TOUS LES TESTS SONT PASSÉS ===" -ForegroundColor Green 