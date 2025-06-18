package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
public class CsvReconciliationService {
    private static final Logger logger = LoggerFactory.getLogger(CsvReconciliationService.class);

    private final DataNormalizationService dataNormalizationService;

    @Autowired
    public CsvReconciliationService(DataNormalizationService dataNormalizationService) {
        this.dataNormalizationService = dataNormalizationService;
    }

    public ReconciliationResponse reconcile(ReconciliationRequest request) {
        try {
            logger.info("Début de la réconciliation");
            logger.info("Données BO avant normalisation: {}", request.getBoFileContent());
            
            // Normalisation des données
            List<Map<String, String>> normalizedBoRecords = dataNormalizationService.normalizeRecords(request.getBoFileContent());
            List<Map<String, String>> normalizedPartnerRecords = dataNormalizationService.normalizeRecords(request.getPartnerFileContent());
            
            logger.info("Données normalisées - BO: {} enregistrements, Partenaire: {} enregistrements", 
                normalizedBoRecords.size(), normalizedPartnerRecords.size());

            // Vérification des données normalisées
            for (Map<String, String> record : normalizedBoRecords) {
                logger.info("Enregistrement BO après normalisation: {}", record);
                logger.info("Valeur du pays: {}", record.get("country"));
            }

            // Crée les maps pour la recherche rapide
            Map<String, Map<String, String>> boMap = createRecordMap(normalizedBoRecords, request.getBoKeyColumn());
            Map<String, Map<String, String>> partnerMap = createRecordMap(normalizedPartnerRecords, request.getPartnerKeyColumn());

            // Initialise la réponse
            ReconciliationResponse response = new ReconciliationResponse();
            response.setMatches(new ArrayList<>());
            response.setBoOnly(new ArrayList<>());
            response.setPartnerOnly(new ArrayList<>());
            response.setMismatches(new ArrayList<>());

            // Compare les enregistrements
            for (Map<String, String> boRecord : normalizedBoRecords) {
                String boKey = boRecord.get(request.getBoKeyColumn());
                Map<String, String> partnerRecord = partnerMap.get(boKey);

                logger.info("Traitement de l'enregistrement BO avec la clé: {}", boKey);
                logger.info("Enregistrement BO complet: {}", boRecord);
                logger.info("Valeur du pays dans l'enregistrement BO: {}", boRecord.get("country"));

                // Création d'une copie de l'enregistrement pour la réponse
                Map<String, String> responseRecord = new HashMap<>(boRecord);
                
                // Suppression explicite de la colonne 'country' dans la réponse
                responseRecord.remove("country");

                // S'assurer que la colonne country est présente
                if (!responseRecord.containsKey("country")) {
                    String paysValue = boRecord.get("PAYS");
                    if (paysValue != null && !paysValue.trim().isEmpty()) {
                        responseRecord.put("country", paysValue);
                        logger.info("Ajout de la valeur PAYS à la colonne country: {}", paysValue);
                    } else {
                        logger.warn("Aucune valeur de pays trouvée pour l'enregistrement: {}", boKey);
                    }
                }

                // Vérification finale de la valeur du pays
                String countryValue = responseRecord.get("country");
                if (countryValue == null || countryValue.trim().isEmpty()) {
                    logger.warn("La valeur du pays est vide dans l'enregistrement: {}", boKey);
                    // Tentative de récupération depuis PAYS
                    String paysValue = boRecord.get("PAYS");
                    if (paysValue != null && !paysValue.trim().isEmpty()) {
                        responseRecord.put("country", paysValue);
                        logger.info("Récupération finale de la valeur PAYS pour la colonne country: {}", paysValue);
                    }
                }

                if (partnerRecord == null) {
                    // Enregistrement uniquement dans BO
                    response.getBoOnly().add(responseRecord);
                    logger.info("Enregistrement uniquement dans BO: {}", boKey);
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
                            
                            logger.info("Différence détectée - Colonne: {}, BO: {}, Partenaire: {}", 
                                comparison.getBoColumn(), boValue, partnerValue);
                        }
                    }

                    if (isMatch) {
                        // Enregistrements correspondants
                        ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                        match.setKey(boKey);
                        match.setBoData(responseRecord);
                        match.setPartnerData(partnerRecord);
                        match.setDifferences(differences);
                        response.getMatches().add(match);
                        logger.info("Enregistrements correspondants trouvés: {}", boKey);
                    } else {
                        // Enregistrements avec différences
                        response.getMismatches().add(responseRecord);
                        logger.info("Enregistrements avec différences: {}", boKey);
                    }
                }
            }

            // Trouve les enregistrements uniquement dans le fichier partenaire
            for (Map<String, String> partnerRecord : normalizedPartnerRecords) {
                String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
                if (!boMap.containsKey(partnerKey)) {
                    response.getPartnerOnly().add(partnerRecord);
                    logger.info("Enregistrement uniquement dans le fichier partenaire: {}", partnerKey);
                }
            }

            // Calcule les totaux
            response.setTotalBoRecords(normalizedBoRecords.size());
            response.setTotalPartnerRecords(normalizedPartnerRecords.size());
            response.setTotalMatches(response.getMatches().size());
            response.setTotalMismatches(response.getMismatches().size());
            response.setTotalBoOnly(response.getBoOnly().size());
            response.setTotalPartnerOnly(response.getPartnerOnly().size());

            logger.info("Fin de la réconciliation - Résultats: {} correspondances, {} différences, {} uniquement BO, {} uniquement partenaire",
                response.getTotalMatches(), response.getTotalMismatches(), 
                response.getTotalBoOnly(), response.getTotalPartnerOnly());

            return response;

        } catch (Exception e) {
            logger.error("Erreur lors de la réconciliation: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la réconciliation: " + e.getMessage(), e);
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