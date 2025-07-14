try {
    Write-Host "Test de l'endpoint de calcul de frais..."
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction/test-create-frais-operation?service=PAIEMENTMARCHAND_MTN_CM&agence=BETPW8064&date=2025-06-15" -Method GET
    Write-Host "Réponse reçue:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    Write-Host "Détails: $($_.Exception.Response.StatusCode)"
} 