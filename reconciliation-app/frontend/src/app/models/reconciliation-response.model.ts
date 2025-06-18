export interface ReconciliationResponse {
    matches: Match[];
    boOnly: Record<string, string>[];
    partnerOnly: Record<string, string>[];
    mismatches: Record<string, string>[];
    totalBoRecords: number;
    totalPartnerRecords: number;
    totalMatches: number;
    totalMismatches: number;
    totalBoOnly: number;
    totalPartnerOnly: number;
}

export interface Match {
    key: string;
    boData: Record<string, string>;
    partnerData: Record<string, string>;
    differences: Difference[];
}

export interface Difference {
    boColumn: string;
    partnerColumn: string;
    boValue: string;
    partnerValue: string;
    different: boolean;
} 