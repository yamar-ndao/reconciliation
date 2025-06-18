package com.reconciliation.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ReconciliationRequest {
    private List<Map<String, String>> boFileContent;
    private List<Map<String, String>> partnerFileContent;
    private String boKeyColumn;
    private String partnerKeyColumn;
    private List<ColumnComparison> comparisonColumns;
} 