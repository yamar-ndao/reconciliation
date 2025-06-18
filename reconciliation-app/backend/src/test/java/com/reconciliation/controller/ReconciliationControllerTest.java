package com.reconciliation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import com.reconciliation.service.CsvReconciliationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ReconciliationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
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
            map.put("header1", parts[0]);
            map.put("header2", parts[1]);
            result.add(map);
        }
        return result;
    }

    @Test
    public void testEndpoint_ShouldReturnSuccess() throws Exception {
        mockMvc.perform(get("/api/reconciliation/test"))
                .andExpect(status().isOk())
                .andExpect(content().string("Serveur fonctionne - CORS OK"));
    }

    @Test
    public void reconcileEndpoint_ShouldReturnReconciliationResult() throws Exception {
        // Préparer les données de test
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(createRecords("value1,value2"));
        request.setPartnerFileContent(createRecords("value1,value2"));
        request.setBoKeyColumn("header1");
        request.setPartnerKeyColumn("header1");
        request.setComparisonColumns(makeComparisons("header2"));

        // Préparer la réponse mock
        ReconciliationResponse response = new ReconciliationResponse();
        List<ReconciliationResponse.Match> matches = new ArrayList<>();
        ReconciliationResponse.Match match = new ReconciliationResponse.Match();
        match.setKey("value1");
        match.setBoData(createRecords("value1,value2").get(0));
        match.setPartnerData(createRecords("value1,value2").get(0));
        match.setDifferences(new ArrayList<>());
        matches.add(match);
        response.setMatches(matches);

        when(reconciliationService.reconcile(any(ReconciliationRequest.class)))
                .thenReturn(response);

        // Exécuter le test
        mockMvc.perform(post("/api/reconciliation/reconcile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches").exists());
    }

    @Test
    public void uploadEndpoint_ShouldReturnFileContent() throws Exception {
        // Créer un fichier de test
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.csv",
                MediaType.TEXT_PLAIN_VALUE,
                "header1,header2\nvalue1,value2".getBytes()
        );

        // Exécuter le test
        mockMvc.perform(multipart("/api/reconciliation/upload")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(content().string("header1,header2\nvalue1,value2"));
    }

    @Test
    public void optionsEndpoint_ShouldReturnCorsHeaders() throws Exception {
        mockMvc.perform(options("/api/reconciliation/reconcile")
                .header("Origin", "http://localhost:4200")
                .header("Access-Control-Request-Headers", "Origin, Content-Type, Accept, Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"))
                .andExpect(header().string("Allow", "POST,OPTIONS"));
    }
} 