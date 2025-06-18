import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map, finalize } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService {
    private apiUrl = 'http://localhost:8080/api/reconciliation';
    private progressSubject = new BehaviorSubject<number>(0);
    public progress$ = this.progressSubject.asObservable();

    constructor(private http: HttpClient) {}

    uploadFile(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<string>(`${this.apiUrl}/upload`, formData)
            .pipe(catchError(this.handleError));
    }

    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('Sending reconciliation request:', request);
        
        // Commencer la progression avant l'envoi de la requête
        this.progressSubject.next(10);
        
        // Créer un intervalle pour mettre à jour la progression pendant le traitement
        const progressInterval = setInterval(() => {
            const currentProgress = this.progressSubject.value;
            if (currentProgress < 90) {
                this.progressSubject.next(currentProgress + 10);
            }
        }, 1000);

        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request)
            .pipe(
                tap(response => {
                    console.log('Received reconciliation response:', response);
                }),
                finalize(() => {
                    clearInterval(progressInterval);
                    this.progressSubject.next(100);
                }),
                catchError(error => {
                    clearInterval(progressInterval);
                    this.progressSubject.next(0);
                    return this.handleError(error);
                })
            );
    }

    saveSummary(summary: any[]): Observable<any> {
        // Correction de l'URL pour correspondre à la route backend
        return this.http.post('http://localhost:8080/api/agency-summary/save', {
            summary,
            timestamp: new Date().toISOString()
        })
        .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status === 0) {
            // Erreur de connexion au serveur
            errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur est en cours d\'exécution.';
        } else {
            // Erreur côté serveur
            errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
            if (error.error && error.error.message) {
                errorMessage += `\nDétails: ${error.error.message}`;
            }
        }
        
        console.error('Erreur complète:', error);
        // Réinitialiser la progression en cas d'erreur
        this.progressSubject.next(0);
        return throwError(() => new Error(errorMessage));
    }
} 