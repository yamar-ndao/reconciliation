package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CsvReconciliationService {

    private static final int BATCH_SIZE = 1000; // Taille du lot pour le traitement

    public ReconciliationResponse reconcile(ReconciliationRequest request) {
        try {
            // Initialise la réponse
            ReconciliationResponse response = new ReconciliationResponse();
            response.setMatches(new ArrayList<>());
            response.setBoOnly(new ArrayList<>());
            response.setPartnerOnly(new ArrayList<>());
            response.setMismatches(new ArrayList<>());

            // Crée un index des enregistrements du partenaire pour une recherche rapide
            Map<String, Map<String, String>> partnerMap = request.getPartnerFileContent().stream()
                .collect(Collectors.toMap(
                    record -> record.get(request.getPartnerKeyColumn()),
                    record -> record,
                    (existing, replacement) -> existing
                ));

            // Traite les enregistrements BO par lots
            List<Map<String, String>> boRecords = request.getBoFileContent();
            for (int i = 0; i < boRecords.size(); i += BATCH_SIZE) {
                int endIndex = Math.min(i + BATCH_SIZE, boRecords.size());
                List<Map<String, String>> batch = boRecords.subList(i, endIndex);
                
                processBatch(batch, partnerMap, request, response);
                
                // Nettoyage explicite de la mémoire
                System.gc();
            }

            // Trouve les enregistrements uniquement dans le fichier partenaire
            Set<String> boKeys = boRecords.stream()
                .map(record -> record.get(request.getBoKeyColumn()))
                .collect(Collectors.toSet());

            request.getPartnerFileContent().stream()
                .filter(record -> !boKeys.contains(record.get(request.getPartnerKeyColumn())))
                .forEach(record -> response.getPartnerOnly().add(record));

            // Calcule les totaux
            response.setTotalBoRecords(boRecords.size());
            response.setTotalPartnerRecords(request.getPartnerFileContent().size());
            response.setTotalMatches(response.getMatches().size());
            response.setTotalMismatches(response.getMismatches().size());
            response.setTotalBoOnly(response.getBoOnly().size());
            response.setTotalPartnerOnly(response.getPartnerOnly().size());

            return response;

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la réconciliation: " + e.getMessage(), e);
        }
    }

    private void processBatch(List<Map<String, String>> batch, 
                            Map<String, Map<String, String>> partnerMap,
                            ReconciliationRequest request,
                            ReconciliationResponse response) {
        for (Map<String, String> boRecord : batch) {
            String boKey = boRecord.get(request.getBoKeyColumn());
            Map<String, String> partnerRecord = partnerMap.get(boKey);

            if (partnerRecord == null) {
                response.getBoOnly().add(boRecord);
            } else {
                List<ReconciliationResponse.Difference> differences = new ArrayList<>();
                boolean isMatch = true;

                for (ColumnComparison comparison : request.getComparisonColumns()) {
                    String boValue = boRecord.get(comparison.getBoColumn());
                    String partnerValue = partnerRecord.get(comparison.getPartnerColumn());
                    
                    if (!Objects.equals(boValue, partnerValue)) {
                        ReconciliationResponse.Difference difference = new ReconciliationResponse.Difference();
                        difference.setBoColumn(comparison.getBoColumn());
                        difference.setPartnerColumn(comparison.getPartnerColumn());
                        difference.setBoValue(boValue);
                        difference.setPartnerValue(partnerValue);
                        difference.setDifferent(true);
                        
                        differences.add(difference);
                        isMatch = false;
                    }
                }

                if (isMatch) {
                    ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                    match.setKey(boKey);
                    match.setBoData(boRecord);
                    match.setPartnerData(partnerRecord);
                    match.setDifferences(differences);
                    response.getMatches().add(match);
                } else {
                    response.getMismatches().add(boRecord);
                }
            }
        }
    }

    private Map<String, Map<String, String>> createRecordMap(List<Map<String, String>> records, String keyColumn) {
        Map<String, Map<String, String>> map = new HashMap<>();
        for (Map<String, String> record : records) {
            map.put(record.get(keyColumn), record);
        }
        return map;
    }
} 