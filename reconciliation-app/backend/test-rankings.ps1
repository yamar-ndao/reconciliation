# Test des endpoints de classement
Write-Host "=== TEST DES ENDPOINTS DE CLASSEMENT ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/rankings"

# Test 1: Récupérer tous les classements
Write-Host "`n1. Test endpoint /rankings (tous les classements)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET
    $rankings = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: Tous les classements récupérés" -ForegroundColor Green
    
    Write-Host "📊 Résumé:" -ForegroundColor Cyan
    Write-Host "  - Agences par transactions: $($rankings.agenciesByTransactions.Count)" -ForegroundColor White
    Write-Host "  - Agences par volume: $($rankings.agenciesByVolume.Count)" -ForegroundColor White
    Write-Host "  - Agences par frais: $($rankings.agenciesByFees.Count)" -ForegroundColor White
    Write-Host "  - Services par transactions: $($rankings.servicesByTransactions.Count)" -ForegroundColor White
    Write-Host "  - Services par volume: $($rankings.servicesByVolume.Count)" -ForegroundColor White
    Write-Host "  - Services par frais: $($rankings.servicesByFees.Count)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Classement des agences par transactions
Write-Host "`n2. Test endpoint /rankings/agencies/transactions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/agencies/transactions" -Method GET
    $agencies = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($agencies.Count) agences classées par transactions" -ForegroundColor Green
    
    if ($agencies.Count -gt 0) {
        Write-Host "🏆 Top 3 des agences par transactions:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $agencies.Count); $i++) {
            $agency = $agencies[$i]
            Write-Host "  $($i + 1). $($agency.agency) - $($agency.transactionCount) transactions" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Classement des agences par volume
Write-Host "`n3. Test endpoint /rankings/agencies/volume..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/agencies/volume" -Method GET
    $agencies = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($agencies.Count) agences classées par volume" -ForegroundColor Green
    
    if ($agencies.Count -gt 0) {
        Write-Host "🏆 Top 3 des agences par volume:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $agencies.Count); $i++) {
            $agency = $agencies[$i]
            $volumeFormatted = [math]::Round($agency.totalVolume / 1000000, 2)
            Write-Host "  $($i + 1). $($agency.agency) - $volumeFormatted M FCFA" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Classement des agences par frais
Write-Host "`n4. Test endpoint /rankings/agencies/fees..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/agencies/fees" -Method GET
    $agencies = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($agencies.Count) agences classées par frais" -ForegroundColor Green
    
    if ($agencies.Count -gt 0) {
        Write-Host "🏆 Top 3 des agences par frais:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $agencies.Count); $i++) {
            $agency = $agencies[$i]
            $feesFormatted = [math]::Round($agency.totalFees / 1000000, 2)
            Write-Host "  $($i + 1). $($agency.agency) - $feesFormatted M FCFA" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Classement des services par transactions
Write-Host "`n5. Test endpoint /rankings/services/transactions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/transactions" -Method GET
    $services = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($services.Count) services classés par transactions" -ForegroundColor Green
    
    if ($services.Count -gt 0) {
        Write-Host "🏆 Top 3 des services par transactions:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $services.Count); $i++) {
            $service = $services[$i]
            Write-Host "  $($i + 1). $($service.service) - $($service.transactionCount) transactions" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Classement des services par volume
Write-Host "`n6. Test endpoint /rankings/services/volume..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/volume" -Method GET
    $services = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($services.Count) services classés par volume" -ForegroundColor Green
    
    if ($services.Count -gt 0) {
        Write-Host "🏆 Top 3 des services par volume:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $services.Count); $i++) {
            $service = $services[$i]
            $volumeFormatted = [math]::Round($service.totalVolume / 1000000, 2)
            Write-Host "  $($i + 1). $($service.service) - $volumeFormatted M FCFA" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Classement des services par frais
Write-Host "`n7. Test endpoint /rankings/services/fees..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/fees" -Method GET
    $services = $response.Content | ConvertFrom-Json
    Write-Host "✅ Succès: $($services.Count) services classés par frais" -ForegroundColor Green
    
    if ($services.Count -gt 0) {
        Write-Host "🏆 Top 3 des services par frais:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $services.Count); $i++) {
            $service = $services[$i]
            $feesFormatted = [math]::Round($service.totalFees / 1000000, 2)
            Write-Host "  $($i + 1). $($service.service) - $feesFormatted M FCFA" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green 