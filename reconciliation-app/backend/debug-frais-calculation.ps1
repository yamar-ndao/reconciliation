# Diagnostic détaillé du calcul des frais
$baseUrl = "http://localhost:8080/api"

Write-Host "=== Diagnostic détaillé du calcul des frais ===" -ForegroundColor Green

# 1. Vérifier les données AgencySummary exactes
Write-Host "`n1. Données AgencySummary pour CELCM0001 du 01/07/2025:" -ForegroundColor Yellow

$agencySummaryResponse = Invoke-RestMethod -Uri "$baseUrl/agency-summary?agence=CELCM0001&date=2025-07-01" -Method GET

Write-Host "AgencySummary trouvés:" -ForegroundColor Cyan
$agencySummaryResponse | ConvertTo-Json -Depth 5

# 2. Vérifier le frais configuré exact
Write-Host "`n2. Frais configuré pour CASHINMTNCMPART et CELCM0001:" -ForegroundColor Yellow

$fraisResponse = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001" -Method GET

Write-Host "Frais configuré:" -ForegroundColor Cyan
$fraisResponse | ConvertTo-Json -Depth 5

# 3. Test du calcul avec les données réelles
Write-Host "`n3. Test du calcul avec données réelles:" -ForegroundColor Yellow

$testParams = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    date = "2025-07-01"
}

$response = Invoke-RestMethod -Uri "$baseUrl/frais-transaction/test-calculation-real" -Method GET -Body $testParams -ContentType "application/json"

Write-Host "Résultat du test:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10

# 4. Calcul manuel détaillé
Write-Host "`n4. Calcul manuel détaillé:" -ForegroundColor Yellow

if ($agencySummaryResponse -and $agencySummaryResponse.length -gt 0) {
    Write-Host "AgencySummary disponibles:" -ForegroundColor Green
    foreach ($summary in $agencySummaryResponse) {
        Write-Host "  - Service: $($summary.service), Transactions: $($summary.recordCount), Volume: $($summary.totalVolume) FCFA" -ForegroundColor Green
    }
    
    # Chercher l'AgencySummary pour CASHINMTNCMPART
    $targetSummary = $agencySummaryResponse | Where-Object { $_.service -eq "CASHINMTNCMPART" }
    
    if ($targetSummary) {
        $nombreTransactions = $targetSummary.recordCount
        $volumeTotal = $targetSummary.totalVolume
        
        if ($fraisResponse -and $fraisResponse.montantFrais) {
            $montantFrais = $fraisResponse.montantFrais
            $calculManuel = $montantFrais * $nombreTransactions
            
            Write-Host "`nCalcul pour CASHINMTNCMPART:" -ForegroundColor Green
            Write-Host "  - Nombre de transactions: $nombreTransactions" -ForegroundColor Green
            Write-Host "  - Montant frais configuré: $montantFrais FCFA" -ForegroundColor Green
            Write-Host "  - Calcul: $montantFrais × $nombreTransactions = $calculManuel FCFA" -ForegroundColor Green
            Write-Host "  - Montant calculé par le système: $($response.montantFraisCalcule) FCFA" -ForegroundColor Green
            
            if ($calculManuel -eq $response.montantFraisCalcule) {
                Write-Host "  ✅ Calcul correct!" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Calcul incorrect!" -ForegroundColor Red
                Write-Host "  Différence: $($response.montantFraisCalcule - $calculManuel) FCFA" -ForegroundColor Red
                
                # Vérifier si le système utilise le volume total
                $calculAvecVolume = $montantFrais * ($volumeTotal / 1000)
                Write-Host "  - Calcul avec volume total: $montantFrais × ($volumeTotal ÷ 1000) = $calculAvecVolume FCFA" -ForegroundColor Red
                
                if ($calculAvecVolume -eq $response.montantFraisCalcule) {
                    Write-Host "  ❌ Le système utilise le volume total au lieu du nombre de transactions!" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "❌ Aucun AgencySummary trouvé pour CASHINMTNCMPART" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Aucun AgencySummary trouvé pour CELCM0001" -ForegroundColor Red
}

# 5. Vérifier les opérations existantes
Write-Host "`n5. Opérations existantes pour CELCM0001 du 01/07/2025:" -ForegroundColor Yellow

$operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-01T00:00:00&dateFin=2025-07-01T23:59:59" -Method GET

Write-Host "Opérations trouvées:" -ForegroundColor Cyan
foreach ($op in $operationsResponse) {
    Write-Host "  - Type: $($op.typeOperation), Montant: $($op.montant) FCFA, Bordereau: $($op.nomBordereau)" -ForegroundColor Cyan
}

# 6. Test de création d'une nouvelle opération pour voir le calcul en temps réel
Write-Host "`n6. Test de création d'opération pour voir le calcul en temps réel:" -ForegroundColor Yellow

$operationData = @{
    compteId = 1
    typeOperation = "total_cashin"
    montant = 12589255
    service = "CASHINMTNCMPART"
    dateOperation = "2025-07-01T12:00:00"
    codeProprietaire = "CELCM0001"
}

try {
    Write-Host "Création d'une nouvelle opération..." -ForegroundColor Yellow
    $operationResponse = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Body ($operationData | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Nouvelle opération créée:" -ForegroundColor Green
    $operationResponse | ConvertTo-Json -Depth 5
    
    # Attendre un peu puis vérifier les opérations
    Start-Sleep -Seconds 2
    
    $newOperationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001&dateDebut=2025-07-01T00:00:00&dateFin=2025-07-01T23:59:59" -Method GET
    
    $newFraisOperation = $newOperationsResponse | Where-Object { $_.typeOperation -eq "FRAIS_TRANSACTION" -and $_.nomBordereau -like "*CELCM0001" -and $_.dateOperation -like "*12:00*" }
    
    if ($newFraisOperation) {
        Write-Host "Nouvelle opération de frais créée:" -ForegroundColor Green
        Write-Host "  - Montant: $($newFraisOperation.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Bordereau: $($newFraisOperation.nomBordereau)" -ForegroundColor Green
        Write-Host "  - Date: $($newFraisOperation.dateOperation)" -ForegroundColor Green
    } else {
        Write-Host "Aucune nouvelle opération de frais trouvée" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erreur lors de la création de l'opération: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green 