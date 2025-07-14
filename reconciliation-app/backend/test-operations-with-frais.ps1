# Test des opérations avec frais
Write-Host "=== TEST DES OPÉRATIONS AVEC FRAIS ===" -ForegroundColor Green

# URL de base
$baseUrl = "http://localhost:8080/api"

# Test 1: Récupérer toutes les opérations avec frais
Write-Host "`n1. Récupération de toutes les opérations avec frais..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/operations/with-frais" -Method GET
    Write-Host "✅ Succès: ${response.Count} opérations récupérées" -ForegroundColor Green
    
    # Afficher les premières opérations avec frais
    $operationsWithFrais = $response | Where-Object { $_.fraisApplicable -eq $true }
    Write-Host "📊 Opérations avec frais applicables: ${operationsWithFrais.Count}" -ForegroundColor Cyan
    
    if ($operationsWithFrais.Count -gt 0) {
        Write-Host "`n📋 Exemples d'opérations avec frais:" -ForegroundColor Cyan
        $operationsWithFrais | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - ID: $($_.id), Service: $($_.service), Montant: $($_.montant) FCFA" -ForegroundColor White
            Write-Host "    Frais: $($_.montantFrais) FCFA ($($_.typeCalculFrais)), Description: $($_.descriptionFrais)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Récupérer une opération spécifique avec frais
Write-Host "`n2. Récupération d'une opération spécifique avec frais..." -ForegroundColor Yellow
try {
    # Récupérer d'abord la liste des opérations pour avoir un ID
    $operations = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    if ($operations.Count -gt 0) {
        $firstOperationId = $operations[0].id
        Write-Host "🔍 Test avec l'opération ID: $firstOperationId" -ForegroundColor Cyan
        
        $response = Invoke-RestMethod -Uri "$baseUrl/operations/$firstOperationId/with-frais" -Method GET
        Write-Host "✅ Succès: Opération récupérée" -ForegroundColor Green
        Write-Host "📋 Détails:" -ForegroundColor Cyan
        Write-Host "  - ID: $($response.id), Type: $($response.typeOperation), Service: $($response.service)" -ForegroundColor White
        Write-Host "  - Montant: $($response.montant) FCFA" -ForegroundColor White
        Write-Host "  - Frais applicable: $($response.fraisApplicable)" -ForegroundColor White
        if ($response.fraisApplicable) {
            Write-Host "  - Montant frais: $($response.montantFrais) FCFA" -ForegroundColor White
            Write-Host "  - Type calcul: $($response.typeCalculFrais)" -ForegroundColor White
            Write-Host "  - Description: $($response.descriptionFrais)" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️ Aucune opération trouvée pour le test" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Récupérer les opérations d'un compte avec frais
Write-Host "`n3. Récupération des opérations d'un compte avec frais..." -ForegroundColor Yellow
try {
    # Récupérer d'abord la liste des comptes
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    if ($comptes.Count -gt 0) {
        $firstCompteId = $comptes[0].id
        Write-Host "🔍 Test avec le compte ID: $firstCompteId" -ForegroundColor Cyan
        
        $response = Invoke-RestMethod -Uri "$baseUrl/operations/compte/$firstCompteId/with-frais" -Method GET
        Write-Host "✅ Succès: ${response.Count} opérations récupérées pour le compte" -ForegroundColor Green
        
        $operationsWithFrais = $response | Where-Object { $_.fraisApplicable -eq $true }
        Write-Host "📊 Opérations avec frais pour ce compte: ${operationsWithFrais.Count}" -ForegroundColor Cyan
        
    } else {
        Write-Host "⚠️ Aucun compte trouvé pour le test" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Comparaison avec les frais existants
Write-Host "`n4. Comparaison avec les frais de transaction existants..." -ForegroundColor Yellow
try {
    # Récupérer les frais de transaction existants
    $fraisTransactions = Invoke-RestMethod -Uri "$baseUrl/frais-transactions" -Method GET
    Write-Host "📊 Frais de transaction existants: ${fraisTransactions.Count}" -ForegroundColor Cyan
    
    # Récupérer les opérations avec frais calculés
    $operationsWithFrais = Invoke-RestMethod -Uri "$baseUrl/operations/with-frais" -Method GET
    $operationsWithFraisApplicable = $operationsWithFrais | Where-Object { $_.fraisApplicable -eq $true }
    
    Write-Host "📊 Opérations avec frais applicables: ${operationsWithFraisApplicable.Count}" -ForegroundColor Cyan
    
    # Calculer le total des frais
    $totalFraisCalcules = ($operationsWithFraisApplicable | Measure-Object -Property montantFrais -Sum).Sum
    $totalFraisTransactions = ($fraisTransactions | Measure-Object -Property montantFrais -Sum).Sum
    
    Write-Host "💰 Total des frais calculés: $totalFraisCalcules FCFA" -ForegroundColor Green
    Write-Host "💰 Total des frais de transaction: $totalFraisTransactions FCFA" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green 