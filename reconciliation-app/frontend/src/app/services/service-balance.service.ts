import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compte } from '../models/compte.model';

export interface MergeRequest {
  compteIds: number[];
  nouveauNomCompte: string;
  pays: string;
}

export interface FusionResult {
  nouveauCompteId: number;
  nouveauNomCompte: string;
  totalSolde: number;
  nombreComptesFusionnes: number;
  pays: string;
}

export interface SubCompteRequest {
  codeProprietaire: string;
  serviceCompteId: number;
  serviceCompteNumero: string;
}

export interface ServiceConsumptionStats {
  services: ServiceStat[];
  totalServices: number;
  totalVolume: number;
  totalOperations: number;
}

export interface ServiceStat {
  serviceName: string;
  serviceId: number;
  pays: string;
  solde: number;
  totalVolume: number;
  operationCount: number;
  uniqueCodeProprietaires: number;
  codeProprietaireDetails: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class ServiceBalanceService {
  private apiUrl = '/api/service-balance';

  constructor(private http: HttpClient) { }

  /**
   * Test de connectivité de l'API
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  /**
   * Test de connectivité simple
   */
  testPing(): Observable<any> {
    return this.http.get('/api/test/ping');
  }

  /**
   * Récupère tous les comptes service
   */
  getServiceComptes(): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/comptes`);
  }
  
  /**
   * Récupère tous les comptes (pour debug)
   */
  getAllComptes(): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/comptes/all`);
  }

  /**
   * Fusionne plusieurs comptes service en un nouveau compte
   */
  mergeServiceComptes(compteIds: number[], nouveauNomCompte: string, pays: string): Observable<FusionResult> {
    const request: MergeRequest = {
      compteIds,
      nouveauNomCompte,
      pays
    };
    
    console.log('Envoi de la requête de fusion:', request);
    return this.http.post<FusionResult>(`${this.apiUrl}/merge`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fusionne plusieurs sous-comptes (codes propriétaires) en un nouveau compte consolidé
   */
  mergeSubComptes(subComptes: SubCompteRequest[], nouveauNomCompte: string, pays: string): Observable<FusionResult> {
    const request = {
      subComptes,
      nouveauNomCompte,
      pays
    };
    
    console.log('Envoi de la requête de fusion des sous-comptes:', request);
    return this.http.post<FusionResult>(`${this.apiUrl}/merge-sub-comptes`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Récupère les statistiques de consommation des services
   */
  getServiceConsumptionStats(): Observable<ServiceConsumptionStats> {
    return this.http.get<ServiceConsumptionStats>(`${this.apiUrl}/stats/consumption`);
  }
}
