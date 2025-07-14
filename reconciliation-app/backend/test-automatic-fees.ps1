# Test automatic fee creation
$baseUrl = "http://localhost:8080"

Write-Host "=== Testing Automatic Fee Creation ===" -ForegroundColor Green

# Test data for creating an operation - ADAPTED TO MATCH AGENCY_SUMMARY
$testOperation = @{
    compteId = 1  # Assure-toi que ce compte a numeroCompte = BETPW8064
    typeOperation = "total_cashin"
    montant = 1000000
    banque = "TEST_BANK"
    nomBordereau = "TEST_BORDEREAU_2025-06-13"
    service = "PAIEMENTMARCHAND_MTN_CM"  # Service exact de la table agency_summary
    dateOperation = "2025-06-13"  # Date exacte de la table agency_summary
}

Write-Host "Creating test operation..." -ForegroundColor Yellow
Write-Host "Request: $($testOperation | ConvertTo-Json)" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/operations/test-create-operation" -Method POST -Body ($testOperation | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    if ($response.success) {
        Write-Host "✅ Operation created successfully!" -ForegroundColor Green
        Write-Host "Fee operations created: $($response.feeOperationsCreated)" -ForegroundColor Cyan
        
        if ($response.feeOperationsCreated -gt 0) {
            Write-Host "✅ Automatic fee creation is working!" -ForegroundColor Green
            foreach ($feeOp in $response.feeOperations) {
                Write-Host "Fee Operation: $($feeOp.nomBordereau) - Amount: $($feeOp.montant)" -ForegroundColor Yellow
                
                # Vérifier si le montant est correct (doit être > 500)
                if ($feeOp.montant -gt 500) {
                    Write-Host "✅ Montant correct: $($feeOp.montant) FCFA" -ForegroundColor Green
                } else {
                    Write-Host "❌ Montant incorrect: $($feeOp.montant) FCFA (devrait être > 500)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ No fee operations were created automatically" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Failed to create operation: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error calling API: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "=== Test Complete ===" -ForegroundColor Green 