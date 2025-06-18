package com.reconciliation.controller;

import com.reconciliation.dto.AgencySummarySaveRequest;
import com.reconciliation.model.AgencySummary;
import com.reconciliation.entity.AgencySummaryEntity;
import com.reconciliation.repository.AgencySummaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/agency-summary")
public class AgencySummaryController {

    @Autowired
    private AgencySummaryRepository repository;

    @GetMapping("/all")
    public List<AgencySummary> getAllSummaries() {
        return repository.findAll().stream()
            .map(entity -> {
                AgencySummary dto = new AgencySummary();
                dto.setAgency(entity.getAgency());
                dto.setService(entity.getService());
                dto.setCountry(entity.getCountry());
                dto.setDate(entity.getDate());
                dto.setTotalVolume(entity.getTotalVolume());
                dto.setRecordCount(entity.getRecordCount());
                return dto;
            })
            .collect(Collectors.toList());
    }

    

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveAgencySummary(@RequestBody AgencySummarySaveRequest request) {
        try {
            List<AgencySummary> summaryList = request.getSummary();
            String timestamp = request.getTimestamp();
            List<String> savedRecords = new ArrayList<>();
            List<String> errorRecords = new ArrayList<>();
            List<Map<String, Object>> duplicateRecords = new ArrayList<>();

            // Vérification des doublons avant sauvegarde
            for (AgencySummary summary : summaryList) {
                List<AgencySummaryEntity> existingDuplicates = repository.findDuplicates(
                    summary.getDate(),
                    summary.getAgency(),
                    summary.getService(),
                    summary.getTotalVolume(),
                    summary.getRecordCount()
                );

                if (!existingDuplicates.isEmpty()) {
                    Map<String, Object> duplicateInfo = new HashMap<>();
                    duplicateInfo.put("date", summary.getDate());
                    duplicateInfo.put("agence", summary.getAgency());
                    duplicateInfo.put("service", summary.getService());
                    duplicateInfo.put("volume", summary.getTotalVolume());
                    duplicateInfo.put("nombreTransactions", summary.getRecordCount());
                    duplicateInfo.put("message", String.format(
                        "❌ ERREUR: Enregistrement en double détecté!\n" +
                        "   Date: %s\n" +
                        "   Agence: %s\n" +
                        "   Service: %s\n" +
                        "   Volume: %.2f\n" +
                        "   Nombre de transactions: %d\n" +
                        "   Cet enregistrement existe déjà dans la base de données et ne sera pas sauvegardé.",
                        summary.getDate(),
                        summary.getAgency(),
                        summary.getService(),
                        summary.getTotalVolume(),
                        summary.getRecordCount()
                    ));
                    duplicateInfo.put("enregistrementsExistants", existingDuplicates.size());
                    duplicateRecords.add(duplicateInfo);
                    continue; // Skip this record
                }

                try {
                    AgencySummaryEntity entity = new AgencySummaryEntity();
                    entity.setAgency(summary.getAgency());
                    entity.setService(summary.getService());
                    entity.setCountry(summary.getCountry());
                    entity.setDate(summary.getDate());
                    entity.setTotalVolume(summary.getTotalVolume());
                    entity.setRecordCount(summary.getRecordCount());
                    entity.setTimestamp(timestamp);
                    
                    repository.save(entity);
                    
                    String successMessage = String.format(
                        "✅ Enregistrement sauvegardé avec succès:\n" +
                        "   Date: %s\n" +
                        "   Agence: %s\n" +
                        "   Service: %s\n" +
                        "   Volume: %.2f\n" +
                        "   Nombre de transactions: %d",
                        summary.getDate(),
                        summary.getAgency(),
                        summary.getService(),
                        summary.getTotalVolume(),
                        summary.getRecordCount()
                    );
                    savedRecords.add(successMessage);
                } catch (Exception e) {
                    String errorMessage = String.format(
                        "❌ Erreur lors de la sauvegarde:\n" +
                        "   Date: %s\n" +
                        "   Agence: %s\n" +
                        "   Service: %s\n" +
                        "   Volume: %.2f\n" +
                        "   Nombre de transactions: %d\n" +
                        "   Détails de l'erreur: %s",
                        summary.getDate(),
                        summary.getAgency(),
                        summary.getService(),
                        summary.getTotalVolume(),
                        summary.getRecordCount(),
                        e.getMessage()
                    );
                    errorRecords.add(errorMessage);
                }
            }

            Map<String, Object> response = new HashMap<>();
            
            if (!duplicateRecords.isEmpty()) {
                response.put("status", "DUPLICATES_FOUND");
                response.put("message", "⚠️ ATTENTION: Des enregistrements en double ont été détectés!");
                response.put("details", String.format(
                    "Nombre total d'enregistrements traités: %d\n" +
                    "Nombre d'enregistrements en double: %d\n" +
                    "Nombre d'enregistrements sauvegardés: %d",
                    summaryList.size(),
                    duplicateRecords.size(),
                    savedRecords.size()
                ));
                response.put("duplicateRecords", duplicateRecords);
                response.put("savedRecords", savedRecords);
                response.put("errorRecords", errorRecords);
                return ResponseEntity.badRequest().body(response);
            } else if (!errorRecords.isEmpty()) {
                response.put("status", "PARTIAL_SUCCESS");
                response.put("message", "⚠️ ATTENTION: Certains enregistrements n'ont pas pu être sauvegardés");
                response.put("savedRecords", savedRecords);
                response.put("errorRecords", errorRecords);
                return ResponseEntity.ok(response);
            } else {
                response.put("status", "SUCCESS");
                response.put("message", "✅ Tous les enregistrements ont été sauvegardés avec succès");
                response.put("savedRecords", savedRecords);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", "❌ ERREUR CRITIQUE: Impossible de sauvegarder les données");
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping
    public List<AgencySummaryEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/check-duplicates")
    public ResponseEntity<?> checkDuplicates() {
        List<AgencySummaryEntity> allRecords = repository.findAll();
        Map<String, Object> result = new HashMap<>();
        Map<String, List<AgencySummaryEntity>> duplicates = new HashMap<>();
        List<String> errorMessages = new ArrayList<>();

        for (AgencySummaryEntity record : allRecords) {
            String key = String.format("%s_%s_%s_%.2f_%d",
                record.getDate(),
                record.getAgency(),
                record.getService(),
                record.getTotalVolume(),
                record.getRecordCount()
            );

            List<AgencySummaryEntity> duplicateRecords = repository.findDuplicates(
                record.getDate(),
                record.getAgency(),
                record.getService(),
                record.getTotalVolume(),
                record.getRecordCount()
            );

            if (duplicateRecords.size() > 1) {
                duplicates.put(key, duplicateRecords);
                String errorMessage = String.format(
                    "❌ DOUBLON DÉTECTÉ:\n" +
                    "   Date: %s\n" +
                    "   Agence: %s\n" +
                    "   Service: %s\n" +
                    "   Volume: %.2f\n" +
                    "   Nombre de transactions: %d\n" +
                    "   Nombre d'occurrences: %d",
                    record.getDate(),
                    record.getAgency(),
                    record.getService(),
                    record.getTotalVolume(),
                    record.getRecordCount(),
                    duplicateRecords.size()
                );
                errorMessages.add(errorMessage);
            }
        }

        if (!duplicates.isEmpty()) {
            result.put("status", "ERROR");
            result.put("message", "⚠️ ATTENTION: Des enregistrements en double ont été trouvés dans la base de données");
            result.put("nombreDoublons", duplicates.size());
            result.put("errors", errorMessages);
            result.put("duplicates", duplicates);
            return ResponseEntity.badRequest().body(result);
        } else {
            result.put("status", "SUCCESS");
            result.put("message", "✅ Aucun doublon trouvé dans la base de données");
            return ResponseEntity.ok(result);
        }
    }

    @GetMapping("/export")
    public List<AgencySummary> exportAllSummaries() {
        return repository.findAll().stream()
            .map(entity -> {
                AgencySummary dto = new AgencySummary();
                dto.setAgency(entity.getAgency());
                dto.setService(entity.getService());
                dto.setCountry(entity.getCountry());
                dto.setDate(entity.getDate());
                dto.setTotalVolume(entity.getTotalVolume());
                dto.setRecordCount(entity.getRecordCount());
                return dto;
            })
            .collect(Collectors.toList());
    }
} 