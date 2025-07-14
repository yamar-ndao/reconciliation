# Test des fonctionnalités utilisateurs
Write-Host "=== Test des fonctionnalités utilisateurs ===" -ForegroundColor Green

# URL de base
$baseUrl = "http://localhost:8080/api/users"

# Test 1: Vérifier si l'admin existe
Write-Host "`n1. Vérification de l'existence de l'admin..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/check-admin" -Method GET
    Write-Host "Admin existe: $response" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la vérification admin: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Lister tous les utilisateurs
Write-Host "`n2. Liste de tous les utilisateurs..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "Nombre d'utilisateurs: $($users.Count)" -ForegroundColor Green
    foreach ($user in $users) {
        Write-Host "  - ID: $($user.id), Username: $($user.username)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Erreur lors de la récupération des utilisateurs: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Créer un nouvel utilisateur
Write-Host "`n3. Création d'un nouvel utilisateur..." -ForegroundColor Yellow
$newUser = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

try {
    $createdUser = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $newUser -ContentType "application/json"
    Write-Host "Utilisateur créé avec succès:" -ForegroundColor Green
    Write-Host "  - ID: $($createdUser.id), Username: $($createdUser.username)" -ForegroundColor Cyan
} catch {
    Write-Host "Erreur lors de la création de l'utilisateur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Récupérer un utilisateur par ID
Write-Host "`n4. Récupération d'un utilisateur par ID..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri $baseUrl -Method GET
    if ($users.Count -gt 0) {
        $firstUser = $users[0]
        $userById = Invoke-RestMethod -Uri "$baseUrl/$($firstUser.id)" -Method GET
        Write-Host "Utilisateur récupéré: $($userById.username)" -ForegroundColor Green
    }
} catch {
    Write-Host "Erreur lors de la récupération par ID: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Mettre à jour un utilisateur
Write-Host "`n5. Mise à jour d'un utilisateur..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri $baseUrl -Method GET
    $testUser = $users | Where-Object { $_.username -eq "testuser" }
    if ($testUser) {
        $updateData = @{
            username = "testuser_updated"
            password = "newpass123"
        } | ConvertTo-Json
        
        $updatedUser = Invoke-RestMethod -Uri "$baseUrl/$($testUser.id)" -Method PUT -Body $updateData -ContentType "application/json"
        Write-Host "Utilisateur mis à jour: $($updatedUser.username)" -ForegroundColor Green
    }
} catch {
    Write-Host "Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Supprimer un utilisateur de test
Write-Host "`n6. Suppression d'un utilisateur de test..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri $baseUrl -Method GET
    $testUser = $users | Where-Object { $_.username -eq "testuser_updated" -or $_.username -eq "testuser" }
    if ($testUser) {
        $deleted = Invoke-RestMethod -Uri "$baseUrl/$($testUser.id)" -Method DELETE
        if ($deleted) {
            Write-Host "Utilisateur supprimé avec succès" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Tests terminés ===" -ForegroundColor Green 