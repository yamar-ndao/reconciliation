# Script pour tester et initialiser les permissions des modules
Write-Host "=== Test des permissions des modules ===" -ForegroundColor Green

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

# Test 1: Vérifier les modules
Write-Host "`n1. Vérification des modules..." -ForegroundColor Yellow
try {
    $modules = Invoke-RestMethod -Uri "$baseUrl/profils/modules" -Method GET
    Write-Host "Modules trouvés: $($modules.Count)" -ForegroundColor Green
    $modules | ForEach-Object { Write-Host "  - $($_.nom)" -ForegroundColor Gray }
} catch {
    Write-Host "Erreur lors de la récupération des modules: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Vérifier les permissions
Write-Host "`n2. Vérification des permissions..." -ForegroundColor Yellow
try {
    $permissions = Invoke-RestMethod -Uri "$baseUrl/profils/permissions" -Method GET
    Write-Host "Permissions trouvées: $($permissions.Count)" -ForegroundColor Green
    $permissions | ForEach-Object { Write-Host "  - $($_.nom)" -ForegroundColor Gray }
} catch {
    Write-Host "Erreur lors de la récupération des permissions: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Tester les permissions pour chaque module
Write-Host "`n3. Test des permissions par module..." -ForegroundColor Yellow
if ($modules) {
    foreach ($module in $modules) {
        Write-Host "`nModule: $($module.nom) (ID: $($module.id))" -ForegroundColor Cyan
        try {
            $modulePermissions = Invoke-RestMethod -Uri "$baseUrl/profils/modules/$($module.id)/permissions" -Method GET
            Write-Host "  Permissions disponibles: $($modulePermissions.Count)" -ForegroundColor Green
            if ($modulePermissions.Count -eq 0) {
                Write-Host "  ⚠️  Aucune permission trouvée pour ce module!" -ForegroundColor Yellow
            } else {
                $modulePermissions | ForEach-Object { Write-Host "    - $($_.nom)" -ForegroundColor Gray }
            }
        } catch {
            Write-Host "  ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 