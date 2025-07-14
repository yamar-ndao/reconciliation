export interface Compte {
    id?: number;
    numeroCompte: string;
    solde: number;
    dateDerniereMaj: string;
    pays: string;
    codeProprietaire?: string;
    agence?: string;
}

export interface CompteCreateRequest {
    numeroCompte: string;
    solde: number;
    pays: string;
    codeProprietaire?: string;
    agence?: string;
}

export interface CompteUpdateRequest {
    numeroCompte?: string;
    solde?: number;
    pays?: string;
    codeProprietaire?: string;
    agence?: string;
}

export interface CompteFilter {
    pays?: string;
    dateDebut?: string;
    dateFin?: string;
    codeProprietaire?: string;
} 