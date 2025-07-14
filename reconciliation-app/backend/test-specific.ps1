Write-Host "Test de l'endpoint de test avec données réelles..."
Write-Host ""

# Test avec XBTCM8057 et PAIEMENTMARCHAND_MTN_CM
Write-Host "Test 1: XBTCM8057 - PAIEMENTMARCHAND_MTN_CM"
try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction/test-real-calculation?service=PAIEMENTMARCHAND_MTN_CM&agence=XBTCM8057&date=2025-06-26" -Method GET
    Write-Host "Résultat:"
    $response1 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Test 2: XBTCM8057 - CASHINMTNCMPART"
try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction/test-real-calculation?service=CASHINMTNCMPART&agence=XBTCM8057&date=2025-06-26" -Method GET
    Write-Host "Résultat:"
    $response2 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
} 