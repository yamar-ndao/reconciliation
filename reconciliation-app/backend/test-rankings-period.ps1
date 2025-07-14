# Test des classements avec différentes périodes
$baseUrl = "http://localhost:8080/api/rankings"

Write-Host "=== Test des classements avec différentes périodes ===" -ForegroundColor Green

# Test 1: Classement des agences par transactions - Par jour
Write-Host "`n1. Test classement agences par transactions - Par jour" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=day" -Method GET
    Write-Host "✅ Succès - Nombre d'agences: $($response.Count)" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   Première agence: $($response[0].agency) - Volume moyen/jour: $($response[0].averageVolume)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Classement des agences par transactions - Par semaine
Write-Host "`n2. Test classement agences par transactions - Par semaine" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=week" -Method GET
    Write-Host "✅ Succès - Nombre d'agences: $($response.Count)" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   Première agence: $($response[0].agency) - Volume moyen/semaine: $($response[0].averageVolume)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Classement des agences par transactions - Par mois
Write-Host "`n3. Test classement agences par transactions - Par mois" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=month" -Method GET
    Write-Host "✅ Succès - Nombre d'agences: $($response.Count)" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   Première agence: $($response[0].agency) - Volume moyen/mois: $($response[0].averageVolume)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Classement des services par volume - Par jour
Write-Host "`n4. Test classement services par volume - Par jour" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/services/volume?period=day" -Method GET
    Write-Host "✅ Succès - Nombre de services: $($response.Count)" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   Premier service: $($response[0].service) - Volume moyen/jour: $($response[0].averageVolume)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Classement des services par frais - Par semaine
Write-Host "`n5. Test classement services par frais - Par semaine" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/services/fees?period=week" -Method GET
    Write-Host "✅ Succès - Nombre de services: $($response.Count)" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   Premier service: $($response[0].service) - Frais moyens/semaine: $($response[0].averageFees)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Tous les classements - Par mois (par défaut)
Write-Host "`n6. Test tous les classements - Par mois (par défaut)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl?period=month" -Method GET
    Write-Host "✅ Succès - Classements disponibles:" -ForegroundColor Green
    Write-Host "   - Agences par transactions: $($response.agenciesByTransactions.Count)" -ForegroundColor Cyan
    Write-Host "   - Agences par volume: $($response.agenciesByVolume.Count)" -ForegroundColor Cyan
    Write-Host "   - Agences par frais: $($response.agenciesByFees.Count)" -ForegroundColor Cyan
    Write-Host "   - Services par transactions: $($response.servicesByTransactions.Count)" -ForegroundColor Cyan
    Write-Host "   - Services par volume: $($response.servicesByVolume.Count)" -ForegroundColor Cyan
    Write-Host "   - Services par frais: $($response.servicesByFees.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Comparaison des moyennes entre périodes
Write-Host "`n7. Comparaison des moyennes entre périodes (première agence)" -ForegroundColor Yellow
try {
    $dayResponse = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=day" -Method GET
    $weekResponse = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=week" -Method GET
    $monthResponse = Invoke-RestMethod -Uri "$baseUrl/agencies/transactions?period=month" -Method GET
    
    if ($dayResponse.Count -gt 0 -and $weekResponse.Count -gt 0 -and $monthResponse.Count -gt 0) {
        $agency = $dayResponse[0].agency
        Write-Host "   Agence: $agency" -ForegroundColor Cyan
        Write-Host "   - Volume moyen/jour: $($dayResponse[0].averageVolume)" -ForegroundColor White
        Write-Host "   - Volume moyen/semaine: $($weekResponse[0].averageVolume)" -ForegroundColor White
        Write-Host "   - Volume moyen/mois: $($monthResponse[0].averageVolume)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Tests terminés ===" -ForegroundColor Green 