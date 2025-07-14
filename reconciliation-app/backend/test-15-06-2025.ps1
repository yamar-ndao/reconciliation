Write-Host "Test des calculs de frais pour le 15/06/2025..."
Write-Host ""

# Données fournies par l'utilisateur
$testData = @(
    @{agence="BETPW8064"; montantAttendu=3026727583.72},
    @{agence="BMOCM8056"; montantAttendu=146689765.10},
    @{agence="BTWIN8060"; montantAttendu=40066733.42},
    @{agence="MELBT8066"; montantAttendu=183078894.00},
    @{agence="SGBET8063"; montantAttendu=72917603.06},
    @{agence="XBTCM8057"; montantAttendu=2198325078.93}
)

$service = "PAIEMENTMARCHAND_MTN_CM"
$date = "2025-06-15"

foreach ($data in $testData) {
    $agence = $data.agence
    $montantAttendu = $data.montantAttendu
    
    Write-Host "Test pour $agence (montant attendu: $montantAttendu FCFA)"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction/test-create-frais-operation?service=$service&agence=$agence&date=$date" -Method GET
        Write-Host "Résultat:"
        $response | ConvertTo-Json -Depth 3
        Write-Host ""
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)"
        Write-Host ""
    }
} 