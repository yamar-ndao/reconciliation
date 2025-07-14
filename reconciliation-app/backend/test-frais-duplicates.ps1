# Test des contrôles de doublons et ordonnancement des frais de transaction
Write-Host "=== TEST DES FRAIS DE TRANSACTION ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/frais-transaction"

# 1. Test de création d'un frais normal
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
}

# 2. Test de création d'un doublon (même service et agence)
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

# 3. Test de création d'un frais différent
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
}

# 4. Test de récupération et ordonnancement
Write-Host "`n4. Test de récupération et ordonnancement..." -ForegroundColor Yellow
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
        
        Write-Host "`nDétails des 3 premiers frais:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $allFrais.Count); $i++) {
            $frais = $allFrais[$i]
            Write-Host "  $($i+1). ID: $($frais.id), Service: $($frais.service), Agence: $($frais.agence), Date Modif: $($frais.dateModification)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test de mise à jour avec doublon
Write-Host "`n5. Test de mise à jour avec doublon..." -ForegroundColor Yellow
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

# 6. Nettoyage - Supprimer les frais de test
Write-Host "`n6. Nettoyage des frais de test..." -ForegroundColor Yellow
try {
    if ($response1) {
        Invoke-RestMethod -Uri "$baseUrl/$($response1.id)" -Method DELETE
        Write-Host "✅ Frais 1 supprimé" -ForegroundColor Green
    }
    if ($response3) {
        Invoke-RestMethod -Uri "$baseUrl/$($response3.id)" -Method DELETE
        Write-Host "✅ Frais 3 supprimé" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Erreur lors du nettoyage: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green 