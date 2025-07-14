package com.reconciliation.config;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        // Vérifier s'il existe déjà des utilisateurs
        if (userRepository.count() == 0) {
            System.out.println("=== Initialisation de la base de données ===");
            System.out.println("Création de l'utilisateur administrateur par défaut...");
            
            // Créer l'utilisateur admin par défaut
            UserEntity adminUser = new UserEntity();
            adminUser.setUsername("admin");
            adminUser.setPassword("admin"); // En production, il faudrait hasher le mot de passe
            
            userRepository.save(adminUser);
            
            System.out.println("✅ Utilisateur admin créé avec succès !");
            System.out.println("   Username: admin");
            System.out.println("   Password: admin");
            System.out.println("=== Initialisation terminée ===");
        } else {
            System.out.println("=== Base de données déjà initialisée ===");
            System.out.println("Nombre d'utilisateurs existants: " + userRepository.count());
        }
    }
} 