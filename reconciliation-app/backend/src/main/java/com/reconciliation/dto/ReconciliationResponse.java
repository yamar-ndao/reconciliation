package com.reconciliation.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ReconciliationResponse {
    private List<Match> matches;
    private List<Map<String, String>> boOnly;
    private List<Map<String, String>> partnerOnly;
    private List<Map<String, String>> mismatches;
    
    // Ajout des propriétés de totaux
    private int totalBoRecords;
    private int totalPartnerRecords;
    private int totalMatches;
    private int totalMismatches;
    private int totalBoOnly;
    private int totalPartnerOnly;

    @Data
    public static class Match {
        private String key;
        private Map<String, String> boData;
        private Map<String, String> partnerData;
        private List<Difference> differences;
    }

    @Data
    public static class Difference {
        private String boColumn;
        private String partnerColumn;
        private String boValue;
        private String partnerValue;
        private boolean different;
    }
} 