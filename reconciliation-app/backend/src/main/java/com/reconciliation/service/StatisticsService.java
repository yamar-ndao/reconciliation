package com.reconciliation.service;

import com.reconciliation.model.Statistics;
import com.reconciliation.repository.StatisticsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

@Service
public class StatisticsService {
    private static final Logger logger = LoggerFactory.getLogger(StatisticsService.class);

    private final StatisticsRepository statisticsRepository;

    @Autowired
    public StatisticsService(StatisticsRepository statisticsRepository) {
        this.statisticsRepository = statisticsRepository;
    }

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
} 