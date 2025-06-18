package com.reconciliation.controller;

import com.reconciliation.model.Statistics;
import com.reconciliation.service.StatisticsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/statistics")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class StatisticsController {
    private static final Logger logger = LoggerFactory.getLogger(StatisticsController.class);
    
    private final StatisticsService statisticsService;

    @Autowired
    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveStatistics(@RequestBody List<Statistics> statistics, HttpServletRequest request) {
        logger.info("=== STATISTICS SAVE REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Content-Type: {}", request.getContentType());
        logger.info("Number of statistics records: {}", statistics.size());
        
        try {
            if (statistics == null || statistics.isEmpty()) {
                logger.warn("Received empty statistics list");
                return ResponseEntity.badRequest().body("Statistics list cannot be empty");
            }

            logger.debug("Processing statistics records:");
            for (Statistics stat : statistics) {
                logger.debug("Record: agency={}, service={}, date={}, totalVolume={}, recordCount={}",
                    stat.getAgency(), stat.getService(), stat.getDate(), 
                    stat.getTotalVolume(), stat.getRecordCount());
            }

            List<Statistics> savedStats = statisticsService.saveStatistics(statistics);
            logger.info("Successfully saved {} statistics records", savedStats.size());
            return ResponseEntity.ok(savedStats);
        } catch (Exception e) {
            logger.error("Error saving statistics: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body("Failed to save statistics: " + e.getMessage());
        }
    }

    @GetMapping("/by-date")
    public ResponseEntity<?> getStatisticsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        logger.info("=== STATISTICS BY DATE REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Date parameter: {}", date);
        
        try {
            List<Statistics> stats = statisticsService.getStatisticsByDate(date);
            logger.info("Found {} statistics records for date {}", stats.size(), date);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching statistics by date {}: {}", date, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body("Failed to fetch statistics: " + e.getMessage());
        }
    }

    @GetMapping("/by-filters")
    public ResponseEntity<?> getStatisticsByFilters(
            @RequestParam(required = false) String agency,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest request) {
        logger.info("=== STATISTICS BY FILTERS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Filters: agency={}, service={}, startDate={}, endDate={}", 
            agency, service, startDate, endDate);
        
        try {
            List<Statistics> stats = statisticsService.getStatisticsByFilters(agency, service, startDate, endDate);
            logger.info("Found {} statistics records matching filters", stats.size());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching statistics with filters: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body("Failed to fetch statistics: " + e.getMessage());
        }
    }
} 