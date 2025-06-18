package com.reconciliation.repository;

import com.reconciliation.model.Statistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StatisticsRepository extends JpaRepository<Statistics, Long> {
    Optional<Statistics> findByAgencyAndServiceAndDate(String agency, String service, LocalDate date);
    List<Statistics> findByDate(LocalDate date);
    List<Statistics> findByDateAndAgencyAndService(LocalDate date, String agency, String service);

    @Query("SELECT s FROM Statistics s WHERE " +
           "(:agency IS NULL OR s.agency = :agency) AND " +
           "(:service IS NULL OR s.service = :service) AND " +
           "(:startDate IS NULL OR s.date >= :startDate) AND " +
           "(:endDate IS NULL OR s.date <= :endDate)")
    List<Statistics> findByFilters(
        @Param("agency") String agency,
        @Param("service") String service,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
} 