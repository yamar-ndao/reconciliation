# Test simplifié pour CELCM0001
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test simplifié CELCM0001 ===" -ForegroundColor Green

# 1. Vérifier les opérations existantes
Write-Host "`n1. Vérification des opérations existantes:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-WebRequest -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operations = $operationsResponse.Content | ConvertFrom-Json
    
    Write-Host "Opérations CELCM0001 trouvées:" -ForegroundColor Cyan
    foreach ($operation in $operations) {
        if ($operation.typeOperation -eq "FRAIS_TRANSACTION") {
            Write-Host "  - Date: $($operation.dateOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($operation.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Service: $($operation.service)" -ForegroundColor Green
            Write-Host "    * Bordereau: $($operation.nomBordereau)" -ForegroundColor Green
            
            if ($operation.montant -eq 3776700.0) {
                Write-Host "    * ❌ Montant incorrect (3,776,700 FCFA)" -ForegroundColor Red
            } elseif ($operation.montant -eq 31800.0) {
                Write-Host "    * ✅ Montant correct (31,800 FCFA)" -ForegroundColor Green
            } else {
                Write-Host "    * ⚠️ Montant: $($operation.montant) FCFA" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Vérifier les données AgencySummary
Write-Host "`n2. Vérification des données AgencySummary:" -ForegroundColor Yellow

try {
    $agencySummaryResponse = Invoke-WebRequest -Uri "$baseUrl/agency-summary?agence=CELCM0001" -Method GET
    $agencySummaries = $agencySummaryResponse.Content | ConvertFrom-Json
    
    Write-Host "AgencySummary trouvés:" -ForegroundColor Cyan
    foreach ($summary in $agencySummaries) {
        if ($summary.service -eq "CASHINMTNCMPART") {
            Write-Host "  - Date: $($summary.date)" -ForegroundColor Green
            Write-Host "    * Transactions: $($summary.recordCount)" -ForegroundColor Green
            Write-Host "    * Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
            Write-Host "    * Frais calculé (300 × $($summary.recordCount)): $($summary.recordCount * 300) FCFA" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération AgencySummary: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier le frais configuré
Write-Host "`n3. Vérification du frais configuré:" -ForegroundColor Yellow

try {
    $fraisResponse = Invoke-WebRequest -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET
    $frais = $fraisResponse.Content | ConvertFrom-Json
    
    Write-Host "Frais configuré:" -ForegroundColor Cyan
    Write-Host "  - Service: $($frais.service)" -ForegroundColor Green
    Write-Host "  - Agence: $($frais.agence)" -ForegroundColor Green
    Write-Host "  - Type: $($frais.typeCalcul)" -ForegroundColor Green
    Write-Host "  - Montant: $($frais.montantFrais) FCFA" -ForegroundColor Green
    Write-Host "  - Actif: $($frais.actif)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la récupération du frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 