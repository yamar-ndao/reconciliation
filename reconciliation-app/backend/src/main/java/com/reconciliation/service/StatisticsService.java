package com.reconciliation.service;

import com.reconciliation.model.Statistics;
import com.reconciliation.repository.StatisticsRepository;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.repository.FraisTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
public class StatisticsService {
    private static final Logger logger = LoggerFactory.getLogger(StatisticsService.class);

    @Autowired
    private StatisticsRepository statisticsRepository;
    
    @Autowired
    private OperationRepository operationRepository;
    
    @Autowired
    private CompteRepository compteRepository;

    @Autowired
    private AgencySummaryRepository agencySummaryRepository;

    @Autowired
    private FraisTransactionRepository fraisTransactionRepository;

    @Autowired
    private com.reconciliation.service.OperationService operationService;

    @Transactional
    public List<Statistics> saveStatistics(List<Statistics> statistics) {
        logger.info("Starting to save {} statistics records", statistics.size());
        try {
            for (Statistics stat : statistics) {
                logger.debug("Processing statistics record: agency={}, service={}, date={}", 
                    stat.getAgency(), stat.getService(), stat.getDate());
                
                if (stat.getDate() == null) {
                    logger.warn("Statistics record has null date: agency={}, service={}", 
                        stat.getAgency(), stat.getService());
                    stat.setDate(LocalDate.now());
                }
                
                Statistics savedStat = statisticsRepository.save(stat);
                logger.debug("Successfully saved statistics record with ID: {}", savedStat.getId());
            }
            logger.info("Successfully saved all statistics records");
            return statistics;
        } catch (Exception e) {
            logger.error("Error saving statistics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save statistics: " + e.getMessage(), e);
        }
    }

    public List<Statistics> getStatisticsByDate(LocalDate date) {
        logger.info("Fetching statistics for date: {}", date);
        try {
            List<Statistics> stats = statisticsRepository.findByDate(date);
            logger.debug("Found {} statistics records for date {}", stats.size(), date);
            return stats;
        } catch (Exception e) {
            logger.error("Error fetching statistics by date {}: {}", date, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch statistics by date: " + e.getMessage(), e);
        }
    }

    public List<Statistics> getStatisticsByFilters(String agency, String service, LocalDate startDate, LocalDate endDate) {
        logger.info("Fetching statistics with filters: agency={}, service={}, startDate={}, endDate={}", 
            agency, service, startDate, endDate);
        try {
            List<Statistics> stats = statisticsRepository.findByFilters(agency, service, startDate, endDate);
            logger.debug("Found {} statistics records matching filters", stats.size());
            return stats;
        } catch (Exception e) {
            logger.error("Error fetching statistics with filters: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch statistics with filters: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getDashboardMetrics() {
        logger.info("Calculating dashboard metrics");
        
        try {
            Map<String, Object> metrics = new HashMap<>();
            
            // Total des réconciliations (nombre total d'enregistrements du résumé)
            long totalReconciliations = agencySummaryRepository.count();
            metrics.put("totalReconciliations", totalReconciliations);
            
            // Total des fichiers traités (nombre total d'enregistrements du résumé)
            long totalFiles = agencySummaryRepository.count();
            metrics.put("totalFiles", totalFiles);
            
            // Dernière activité (date la plus récente)
            String lastActivity = agencySummaryRepository.findMaxDate();
            LocalDate yesterday = LocalDate.now().minusDays(1);
            String lastActivityStr;
            if (lastActivity != null) {
                LocalDate lastActivityDate = LocalDate.parse(lastActivity);
                if (lastActivityDate.equals(yesterday)) {
                    lastActivityStr = "Aujourd'hui";
                } else {
                    lastActivityStr = formatLastActivity(lastActivityDate);
                }
            } else {
                lastActivityStr = "Aucune activité récente";
            }
            metrics.put("lastActivity", lastActivityStr);
            
            // Statistiques du jour (modifié : on prend la date d'hier)
            LocalDate yesterdayDate = LocalDate.now().minusDays(1);
            long todayReconciliations = agencySummaryRepository.countByDate(yesterdayDate.toString());
            metrics.put("todayReconciliations", todayReconciliations);
            
            logger.info("Dashboard metrics calculated: totalReconciliations={}, totalFiles={}, lastActivity={}, todayReconciliations={}", 
                totalReconciliations, totalFiles, lastActivityStr, todayReconciliations);
            
            return metrics;
        } catch (Exception e) {
            logger.error("Error calculating dashboard metrics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to calculate dashboard metrics: " + e.getMessage(), e);
        }
    }
    
    private String formatLastActivity(LocalDate date) {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        
        if (date.equals(today)) {
            return "Aujourd'hui";
        } else if (date.equals(yesterday)) {
            return "Hier";
        } else {
            long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(date, today);
            if (daysDiff == 1) {
                return "Il y a 1 jour";
            } else if (daysDiff < 7) {
                return "Il y a " + daysDiff + " jours";
            } else {
                return "Il y a " + (daysDiff / 7) + " semaines";
            }
        }
    }

    public Map<String, Object> getFilterOptions() {
        logger.info("Retrieving filter options from operations data");
        
        try {
            Map<String, Object> filterOptions = new HashMap<>();
            
            // Récupérer les agences depuis les opérations et ajouter "Tous"
            List<String> agencies = new ArrayList<>();
            agencies.add("Tous");
            agencies.addAll(operationRepository.findDistinctAgency());
            filterOptions.put("agencies", agencies);
            
            // Récupérer les services depuis les opérations et ajouter "Tous"
            List<String> services = new ArrayList<>();
            services.add("Tous");
            services.addAll(operationRepository.findDistinctService());
            filterOptions.put("services", services);
            
            // Récupérer les pays depuis les comptes et ajouter "Tous"
            List<String> countries = new ArrayList<>();
            countries.add("Tous");
            countries.addAll(compteRepository.findDistinctPays());
            filterOptions.put("countries", countries);
            
            // Options de filtres temporels
            List<String> timeFilters = List.of("Tous", "Aujourd'hui", "Cette semaine", "Ce mois", "Personnalisé");
            filterOptions.put("timeFilters", timeFilters);
            
            logger.info("Filter options retrieved: {} agencies, {} services, {} countries", 
                agencies.size(), services.size(), countries.size());
            
            return filterOptions;
        } catch (Exception e) {
            logger.error("Error retrieving filter options: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve filter options: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getDetailedMetrics(List<String> agencies, List<String> services, List<String> countries, 
                                                 String timeFilter, String startDate, String endDate) {
        logger.info("Calculating detailed metrics with filters: agencies={}, services={}, countries={}, timeFilter={}, startDate={}, endDate={}", 
            agencies, services, countries, timeFilter, startDate, endDate);
        
        try {
            // Traiter les valeurs "Tous" comme des valeurs vides
            final List<String> finalAgencies = normalizeFilterValues(agencies);
            final List<String> finalServices = normalizeFilterValues(services);
            final List<String> finalCountries = normalizeFilterValues(countries);
            
            // Calculer les dates de filtrage
            String start = null;
            String end = null;
            
            if (timeFilter != null && !timeFilter.equals("Tous")) {
                LocalDate today = LocalDate.now();
                
                switch (timeFilter) {
                    case "Aujourd'hui":
                        LocalDate yesterday = today.minusDays(1);
                        start = yesterday.toString();
                        end = yesterday.toString();
                        break;
                    case "Cette semaine":
                        start = today.minusDays(today.getDayOfWeek().getValue() - 1).toString();
                        end = today.toString();
                        break;
                    case "Ce mois":
                        start = today.withDayOfMonth(1).toString();
                        end = today.toString();
                        break;
                    case "Personnalisé":
                        if (startDate != null && endDate != null) {
                            start = startDate;
                            end = endDate;
                        }
                        break;
                }
            }
            
            Map<String, Object> metrics = new HashMap<>();
            
            // Métriques globales avec filtres temporels (agencySummaryRepository)
            Double totalVolume = agencySummaryRepository.calculateTotalVolumeWithDateRange(finalAgencies, finalServices, finalCountries, start, end);
            long totalTransactions = agencySummaryRepository.countTransactionsWithDateRange(finalAgencies, finalServices, finalCountries, start, end);
            long totalClients = agencySummaryRepository.countDistinctAgencyWithDateRange(finalAgencies, finalServices, finalCountries, start, end);
            metrics.put("totalVolume", totalVolume != null ? totalVolume : 0.0);
            metrics.put("totalTransactions", totalTransactions);
            metrics.put("totalClients", totalClients);

            // Conversion des dates pour les opérations
            final java.time.LocalDateTime startDateTime;
            final java.time.LocalDateTime endDateTime;
            if (start != null && end != null) {
                startDateTime = java.time.LocalDate.parse(start).atStartOfDay();
                endDateTime = java.time.LocalDate.parse(end).atTime(23, 59, 59);
            } else {
                startDateTime = null;
                endDateTime = null;
            }

            // Statistiques par type d'opération (operationRepository)
            List<Object[]> operationStatsRaw = operationRepository.getOperationTypeStatisticsWithDateRange(
                finalServices, finalCountries, startDateTime, endDateTime
            );
            List<Map<String, Object>> operationStats = new ArrayList<>();
            
            // Types de transaction à exclure de l'affichage
            List<String> excludedTypes = List.of("transaction_cree", "annulation_bo", "annulation_partenaire");
            
            for (Object[] row : operationStatsRaw) {
                String operationType = (String) row[0];
                
                // Exclure les types spécifiés
                if (!excludedTypes.contains(operationType)) {
                    Map<String, Object> stat = new HashMap<>();
                    stat.put("operationType", operationType);
                    stat.put("transactionCount", row[1]);
                    stat.put("totalVolume", row[2]);
                    stat.put("averageVolume", row[3]);
                    operationStats.add(stat);
                }
            }
            metrics.put("operationStats", operationStats);

            // Fréquence par type d'opération (operationRepository)
            List<Object[]> frequencyStatsRaw = operationRepository.getOperationFrequencyWithDateRange(
                finalServices, finalCountries, startDateTime, endDateTime
            );
            List<Map<String, Object>> frequencyStats = new ArrayList<>();
            
            for (Object[] row : frequencyStatsRaw) {
                String operationType = (String) row[0];
                
                // Exclure les types spécifiés
                if (!excludedTypes.contains(operationType)) {
                    Map<String, Object> freq = new HashMap<>();
                    freq.put("operationType", operationType);
                    freq.put("frequency", row[1]);
                    frequencyStats.add(freq);
                }
            }
            metrics.put("frequencyStats", frequencyStats);

            // Moyenne volume par jour (agencySummaryRepository)
            Double averageVolume = 0.0;
            if (start != null && end != null) {
                java.time.LocalDate startDateLocal = java.time.LocalDate.parse(start);
                java.time.LocalDate endDateLocal = java.time.LocalDate.parse(end);
                long totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDateLocal, endDateLocal) + 1;
                averageVolume = (totalDays > 0) ? (totalVolume / totalDays) : 0.0;
            } else {
                // Si pas de filtres de dates, calculer sur toute la période disponible
                String minDateStr = agencySummaryRepository.findMinDate();
                String maxDateStr = agencySummaryRepository.findMaxDate();
                if (minDateStr != null && maxDateStr != null) {
                    java.time.LocalDate minDate = java.time.LocalDate.parse(minDateStr);
                    java.time.LocalDate maxDate = java.time.LocalDate.parse(maxDateStr);
                    long totalDays = java.time.temporal.ChronoUnit.DAYS.between(minDate, maxDate) + 1;
                    averageVolume = (totalDays > 0) ? (totalVolume / totalDays) : 0.0;
                }
            }
            metrics.put("averageVolume", averageVolume);

            // --- Moyenne transaction par jour avec filtres appliqués ---
            long averageTransactions = 0;
            if (start != null && end != null) {
                java.time.LocalDate startDateLocal = java.time.LocalDate.parse(start);
                java.time.LocalDate endDateLocal = java.time.LocalDate.parse(end);
                long totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDateLocal, endDateLocal) + 1;
                averageTransactions = totalDays > 0 ? Math.round((double) totalTransactions / totalDays) : 0;
            } else {
                // Si pas de filtres de dates, calculer sur toute la période disponible
                String minDateStr = agencySummaryRepository.findMinDate();
                String maxDateStr = agencySummaryRepository.findMaxDate();
                if (minDateStr != null && maxDateStr != null) {
                    java.time.LocalDate minDate = java.time.LocalDate.parse(minDateStr);
                    java.time.LocalDate maxDate = java.time.LocalDate.parse(maxDateStr);
                    long totalDays = java.time.temporal.ChronoUnit.DAYS.between(minDate, maxDate) + 1;
                    long totalTransactionsAll = agencySummaryRepository.countTransactionsWithDateRange(null, null, null, null, null);
                    averageTransactions = totalDays > 0 ? Math.round((double) totalTransactionsAll / totalDays) : 0;
                }
            }
            metrics.put("averageTransactions", averageTransactions);
            
            // --- Frais de transaction moyen par jour ---
            Double averageFeesPerDay = 0.0;
            
            // Utiliser les opérations avec frais calculés au lieu du repository FraisTransactionRepository
            List<com.reconciliation.model.Operation> operationsWithFrais = operationService.getAllOperationsWithFrais();
            
            // Filtrer les opérations selon les critères
            List<com.reconciliation.model.Operation> filteredOperations = operationsWithFrais.stream()
                .filter(op -> finalAgencies == null || finalAgencies.isEmpty() || finalAgencies.contains(op.getCodeProprietaire()))
                .filter(op -> finalServices == null || finalServices.isEmpty() || finalServices.contains(op.getService()))
                .filter(op -> op.getFraisApplicable() != null && op.getFraisApplicable())
                .filter(op -> {
                    // Appliquer le filtre de dates si spécifié
                    if (startDateTime != null && endDateTime != null) {
                        return op.getDateOperation() != null && 
                               !op.getDateOperation().isBefore(startDateTime) && 
                               !op.getDateOperation().isAfter(endDateTime);
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());
            
            // --- Nouveau calcul du volume des revenus (somme brute des FRAIS_TRANSACTION avec filtres) ---
            String agenceFilter = (finalAgencies != null && !finalAgencies.isEmpty()) ? finalAgencies.get(0) : null;
            String serviceFilter = (finalServices != null && !finalServices.isEmpty()) ? finalServices.get(0) : null;
            String paysFilter = (finalCountries != null && !finalCountries.isEmpty()) ? finalCountries.get(0) : null;
            Double totalFees = operationRepository.sumMontantByTypeOperationWithFilters(
                "FRAIS_TRANSACTION",
                agenceFilter,
                serviceFilter,
                paysFilter,
                startDateTime,
                endDateTime
            );
            metrics.put("totalFees", totalFees != null ? totalFees : 0.0);
            
            // Compter les jours uniques avec des frais (uniquement les débits)
            long daysWithFees = filteredOperations.stream()
                .filter(op -> op.getMontantFrais() != null && op.getMontantFrais() > 0)
                .map(op -> op.getDateOperation().toLocalDate())
                .distinct()
                .count();
            
            if (daysWithFees > 0) {
                averageFeesPerDay = totalFees / daysWithFees;
            } else if (start != null && end != null) {
                // Si pas de frais dans la période, calculer sur la période complète
                java.time.LocalDate startDateLocal = java.time.LocalDate.parse(start);
                java.time.LocalDate endDateLocal = java.time.LocalDate.parse(end);
                long totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDateLocal, endDateLocal) + 1;
                averageFeesPerDay = totalDays > 0 ? (totalFees / totalDays) : 0.0;
            } else {
                // Si pas de filtres de dates, calculer sur toute la période disponible
                String minDateStr = agencySummaryRepository.findMinDate();
                String maxDateStr = agencySummaryRepository.findMaxDate();
                if (minDateStr != null && maxDateStr != null) {
                    java.time.LocalDate minDate = java.time.LocalDate.parse(minDateStr);
                    java.time.LocalDate maxDate = java.time.LocalDate.parse(maxDateStr);
                    long totalDays = java.time.temporal.ChronoUnit.DAYS.between(minDate, maxDate) + 1;
                    averageFeesPerDay = totalDays > 0 ? (totalFees / totalDays) : 0.0;
                }
            }
            metrics.put("averageFeesPerDay", averageFeesPerDay);
            
            logger.info("Detailed metrics calculated: totalVolume={}, totalTransactions={}, totalClients={}, averageFeesPerDay={}", 
                totalVolume, totalTransactions, totalClients, averageFeesPerDay);
            
            return metrics;
        } catch (Exception e) {
            logger.error("Error calculating detailed metrics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to calculate detailed metrics: " + e.getMessage(), e);
        }
    }

    /**
     * Normalise les valeurs de filtre en convertissant "Tous" en null
     */
    private String normalizeFilterValue(String value) {
        return (value != null && !value.trim().isEmpty() && !value.equals("Tous")) ? value : null;
    }

    /**
     * Normalise les listes de valeurs de filtre en retirant les valeurs "Tous"
     */
    private List<String> normalizeFilterValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        List<String> normalized = values.stream()
            .filter(value -> value != null && !value.trim().isEmpty() && !value.equals("Tous"))
            .collect(java.util.stream.Collectors.toList());
        return normalized.isEmpty() ? null : normalized;
    }
} 