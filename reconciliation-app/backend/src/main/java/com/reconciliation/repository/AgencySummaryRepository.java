package com.reconciliation.repository;

import com.reconciliation.entity.AgencySummaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AgencySummaryRepository extends JpaRepository<AgencySummaryEntity, Long> {
    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.date = :date AND a.agency = :agency AND a.service = :service AND a.totalVolume = :totalVolume AND a.recordCount = :recordCount")
    List<AgencySummaryEntity> findDuplicates(
        @Param("date") String date,
        @Param("agency") String agency,
        @Param("service") String service,
        @Param("totalVolume") double totalVolume,
        @Param("recordCount") int recordCount
    );
} 