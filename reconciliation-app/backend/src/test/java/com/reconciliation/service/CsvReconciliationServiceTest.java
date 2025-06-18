package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class CsvReconciliationServiceTest {

    @Autowired
    private CsvReconciliationService reconciliationService;

    private List<ColumnComparison> makeComparisons(String... columns) {
        return Arrays.stream(columns)
                .map(col -> {
                    ColumnComparison cc = new ColumnComparison();
                    cc.setBoColumn(col);
                    cc.setPartnerColumn(col);
                    return cc;
                })
                .toList();
    }

    private List<Map<String, String>> createRecords(String... records) {
        List<Map<String, String>> result = new ArrayList<>();
        for (String record : records) {
            String[] parts = record.split(",");
            Map<String, String> map = new HashMap<>();
            map.put("id", parts[0]);
            map.put("name", parts[1]);
            map.put("value", parts[2]);
            result.add(map);
        }
        return result;
    }

    @Test
    public void reconcile_WithMatchingRecords_ShouldReturnMatches() {
        // Préparer les données de test
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(createRecords("1,test1,100", "2,test2,200"));
        request.setPartnerFileContent(createRecords("1,test1,100", "3,test3,300"));
        request.setBoKeyColumn("id");
        request.setPartnerKeyColumn("id");
        request.setComparisonColumns(makeComparisons("name", "value"));

        // Exécuter le test
        ReconciliationResponse response = reconciliationService.reconcile(request);

        // Vérifier les résultats
        assertNotNull(response);
        assertEquals(1, response.getMatches().size());
        assertEquals(1, response.getBoOnly().size());
        assertEquals(1, response.getPartnerOnly().size());
        assertEquals(0, response.getMismatches().size());

        // Vérifier le contenu des matches
        ReconciliationResponse.Match match = response.getMatches().get(0);
        assertEquals("1", match.getKey());
        assertEquals("test1", match.getBoData().get("name"));
        assertEquals("100", match.getBoData().get("value"));
        assertEquals("test1", match.getPartnerData().get("name"));
        assertEquals("100", match.getPartnerData().get("value"));
        assertTrue(match.getDifferences().isEmpty());
    }

    @Test
    public void reconcile_WithMismatchingRecords_ShouldReturnMismatches() {
        // Préparer les données de test
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(createRecords("1,test1,100"));
        request.setPartnerFileContent(createRecords("1,test1,200"));
        request.setBoKeyColumn("id");
        request.setPartnerKeyColumn("id");
        request.setComparisonColumns(makeComparisons("value"));

        // Exécuter le test
        ReconciliationResponse response = reconciliationService.reconcile(request);

        // Vérifier les résultats
        assertNotNull(response);
        assertEquals(0, response.getMatches().size());
        assertEquals(0, response.getBoOnly().size());
        assertEquals(0, response.getPartnerOnly().size());
        assertEquals(1, response.getMismatches().size());

        // Vérifier le contenu des mismatches
        Map<String, String> mismatch = response.getMismatches().get(0);
        assertEquals("1", mismatch.get("id"));
        assertEquals("test1", mismatch.get("name"));
        assertEquals("100", mismatch.get("value"));
    }

    @Test
    public void reconcile_WithEmptyFiles_ShouldReturnEmptyResults() {
        // Préparer les données de test
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(new ArrayList<>());
        request.setPartnerFileContent(new ArrayList<>());
        request.setBoKeyColumn("id");
        request.setPartnerKeyColumn("id");
        request.setComparisonColumns(makeComparisons("name", "value"));

        // Exécuter le test
        ReconciliationResponse response = reconciliationService.reconcile(request);

        // Vérifier les résultats
        assertNotNull(response);
        assertEquals(0, response.getMatches().size());
        assertEquals(0, response.getBoOnly().size());
        assertEquals(0, response.getPartnerOnly().size());
        assertEquals(0, response.getMismatches().size());
    }
} 