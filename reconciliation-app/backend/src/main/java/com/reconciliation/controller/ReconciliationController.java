package com.reconciliation.controller;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.service.CsvReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import com.reconciliation.model.ReconciliationProgress;
import com.reconciliation.service.ReconciliationProgressService;
import org.springframework.beans.factory.annotation.Autowired;

@Slf4j
@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final CsvReconciliationService reconciliationService;
    @Autowired
    private ReconciliationProgressService progressService;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        log.info("Test endpoint called");
        return ResponseEntity.ok("Serveur fonctionne - CORS OK");
    }

    @PostMapping("/reconcile")
    public ResponseEntity<ReconciliationResponse> reconcile(@RequestBody ReconciliationRequest request, HttpServletRequest httpRequest) {
        try {
            log.info("=== REQUÊTE REÇUE ===");
            log.info("Method: {}", httpRequest.getMethod());
            log.info("Origin: {}", httpRequest.getHeader("Origin"));
            log.info("Content-Type: {}", httpRequest.getHeader("Content-Type"));
            
            // Journalisation optimisée des détails de la requête
            if (request != null) {
                log.info("Nombre d'enregistrements BO: {}", 
                    request.getBoFileContent() != null ? request.getBoFileContent().size() : 0);
                log.info("Nombre d'enregistrements Partenaire: {}", 
                    request.getPartnerFileContent() != null ? request.getPartnerFileContent().size() : 0);
                log.info("Colonne clé BO: {}", request.getBoKeyColumn());
                log.info("Colonne clé Partenaire: {}", request.getPartnerKeyColumn());
            }
            
            ReconciliationResponse response = reconciliationService.reconcile(request);
            log.info("Réconciliation terminée avec succès");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur lors de la réconciliation: {}", e.getMessage());
            throw e;
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Reçu une demande d'upload de fichier: {} ({} bytes)", 
                file.getOriginalFilename(), file.getSize());
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            log.debug("Longueur du contenu du fichier: {} caractères", content.length());
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            log.error("Erreur lors de la lecture du fichier: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erreur lors de la lecture du fichier: " + e.getMessage());
        }
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startReconciliation(@RequestBody ReconciliationRequest req) {
        String jobId = UUID.randomUUID().toString();
        // reconciliationService.reconcileAsync(jobId, req); // Lancer en asynchrone (méthode non implémentée)
        Map<String, String> resp = new HashMap<>();
        resp.put("jobId", jobId);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/progress")
    public ReconciliationProgress getProgress(@RequestParam String sessionId) {
        return progressService.getProgress(sessionId);
    }
} 