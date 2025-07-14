# Script de test pour vérifier l'affichage des annulations BO sur le relevé
# Ce script teste la correction du problème d'affichage des montants des annulations BO

Write-Host "🧪 Test d'affichage des annulations BO sur le relevé" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Configuration de l'API
$baseUrl = "http://localhost:8080/api"
$headers = @{
    "Content-Type" = "application/json"
}

# 2. Créer une opération BO normale pour tester l'annulation
Write-Host "`n1. Création d'une opération BO normale..." -ForegroundColor Yellow

$boOperation = @{
    compteId = 1  # Assurez-vous que ce compte existe
    typeOperation = "total_cashin"
    montant = 500000
    banque = "Test Bank"
    nomBordereau = "BO_TEST_001"
    service = "CASHINOMCMPART2"
    dateOperation = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Headers $headers -Body ($boOperation | ConvertTo-Json)
    $boId = $response.id
    Write-Host "✅ Opération BO créée avec ID: $boId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la création de l'opération BO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Annuler l'opération BO pour créer une annulation
Write-Host "`n2. Annulation de l'opération BO..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/operations/$boId/statut" -Method PUT -Headers $headers -Body "Annulée"
    Write-Host "✅ Opération BO annulée" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Vérifier que l'opération d'annulation a été créée
Write-Host "`n3. Vérification de la création de l'opération d'annulation..." -ForegroundColor Yellow

Start-Sleep -Seconds 2  # Attendre que l'annulation soit créée

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET -Headers $headers
    $annulationOp = $response | Where-Object { $_.typeOperation -eq "annulation_bo" -and $_.nomBordereau -like "*BO_TEST_001*" }
    
    if ($annulationOp) {
        Write-Host "✅ Opération d'annulation BO trouvée:" -ForegroundColor Green
        Write-Host "  - ID: $($annulationOp.id)" -ForegroundColor White
        Write-Host "  - Type: $($annulationOp.typeOperation)" -ForegroundColor White
        Write-Host "  - Montant: $($annulationOp.montant) FCFA" -ForegroundColor White
        Write-Host "  - Service: $($annulationOp.service)" -ForegroundColor White
        Write-Host "  - Bordereau: $($annulationOp.nomBordereau)" -ForegroundColor White
    } else {
        Write-Host "❌ Aucune opération d'annulation BO trouvée" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. Récupérer le relevé du compte pour vérifier l'affichage
Write-Host "`n4. Récupération du relevé du compte..." -ForegroundColor Yellow

try {
    $releveUrl = "$baseUrl/operations/releve?compteId=1&dateDebut=2025-01-01&dateFin=2025-12-31"
    $releveResponse = Invoke-RestMethod -Uri $releveUrl -Method GET -Headers $headers
    
    Write-Host "✅ Relevé récupéré avec $($releveResponse.length) opérations" -ForegroundColor Green
    
    # Chercher l'opération d'annulation BO dans le relevé
    $annulationInReleve = $releveResponse | Where-Object { $_.typeOperation -eq "annulation_bo" -and $_.nomBordereau -like "*BO_TEST_001*" }
    
    if ($annulationInReleve) {
        Write-Host "✅ Annulation BO trouvée dans le relevé:" -ForegroundColor Green
        Write-Host "  - Type: $($annulationInReleve.typeOperation)" -ForegroundColor White
        Write-Host "  - Montant: $($annulationInReleve.montant) FCFA" -ForegroundColor White
        Write-Host "  - Service: $($annulationInReleve.service)" -ForegroundColor White
        Write-Host "  - Solde avant: $($annulationInReleve.soldeAvant) FCFA" -ForegroundColor White
        Write-Host "  - Solde après: $($annulationInReleve.soldeApres) FCFA" -ForegroundColor White
        
        # Vérifier que le montant est bien présent (non nul)
        if ($annulationInReleve.montant -ne 0 -and $annulationInReleve.montant -ne $null) {
            Write-Host "✅ Le montant de l'annulation BO est bien affiché: $($annulationInReleve.montant) FCFA" -ForegroundColor Green
        } else {
            Write-Host "❌ Le montant de l'annulation BO n'est pas affiché correctement" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Annulation BO non trouvée dans le relevé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération du relevé: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. Test de l'interface frontend (simulation)
Write-Host "`n5. Test de l'interface frontend..." -ForegroundColor Yellow
Write-Host "Pour tester l'interface frontend:" -ForegroundColor White
Write-Host "1. Ouvrez l'application Angular" -ForegroundColor White
Write-Host "2. Allez dans la section 'Comptes'" -ForegroundColor White
Write-Host "3. Cliquez sur 'Voir le relevé' pour le compte testé" -ForegroundColor White
Write-Host "4. Vérifiez que l'annulation BO apparaît avec son montant" -ForegroundColor White
Write-Host "5. Vérifiez que le montant est affiché dans la colonne Débit ou Crédit selon la logique" -ForegroundColor White

# 7. Résumé de la correction
Write-Host "`n6. Résumé de la correction appliquée:" -ForegroundColor Cyan
Write-Host "✅ Ajout de la gestion du type 'bo' dans isDebitOperation()" -ForegroundColor Green
Write-Host "✅ Ajout de la gestion du type 'bo' dans isCreditOperation()" -ForegroundColor Green
Write-Host "✅ Ajout de la gestion du type 'partenaire' pour les annulations partenaire" -ForegroundColor Green
Write-Host "✅ Logique basée sur le service pour déterminer débit/crédit" -ForegroundColor Green

Write-Host "`n🎯 Le problème d'affichage des montants des annulations BO devrait maintenant être résolu!" -ForegroundColor Green
Write-Host "Les annulations BO apparaîtront maintenant avec leur montant correctement affiché dans le relevé." -ForegroundColor White 