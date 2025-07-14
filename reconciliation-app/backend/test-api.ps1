try {
    Write-Host "Test de l'API des frais de transaction..."
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/frais-transaction" -Method GET
    Write-Host "Réponse reçue:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
} 