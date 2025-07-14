try {
    Write-Host "Test de correction des opérations de frais pour le 15/06/2025..."
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction/fix-existing-frais-operations?date=2025-06-15" -Method POST
    Write-Host "Résultat:"
    $response | ConvertTo-Json -Depth 4
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
} 