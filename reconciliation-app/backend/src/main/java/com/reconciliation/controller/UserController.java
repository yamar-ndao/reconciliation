package com.reconciliation.controller;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<UserEntity>> getAllUsers() {
        List<UserEntity> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserEntity> getUserById(@PathVariable Long id) {
        Optional<UserEntity> user = userRepository.findById(id);
        return user.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserEntity> createUser(@RequestBody UserEntity user) {
        try {
            // Vérifier si l'username existe déjà
            if (userRepository.findByUsername(user.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            
            UserEntity savedUser = userRepository.save(user);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserEntity> updateUser(@PathVariable Long id, @RequestBody UserEntity user) {
        try {
            Optional<UserEntity> existingUser = userRepository.findById(id);
            if (existingUser.isPresent()) {
                user.setId(id);
                UserEntity updatedUser = userRepository.save(user);
                return ResponseEntity.ok(updatedUser);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteUser(@PathVariable Long id) {
        try {
            Optional<UserEntity> user = userRepository.findById(id);
            if (user.isPresent()) {
                // Empêcher la suppression de l'utilisateur admin par défaut
                if ("admin".equals(user.get().getUsername())) {
                    return ResponseEntity.badRequest().body(false);
                }
                userRepository.deleteById(id);
                return ResponseEntity.ok(true);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(false);
        }
    }

    @GetMapping("/check-admin")
    public ResponseEntity<Boolean> checkAdminExists() {
        Optional<UserEntity> adminUser = userRepository.findByUsername("admin");
        return ResponseEntity.ok(adminUser.isPresent());
    }
} 