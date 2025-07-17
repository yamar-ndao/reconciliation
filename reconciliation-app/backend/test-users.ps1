# Script pour tester et initialiser les utilisateurs
Write-Host "=== Test des utilisateurs ===" -ForegroundColor Green

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

# Test 1: Vérifier les utilisateurs existants
Write-Host "`n1. Vérification des utilisateurs existants..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/users" -Method GET
    Write-Host "Utilisateurs trouvés: $($users.Count)" -ForegroundColor Green
    if ($users.Count -eq 0) {
        Write-Host "  ⚠️  Aucun utilisateur trouvé!" -ForegroundColor Yellow
    } else {
        $users | ForEach-Object { 
            Write-Host "  - $($_.username) (ID: $($_.id))" -ForegroundColor Gray
            if ($_.profil) {
                Write-Host "    Profil: $($_.profil.nom)" -ForegroundColor Gray
            } else {
                Write-Host "    Profil: Aucun" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Erreur lors de la récupération des utilisateurs: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Vérifier les profils disponibles
Write-Host "`n2. Vérification des profils disponibles..." -ForegroundColor Yellow
try {
    $profils = Invoke-RestMethod -Uri "$baseUrl/profils" -Method GET
    Write-Host "Profils trouvés: $($profils.Count)" -ForegroundColor Green
    if ($profils.Count -eq 0) {
        Write-Host "  ⚠️  Aucun profil trouvé!" -ForegroundColor Yellow
    } else {
        $profils | ForEach-Object { Write-Host "  - $($_.nom) (ID: $($_.id))" -ForegroundColor Gray }
    }
} catch {
    Write-Host "Erreur lors de la récupération des profils: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Créer un utilisateur admin si nécessaire
Write-Host "`n3. Vérification de l'utilisateur admin..." -ForegroundColor Yellow
try {
    $adminExists = Invoke-RestMethod -Uri "$baseUrl/users/check-admin" -Method GET
    if ($adminExists) {
        Write-Host "  ✅ Utilisateur admin existe" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Utilisateur admin n'existe pas" -ForegroundColor Yellow
        
        # Demander si on veut créer l'admin
        $createAdmin = Read-Host "Voulez-vous créer l'utilisateur admin? (o/n)"
        if ($createAdmin -eq "o" -or $createAdmin -eq "O") {
            $adminUser = @{
                username = "admin"
                password = "admin"
                profil = @{
                    id = 1
                    nom = "Default"
                }
            }
            
            try {
                $newAdmin = Invoke-RestMethod -Uri "$baseUrl/users" -Method POST -Body ($adminUser | ConvertTo-Json) -ContentType "application/json"
                Write-Host "  ✅ Utilisateur admin créé avec succès (ID: $($newAdmin.id))" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erreur lors de la création de l'admin: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Erreur lors de la vérification de l'admin: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Créer des utilisateurs de test si aucun utilisateur n'existe
Write-Host "`n4. Création d'utilisateurs de test..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/users" -Method GET
    if ($users.Count -eq 0) {
        Write-Host "  Aucun utilisateur trouvé, création d'utilisateurs de test..." -ForegroundColor Yellow
        
        # Récupérer le premier profil disponible
        $profils = Invoke-RestMethod -Uri "$baseUrl/profils" -Method GET
        $defaultProfil = $profils | Select-Object -First 1
        
        if ($defaultProfil) {
            $testUsers = @(
                @{
                    username = "test.user1"
                    password = "password123"
                    profil = @{
                        id = $defaultProfil.id
                        nom = $defaultProfil.nom
                    }
                },
                @{
                    username = "test.user2"
                    password = "password123"
                    profil = @{
                        id = $defaultProfil.id
                        nom = $defaultProfil.nom
                    }
                }
            )
            
            foreach ($user in $testUsers) {
                try {
                    $newUser = Invoke-RestMethod -Uri "$baseUrl/users" -Method POST -Body ($user | ConvertTo-Json) -ContentType "application/json"
                    Write-Host "  ✅ Utilisateur $($user.username) créé avec succès (ID: $($newUser.id))" -ForegroundColor Green
                } catch {
                    Write-Host "  ❌ Erreur lors de la création de $($user.username): $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  ❌ Aucun profil disponible pour créer des utilisateurs de test" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✅ Des utilisateurs existent déjà, pas besoin de créer des utilisateurs de test" -ForegroundColor Green
    }
} catch {
    Write-Host "Erreur lors de la création d'utilisateurs de test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 