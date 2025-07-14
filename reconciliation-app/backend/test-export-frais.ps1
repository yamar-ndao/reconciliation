# Script de test pour l'export des frais de transaction
# Test de l'endpoint d'export

Write-Host "🧪 Test de l'export des frais de transaction" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"

# Test 1: Récupérer tous les frais de transaction
Write-Host "`n📋 Test 1: Récupération de tous les frais de transaction" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction" -Method GET
    Write-Host "✅ Succès: $($response.Count) frais récupérés" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "   Premier frais: Service=$($response[0].service), Agence=$($response[0].agence)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test de l'endpoint d'export
Write-Host "`n📤 Test 2: Test de l'endpoint d'export" -ForegroundColor Yellow
try {
    $exportResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/export" -Method GET
    Write-Host "✅ Succès: Export réussi" -ForegroundColor Green
    Write-Host "   Total exporté: $($exportResponse.totalCount) frais" -ForegroundColor Gray
    Write-Host "   Date d'export: $($exportResponse.exportDate)" -ForegroundColor Gray
    
    if ($exportResponse.data.Count -gt 0) {
        Write-Host "   Exemple de données exportées:" -ForegroundColor Gray
        $firstRow = $exportResponse.data[0]
        Write-Host "     ID: $($firstRow.ID)" -ForegroundColor Gray
        Write-Host "     Service: $($firstRow.Service)" -ForegroundColor Gray
        Write-Host "     Agence: $($firstRow.Agence)" -ForegroundColor Gray
        Write-Host "     Type: $($firstRow.'Type de Calcul')" -ForegroundColor Gray
        Write-Host "     Valeur: $($firstRow.'Valeur Paramétrée')" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test des frais actifs
Write-Host "`n✅ Test 3: Récupération des frais actifs" -ForegroundColor Yellow
try {
    $actifsResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/actifs" -Method GET
    Write-Host "✅ Succès: $($actifsResponse.Count) frais actifs récupérés" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test des services disponibles
Write-Host "`n🔧 Test 4: Récupération des services disponibles" -ForegroundColor Yellow
try {
    $servicesResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/services" -Method GET
    Write-Host "✅ Succès: $($servicesResponse.Count) services récupérés" -ForegroundColor Green
    Write-Host "   Services: $($servicesResponse -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Test des agences disponibles
Write-Host "`n🏢 Test 5: Récupération des agences disponibles" -ForegroundColor Yellow
try {
    $agencesResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/agences" -Method GET
    Write-Host "✅ Succès: $($agencesResponse.Count) agences récupérées" -ForegroundColor Green
    Write-Host "   Agences: $($agencesResponse -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan 