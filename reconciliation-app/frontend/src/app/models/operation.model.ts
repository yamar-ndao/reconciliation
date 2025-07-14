export interface Operation {
    id?: number;
    typeOperation: string;
    dateOperation: string;
    codeProprietaire: string;
    service?: string;
    montant: number;
    soldeAvant: number;
    soldeApres: number;
    nomBordereau?: string;
    banque?: string;
    statut: string;
    pays: string;
    compteId?: number;
    parentOperationId?: number;
}

export interface OperationCreateRequest {
    compteId: number;
    typeOperation: string;
    montant: number;
    banque?: string;
    nomBordereau?: string;
    service?: string;
    dateOperation: string;
}

export interface OperationUpdateRequest {
    typeOperation?: string;
    codeProprietaire?: string;
    service?: string;
    montant?: number;
    soldeAvant?: number;
    soldeApres?: number;
    nomBordereau?: string;
    banque?: string;
    statut?: string;
    pays?: string;
    compteId?: number;
    dateOperation?: string;
}

export interface OperationFilter {
    compteId?: number;
    typeOperation?: string;
    pays?: string;
    statut?: string;
    banque?: string;
    codeProprietaire?: string;
    service?: string;
    nomBordereau?: string;
    dateDebut?: string;
    dateFin?: string;
}

export enum TypeOperation {
    TOTAL_CASHIN = 'total_cashin',
    TOTAL_PAIEMENT = 'total_paiement',
    APPROVISIONNEMENT = 'approvisionnement',
    AJUSTEMENT = 'ajustement',
    COMPENSE = 'compense',
    FRAIS_TRANSACTION = 'FRAIS_TRANSACTION',
    ANNULATION_PARTENAIRE = 'annulation_partenaire',
    ANNULATION_BO = 'annulation_bo',
    TRANSACTION_CREE = 'transaction_cree'
}

export enum StatutOperation {
    EN_ATTENTE = 'En attente',
    VALIDEE = 'Validée',
    REJETEE = 'Rejetée',
    ANNULEE = 'Annulée',
    EN_COURS = 'En cours'
} 