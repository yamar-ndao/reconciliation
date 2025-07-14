# Vérifier les données avant le test
$baseUrl = "http://localhost:8080"

Write-Host "=== Vérification des données ===" -ForegroundColor Green

# 1. Vérifier les comptes disponibles
Write-Host "1. Comptes disponibles:" -ForegroundColor Yellow
try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/api/comptes" -Method GET
    foreach ($compte in $comptes) {
        Write-Host "  ID: $($compte.id) - Numéro: $($compte.numeroCompte) - Pays: $($compte.pays)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des comptes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Vérifier les frais de transaction
Write-Host "2. Frais de transaction disponibles:" -ForegroundColor Yellow
try {
    $frais = Invoke-RestMethod -Uri "$baseUrl/api/frais-transaction" -Method GET
    foreach ($f in $frais) {
        Write-Host "  Agence: $($f.agence) - Service: $($f.service) - Type: $($f.typeCalcul) - Montant: $($f.montantFrais)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Vérifier les agency summaries
Write-Host "3. Agency summaries disponibles:" -ForegroundColor Yellow
try {
    $summaries = Invoke-RestMethod -Uri "$baseUrl/api/agency-summary" -Method GET
    foreach ($summary in $summaries) {
        Write-Host "  Date: $($summary.date) - Agence: $($summary.agency) - Service: $($summary.service) - Transactions: $($summary.recordCount)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des summaries: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Vérification terminée ===" -ForegroundColor Green
Write-Host "Utilise ces données pour adapter ton test!" -ForegroundColor Cyan 