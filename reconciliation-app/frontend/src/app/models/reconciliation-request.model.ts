export interface ReconciliationRequest {
    boFileContent: Record<string, string>[];
    partnerFileContent: Record<string, string>[];
    boKeyColumn: string;
    partnerKeyColumn: string;
    comparisonColumns: {
        boColumn: string;
        partnerColumn: string;
    }[];
    selectedService?: string;
} 