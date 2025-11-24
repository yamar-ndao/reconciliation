import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, timer, from, timeout } from 'rxjs';
import { catchError, tap, map, finalize, retry, takeUntil, switchMap } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { AppStateService } from './app-state.service';

export interface ReconciliationConfig {
    boFile: File;
    partnerFile: File;
    boReconciliationKey: string;
    partnerReconciliationKey: string;
    additionalKeys?: Array<{ boColumn: string; partnerColumn: string }>;
    tolerance?: number;
}

export interface ChunkProcessingConfig {
    boReconciliationKey: string;
    partnerReconciliationKey: string;
}

export interface ProgressUpdate {
    percentage: number;
    processed: number;
    total: number;
    step: string;
    currentFile?: number;
    totalFiles?: number;
    estimatedTimeRemaining?: number;
    // Informations détaillées pour le traitement par chunks
    currentBoChunk?: number;
    totalBoChunks?: number;
    matchesCount?: number;
    boOnlyCount?: number;
    partnerRemaining?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit, OnDestroy {
    private apiUrl = '/api/reconciliation';
    private memoryResults = new Map<string, any>(); // Stockage en mémoire pour les gros fichiers
    
    // Progress management
    private progressSubject = new BehaviorSubject<ProgressUpdate>({
        percentage: 0,
        processed: 0,
        total: 0,
        step: '',
        currentFile: 0,
        totalFiles: 0,
        estimatedTimeRemaining: 0
    });
    
    public progress$ = this.progressSubject.asObservable();
    
    // Job management
    private currentJobId: string | null = null;
    private destroy$ = new Subject<void>();
    
    constructor(private http: HttpClient, private appStateService: AppStateService) {
        console.log('🚀 ReconciliationService initialisé - Mode HTTP classique');
    }

    ngOnInit(): void {
        // Initialisation si nécessaire
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Démarre la réconciliation avec upload des fichiers
     * Mode HTTP classique sans WebSocket
     */
    startReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🚀 Démarrage de la réconciliation HTTP classique');
        
        // Détecter si c'est un gros fichier nécessitant un traitement par chunks
        const isLargeFile = this.isLargeFile(config.boFile, config.partnerFile);
        
        if (isLargeFile) {
            console.log('📊 Gros fichier détecté, utilisation du traitement par chunks');
            return this.startChunkedReconciliation(config);
        }
        
        // Créer le FormData pour l'upload
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 10,
            processed: 0,
            total: 100,
            step: 'Upload des fichiers...',
            estimatedTimeRemaining: 30000
        });

        return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare`, formData)
            .pipe(
                tap(response => {
                    console.log('✅ Job créé:', response);
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 20,
                        processed: 0,
                        total: 100,
                        step: 'Traitement en cours...',
                        estimatedTimeRemaining: 25000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks pour les gros fichiers
     */
    private startChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🔄 Démarrage de la réconciliation par chunks');
        
        // Pour les très gros fichiers, utiliser le traitement côté frontend
        if (this.isVeryLargeFile(config.boFile, config.partnerFile)) {
            console.log('📊 Très gros fichier détecté, utilisation du traitement frontend');
            return this.startFrontendChunkedReconciliation(config);
        }
        
        // Créer le FormData avec indication de traitement par chunks
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        formData.append('chunkedProcessing', 'true'); // Indicateur pour le backend
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 5,
            processed: 0,
            total: 100,
            step: 'Préparation du traitement par chunks...',
            estimatedTimeRemaining: 60000
        });

        return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare-chunked`, formData)
            .pipe(
                tap(response => {
                    console.log('✅ Job par chunks créé:', response);
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 15,
                        processed: 0,
                        total: 100,
                        step: 'Traitement par chunks en cours...',
                        estimatedTimeRemaining: 45000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks côté frontend pour les très gros fichiers
     */
    private startFrontendChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🔄 Démarrage de la réconciliation par chunks côté frontend');
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement frontend par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processFrontendChunkedReconciliation(config, jobId)
                .then(() => {
                    observer.next({ jobId, status: 'completed' });
                    observer.complete();
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks côté frontend
     */
    private async processFrontendChunkedReconciliation(config: ReconciliationConfig, jobId: string): Promise<void> {
        try {
            console.log('🔄 Début du traitement frontend par chunks');
            
            // Lire les fichiers par chunks
            const boData = await this.readFileInChunks(config.boFile);
            const partnerData = await this.readFileInChunks(config.partnerFile);
            
            console.log(`📊 Données chargées: BO=${boData.length}, Partner=${partnerData.length}`);
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                const partnerChunk = partnerData.slice(i, i + chunkSize);
                
                // Traitement du chunk (logique de réconciliation simplifiée)
                const chunkResults = this.processReconciliationChunk(boChunk, partnerChunk, config);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                results.unmatchedPartnerRecords.push(...chunkResults.unmatchedPartnerRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, config);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement frontend par chunks:', error);
            throw error;
        }
    }

    /**
     * Lit un fichier par chunks pour éviter les problèmes de mémoire
     */
    private async readFileInChunks(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const data: any[] = [];
            
            reader.onload = (e) => {
                try {
                    const text = (e.target as FileReader).result as string;
                    const lines = text.split('\n');
                    
                    // Traitement par chunks des lignes
                    const chunkSize = 5000;
                    for (let i = 0; i < lines.length; i += chunkSize) {
                        const chunk = lines.slice(i, i + chunkSize);
                        // Traitement du chunk (parsing CSV simplifié)
                        const parsedChunk = this.parseCsvChunk(chunk);
                        data.push(...parsedChunk);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Parse un chunk de CSV
     */
    private parseCsvChunk(lines: string[]): any[] {
        const result: any[] = [];
        const headers = lines[0]?.split(';') || [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(';');
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                result.push(row);
            }
        }
        
        return result;
    }

    /**
     * Traite un chunk de réconciliation
     */
    private processReconciliationChunk(boChunk: any[], partnerChunk: any[], config: ChunkProcessingConfig): any {
        const matchedRecords: any[] = [];
        const unmatchedBoRecords: any[] = [];
        const unmatchedPartnerRecords: any[] = [];
        
        // Créer un index des clés partenaires pour une recherche plus rapide
        const partnerIndex = new Map();
        partnerChunk.forEach(partner => {
            const key = partner[config.partnerReconciliationKey];
            if (key) {
                if (!partnerIndex.has(key)) {
                    partnerIndex.set(key, []);
                }
                partnerIndex.get(key).push(partner);
            }
        });
        
        // Traiter les enregistrements BO
        for (const boRecord of boChunk) {
            const boKey = boRecord[config.boReconciliationKey];
            if (boKey && partnerIndex.has(boKey)) {
                const matchingPartners = partnerIndex.get(boKey);
                // Prendre le premier partenaire correspondant
                const partnerRecord = matchingPartners.shift();
                matchedRecords.push({ bo: boRecord, partner: partnerRecord });
                
                // Marquer les autres partenaires comme non matchés si nécessaire
                if (matchingPartners.length > 0) {
                    unmatchedPartnerRecords.push(...matchingPartners);
                }
            } else {
                unmatchedBoRecords.push(boRecord);
            }
        }
        
        // Ajouter les partenaires non matchés
        partnerIndex.forEach((partners, key) => {
            if (partners.length > 0) {
                unmatchedPartnerRecords.push(...partners);
            }
        });
        
        return { matchedRecords, unmatchedBoRecords, unmatchedPartnerRecords };
    }

    /**
     * Sauvegarde les résultats du traitement par chunks
     */
    private saveChunkedResults(jobId: string, results: any, config?: ChunkProcessingConfig): void {
        try {
            console.log('💾 Sauvegarde des résultats complets...');
            
            // Sauvegarder toutes les données mais de manière optimisée
            const fullResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                boReconciliationKey: config?.boReconciliationKey || 'IDTransaction',
                partnerReconciliationKey: config?.partnerReconciliationKey || 'Identifiant de session API',
                // Sauvegarder TOUTES les données
                matchedRecords: results.matchedRecords,
                unmatchedBoRecords: results.unmatchedBoRecords,
                unmatchedPartnerRecords: results.unmatchedPartnerRecords,
                // Indicateur que c'est un traitement par chunks
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            // Sauvegarder par chunks pour éviter l'erreur de sérialisation
            this.saveResultsInChunks(jobId, fullResults);
            
            console.log('💾 Résultats complets sauvegardés:', {
                totalMatched: fullResults.totalMatched,
                totalUnmatchedBo: fullResults.totalUnmatchedBo,
                totalUnmatchedPartner: fullResults.totalUnmatchedPartner
            });
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde des résultats:', error);
            // Sauvegarder au moins les métadonnées essentielles
            const minimalResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(minimalResults));
            console.log('💾 Résultats minimaux sauvegardés');
        }
    }

    /**
     * Sauvegarde les résultats par chunks pour éviter les erreurs de sérialisation
     */
    private saveResultsInChunks(jobId: string, results: any): void {
        try {
            // Pour les très gros fichiers, utiliser la mémoire en temps réel au lieu du localStorage
            if (results.totalMatched > 10000 || results.totalUnmatchedBo > 10000 || results.totalUnmatchedPartner > 10000) {
                console.log('📊 Fichier très volumineux détecté - Utilisation de la mémoire en temps réel');
                this.saveInMemory(jobId, results);
                return;
            }
            
            // Sauvegarder les métadonnées d'abord
            const metadata = {
                jobId: results.jobId,
                status: results.status,
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.totalMatched,
                totalUnmatchedBo: results.totalUnmatchedBo,
                totalUnmatchedPartner: results.totalUnmatchedPartner,
                boReconciliationKey: results.boReconciliationKey,
                partnerReconciliationKey: results.partnerReconciliationKey,
                isChunkedProcessing: results.isChunkedProcessing,
                processedAt: results.processedAt
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(metadata));
            console.log('💾 Métadonnées sauvegardées');
            
            // Sauvegarder les données par chunks plus petits
            const chunkSize = 500; // 500 enregistrements par chunk pour éviter le quota
            
            // Sauvegarder les matches par chunks
            for (let i = 0; i < results.matchedRecords.length; i += chunkSize) {
                const chunk = results.matchedRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-matches-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les matches, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 Matches sauvegardés en ${Math.ceil(results.matchedRecords.length / chunkSize)} chunks`);
            
            // Sauvegarder les unmatchedBo par chunks
            for (let i = 0; i < results.unmatchedBoRecords.length; i += chunkSize) {
                const chunk = results.unmatchedBoRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-bo-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les bo-only, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 UnmatchedBo sauvegardés en ${Math.ceil(results.unmatchedBoRecords.length / chunkSize)} chunks`);
            
            // Sauvegarder les unmatchedPartner par chunks
            for (let i = 0; i < results.unmatchedPartnerRecords.length; i += chunkSize) {
                const chunk = results.unmatchedPartnerRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-partner-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les partner-only, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 UnmatchedPartner sauvegardés en ${Math.ceil(results.unmatchedPartnerRecords.length / chunkSize)} chunks`);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde par chunks:', error);
            // En cas d'erreur, passer en mode mémoire
            this.saveInMemory(jobId, results);
        }
    }

    /**
     * Sauvegarde en mémoire pour les très gros fichiers
     */
    private saveInMemory(jobId: string, results: any): void {
        // Stocker en mémoire dans le service
        this.memoryResults.set(jobId, {
            jobId: results.jobId,
            status: results.status,
            totalBoRecords: results.totalBoRecords,
            totalPartnerRecords: results.totalPartnerRecords,
            totalMatched: results.totalMatched,
            totalUnmatchedBo: results.totalUnmatchedBo,
            totalUnmatchedPartner: results.totalUnmatchedPartner,
            boReconciliationKey: results.boReconciliationKey,
            partnerReconciliationKey: results.partnerReconciliationKey,
            isChunkedProcessing: results.isChunkedProcessing,
            processedAt: results.processedAt,
            // Stocker toutes les données en mémoire
            matchedRecords: results.matchedRecords,
            unmatchedBoRecords: results.unmatchedBoRecords,
            unmatchedPartnerRecords: results.unmatchedPartnerRecords
        });
        
        console.log('💾 Résultats sauvegardés en mémoire:', {
            totalMatched: results.totalMatched,
            totalUnmatchedBo: results.totalUnmatchedBo,
            totalUnmatchedPartner: results.totalUnmatchedPartner
        });
    }

    /**
     * Détermine si c'est un très gros fichier nécessitant un traitement frontend
     */
    private isVeryLargeFile(boFile: File, partnerFile: File): boolean {
        // Désactiver le traitement frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        return false;
    }

    /**
     * Détermine si les fichiers nécessitent un traitement par chunks
     */
    private isLargeFile(boFile: File, partnerFile: File): boolean {
        const totalSize = boFile.size + partnerFile.size;
        const sizeThreshold = 50 * 1024 * 1024; // 50MB
        
        // Vérifier la taille totale
        if (totalSize > sizeThreshold) {
            return true;
        }
        
        // Vérifier le nombre de lignes estimé (basé sur la taille)
        const estimatedBoRows = Math.ceil(boFile.size / 100); // Estimation approximative
        const estimatedPartnerRows = Math.ceil(partnerFile.size / 100);
        
        return estimatedBoRows > 100000 || estimatedPartnerRows > 100000;
    }

    /**
     * Obtient le statut d'un job de réconciliation
     */
    getJobStatus(jobId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/status/${jobId}`)
            .pipe(
                tap((status: any) => {
                    console.log('📊 Statut du job:', status);
                    
                    // Mettre à jour la progression basée sur le statut
                    if (status.progress) {
                        this.updateProgress({
                            percentage: status.progress.percentage || 0,
                            processed: status.progress.processed || 0,
                            total: status.progress.total || 100,
                            step: status.progress.step || 'Traitement...',
                            estimatedTimeRemaining: status.progress.estimatedTimeRemaining || 0
                        });
                    }
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient les résultats d'un job de réconciliation
     */
    getJobResults(jobId: string): Observable<ReconciliationResponse> {
        // Vérifier si c'est un job de traitement frontend
        if (jobId.startsWith('frontend-chunked-')) {
            return this.getFrontendChunkedResults(jobId);
        }
        
        return this.http.get<ReconciliationResponse>(`${this.apiUrl}/results/${jobId}`)
            .pipe(
                tap(results => {
                    console.log('✅ Résultats obtenus:', results);
                    
                    this.updateProgress({
                        percentage: 100,
                        processed: results.totalBoRecords + results.totalPartnerRecords,
                        total: results.totalBoRecords + results.totalPartnerRecords,
                        step: 'Terminé',
                        estimatedTimeRemaining: 0
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Récupère les résultats du traitement frontend par chunks
     */
    private getFrontendChunkedResults(jobId: string): Observable<ReconciliationResponse> {
        return new Observable(observer => {
            try {
                // Vérifier d'abord en mémoire
                if (this.memoryResults.has(jobId)) {
                    const results = this.memoryResults.get(jobId);
                    console.log('✅ Résultats frontend récupérés depuis la mémoire:', results);
                    
                    // Convertir au format standard
                    const response: ReconciliationResponse = {
                        matches: results.matchedRecords.map(match => ({
                            key: match.bo[results.boReconciliationKey] || '',
                            boData: match.bo,
                            partnerData: match.partner,
                            differences: []
                        })),
                        boOnly: results.unmatchedBoRecords,
                        partnerOnly: results.unmatchedPartnerRecords,
                        mismatches: [],
                        totalBoRecords: results.totalBoRecords,
                        totalPartnerRecords: results.totalPartnerRecords,
                        totalMatches: results.totalMatched,
                        totalMismatches: 0,
                        totalBoOnly: results.totalUnmatchedBo,
                        totalPartnerOnly: results.totalUnmatchedPartner,
                        executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                        processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                        progressPercentage: 100
                    };
                    
                    observer.next(response);
                    observer.complete();
                    return;
                }
                
                // Sinon, essayer le localStorage
                const resultsData = localStorage.getItem(`reconciliation-results-${jobId}`);
                if (resultsData) {
                    const results = JSON.parse(resultsData);
                    console.log('✅ Résultats frontend récupérés depuis localStorage:', results);
                    
                    // Vérifier si c'est un traitement par chunks avec données complètes
                    if (results.isChunkedProcessing) {
                        console.log('📊 Résultats de traitement par chunks détectés - Récupération des données complètes');
                        
                        // Récupérer toutes les données depuis les chunks
                        const allMatches = this.loadDataFromChunks(jobId, 'matches');
                        const allBoOnly = this.loadDataFromChunks(jobId, 'bo-only');
                        const allPartnerOnly = this.loadDataFromChunks(jobId, 'partner-only');
                        
                        console.log(`📊 Données complètes récupérées: ${allMatches.length} matches, ${allBoOnly.length} bo-only, ${allPartnerOnly.length} partner-only`);
                        
                        // Convertir au format standard
                        const response: ReconciliationResponse = {
                            matches: allMatches.map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                differences: []
                            })),
                            boOnly: allBoOnly,
                            partnerOnly: allPartnerOnly,
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.totalMatched,
                            totalMismatches: 0,
                            totalBoOnly: results.totalUnmatchedBo,
                            totalPartnerOnly: results.totalUnmatchedPartner,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    } else {
                        // Ancien format (pour compatibilité)
                        const response: ReconciliationResponse = {
                            matches: (results.matchedRecords || []).map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                differences: []
                            })),
                            boOnly: results.unmatchedBoRecords || [],
                            partnerOnly: results.unmatchedPartnerRecords || [],
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.matchedRecords?.length || 0,
                            totalMismatches: 0,
                            totalBoOnly: results.unmatchedBoRecords?.length || 0,
                            totalPartnerOnly: results.unmatchedPartnerRecords?.length || 0,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    }
                } else {
                    observer.error(new Error('Résultats non trouvés pour le job frontend'));
                }
            } catch (error) {
                observer.error(error);
            }
        });
    }

    /**
     * Charge les données depuis les chunks sauvegardés
     */
    private loadDataFromChunks(jobId: string, dataType: 'matches' | 'bo-only' | 'partner-only'): any[] {
        const allData: any[] = [];
        let chunkIndex = 0;
        
        while (true) {
            const chunkKey = `reconciliation-${dataType}-${jobId}-${chunkIndex}`;
            const chunkData = localStorage.getItem(chunkKey);
            
            if (!chunkData) {
                break; // Plus de chunks disponibles
            }
            
            try {
                const chunk = JSON.parse(chunkData);
                allData.push(...chunk);
                chunkIndex++;
            } catch (error) {
                console.error(`❌ Erreur lors du chargement du chunk ${chunkKey}:`, error);
                break;
            }
        }
        
        console.log(`📊 ${dataType}: ${allData.length} enregistrements chargés depuis ${chunkIndex} chunks`);
        return allData;
    }

    /**
     * Annule un job de réconciliation
     */
    cancelJob(jobId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/cancel`, { jobId })
            .pipe(
                tap(() => {
                    console.log('❌ Job annulé:', jobId);
                    this.currentJobId = null;
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient la progression actuelle
     */
    getProgress(): Observable<ProgressUpdate> {
        return this.progress$;
    }

    /**
     * Met à jour la progression
     */
    private updateProgress(progress: ProgressUpdate): void {
        this.progressSubject.next(progress);
    }

    /**
     * Obtient l'ID du job actuel
     */
    getCurrentJobId(): string | null {
        return this.currentJobId;
    }

    /**
     * Vérifie si un job est en cours
     */
    isJobRunning(): boolean {
        return this.currentJobId !== null;
    }

    /**
     * Méthode de réconciliation classique (sans WebSocket)
     */
    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation classique');
        
        // Récupérer le type de réconciliation depuis le service d'état
        const reconciliationType = this.appStateService.getReconciliationType();
        request.reconciliationType = reconciliationType;
        
        console.log('🎯 Type de réconciliation utilisé:', reconciliationType);
        
        // Vérifier si les données sont trop volumineuses pour la sérialisation
        const boDataLength = request.boFileContent?.length || 0;
        const partnerDataLength = request.partnerFileContent?.length || 0;
        const totalRecords = boDataLength + partnerDataLength;
        
        // Activer automatiquement le mode optimisé pour les gros fichiers (> 50k enregistrements)
        // Cela réduira considérablement la taille de la réponse
        if (totalRecords > 50000) {
            request.lightweightResponse = true;
            console.log('⚡ Mode optimisé activé automatiquement pour réduire la taille de la réponse');
            console.log('📊 Fichier volumineux détecté:', {
                boDataLength: boDataLength,
                partnerDataLength: partnerDataLength,
                totalRecords: totalRecords
            });
        }
        
        if (boDataLength > 100000 || partnerDataLength > 100000) {
            console.log('📊 Gros fichier détecté - Utilisation du traitement par chunks backend');
            console.log('🔍 Détails de la détection:', {
                boDataLength: boDataLength,
                partnerDataLength: partnerDataLength
            });
            return this.reconcileWithBackendChunks(request);
        }
        
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: 'Démarrage de la réconciliation...',
            estimatedTimeRemaining: 30000
        });

        // Timeout de 30 minutes (1800000ms) pour les gros fichiers
        const RECONCILIATION_TIMEOUT = 1800000; // 30 minutes
        
        // Optimiser la requête pour les gros fichiers
        // Note: Accept-Encoding est géré automatiquement par le navigateur, ne pas le définir manuellement
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Indiquer que c'est une requête longue
            'X-Request-Type': 'long-running'
        });
        
        // Log de la taille des données pour diagnostic
        const requestSize = JSON.stringify(request).length;
        const requestSizeMB = (requestSize / (1024 * 1024)).toFixed(2);
        const requestStartTime = performance.now();
        
        console.log(`📊 Taille de la requête: ${requestSizeMB} MB (${requestSize} bytes)`);
        console.log(`📊 Enregistrements BO: ${request.boFileContent?.length || 0}`);
        console.log(`📊 Enregistrements Partenaire: ${request.partnerFileContent?.length || 0}`);
        console.log(`⏱️  [TIMING] Début de l'envoi de la requête...`);
        
        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request, {
            headers: headers,
            // Désactiver la compression côté client pour les requêtes POST (le serveur gère)
            // Mais activer la compression des réponses
            reportProgress: false // Désactivé pour éviter la surcharge
        }).pipe(
            timeout(RECONCILIATION_TIMEOUT),
            tap(response => {
                const requestEndTime = performance.now();
                const totalRequestTime = requestEndTime - requestStartTime;
                const totalRequestTimeSeconds = (totalRequestTime / 1000).toFixed(2);
                
                console.log('✅ Réconciliation terminée - Réponse reçue du backend');
                console.log('📊 Détails de la réponse:', {
                    matches: response.matches?.length || 0,
                    boOnly: response.boOnly?.length || 0,
                    partnerOnly: response.partnerOnly?.length || 0,
                    mismatches: response.mismatches?.length || 0,
                    totalBoRecords: response.totalBoRecords || 0,
                    totalPartnerRecords: response.totalPartnerRecords || 0,
                    executionTimeMs: response.executionTimeMs || 0
                });
                
                // Vérifier si la réponse est optimisée
                if (response.matches && response.matches.length > 0) {
                    const firstMatch = response.matches[0];
                    const isOptimized = !firstMatch.partnerData || 
                                       Object.keys(firstMatch.partnerData || {}).length <= 5;
                    if (isOptimized) {
                        console.log('⚡ Mode optimisé détecté dans la réponse - Données allégées');
                        console.log('📋 Exemple de match optimisé:', {
                            key: firstMatch.key,
                            boDataKeys: Object.keys(firstMatch.boData || {}),
                            partnerDataKeys: Object.keys(firstMatch.partnerData || {}),
                            hasDifferences: !!firstMatch.differences
                        });
                    }
                }
                
                console.log(`⏱️  [TIMING] Temps total de la requête (réseau + traitement): ${totalRequestTime.toFixed(0)} ms (${totalRequestTimeSeconds} secondes)`);
                console.log(`⏱️  [TIMING] Temps de traitement backend: ${response.executionTimeMs || 0} ms`);
                if (response.executionTimeMs) {
                    const networkTime = totalRequestTime - response.executionTimeMs;
                    console.log(`⏱️  [TIMING] Temps estimé réseau (upload + download): ${networkTime.toFixed(0)} ms`);
                }
                
                console.log('🔄 Mise à jour de la progression à 100%...');
                this.updateProgress({
                    percentage: 100,
                    processed: response.totalBoRecords + response.totalPartnerRecords,
                    total: response.totalBoRecords + response.totalPartnerRecords,
                    step: 'Terminé',
                    estimatedTimeRemaining: 0
                });
                console.log('✅ Progression mise à jour avec succès');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Réconciliation par chunks avec le backend (utilise l'endpoint classique)
     */
    private reconcileWithBackendChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation par chunks backend optimisée');
        
        return new Observable(observer => {
            // Réduire la taille des chunks pour améliorer le transfert réseau
            // Chunks plus petits = transfert plus rapide et moins de timeout
            const chunkSize = 50000; // 50k lignes par chunk (réduit de 100k pour améliorer le transfert)
            
            // Activer automatiquement le mode optimisé pour les chunks
            request.lightweightResponse = true;
            console.log('⚡ Mode optimisé activé pour les chunks - Réponse allégée');
            
            // Diviser seulement les données BO en chunks
            const boChunks = this.createChunks(request.boFileContent || [], chunkSize);
            const allPartnerData = request.partnerFileContent || [];
            
            console.log(`📊 Données divisées: ${boChunks.length} chunks BO (${chunkSize} lignes/chunk), ${allPartnerData.length} lignes Partner complètes`);
            
            // Traiter chaque chunk BO avec TOUTES les lignes Partner
            this.processOptimizedChunks(request, boChunks, allPartnerData, [], observer);
        });
    }

    /**
     * Traite les chunks BO de manière optimisée avec toutes les lignes Partner
     */
    private processOptimizedChunks(
        originalRequest: ReconciliationRequest, 
        boChunks: any[][], 
        allPartnerData: any[], 
        accumulatedResults: any[], 
        observer: any
    ): void {
        
        let currentBoIndex = 0;
        let remainingPartnerData = [...allPartnerData]; // Copie des données Partner restantes
        let allMatches: any[] = [];
        let allBoOnly: any[] = [];
        
        const processNextBoChunk = () => {
            if (currentBoIndex >= boChunks.length) {
                console.log('✅ Tous les chunks BO traités, finalisation des résultats...');
                console.log(`📊 Résumé final avant finalisation:`, {
                    totalMatches: allMatches.length,
                    totalBoOnly: allBoOnly.length,
                    totalPartnerOnly: remainingPartnerData.length,
                    chunksProcessed: currentBoIndex
                });
                this.finalizeOptimizedResults(allMatches, allBoOnly, remainingPartnerData, observer);
                return;
            }
            
            const boChunk = boChunks[currentBoIndex];
            currentBoIndex++;
            
            console.log(`🔄 Traitement chunk BO ${currentBoIndex}/${boChunks.length} avec ${remainingPartnerData.length} lignes Partner restantes`);
            
            // Mettre à jour la progression avec les informations détaillées
            this.progressSubject.next({
                percentage: Math.min(95, (currentBoIndex / boChunks.length) * 90), // 90% max pour laisser de la place à la finalisation
                processed: currentBoIndex,
                total: boChunks.length,
                step: `Traitement chunk BO ${currentBoIndex}/${boChunks.length}`,
                currentBoChunk: currentBoIndex,
                totalBoChunks: boChunks.length,
                matchesCount: allMatches.length,
                boOnlyCount: allBoOnly.length,
                partnerRemaining: remainingPartnerData.length
            });
            
            const chunkRequest: ReconciliationRequest = {
                ...originalRequest,
                boFileContent: boChunk,
                partnerFileContent: remainingPartnerData
            };
            
            // Timeout de 30 minutes pour chaque chunk (au cas où un chunk serait très volumineux)
            const RECONCILIATION_TIMEOUT = 1800000; // 30 minutes
            
            this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, chunkRequest, {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json'
                })
            }).pipe(
                timeout(RECONCILIATION_TIMEOUT)
            ).subscribe({
                next: (response: ReconciliationResponse) => {
                    try {
                        const matchesCount = response.matches?.length || 0;
                        console.log(`✅ Chunk BO ${currentBoIndex} traité: ${matchesCount} matches`);
                        console.log(`📊 Réponse reçue - Matches: ${matchesCount}, BoOnly: ${response.boOnly?.length || 0}, PartnerOnly: ${response.partnerOnly?.length || 0}`);
                        
                        // Ajouter les matches trouvés avec gestion d'erreur
                        if (response.matches && response.matches.length > 0) {
                            console.log(`📊 Ajout de ${response.matches.length} matches...`);
                            
                            // Vérifier si on est en mode optimisé (premier match pour tester)
                            const isOptimized = response.matches.length > 0 && 
                                (!response.matches[0].partnerData || 
                                 Object.keys(response.matches[0].partnerData || {}).length <= 5);
                            
                            if (isOptimized) {
                                console.log('⚡ Mode optimisé détecté - Utilisation de match.key pour les clés');
                            }
                            
                            allMatches.push(...response.matches);
                            
                            // Retirer les lignes Partner qui ont matché (optimisé)
                            // Utiliser match.key si disponible (mode optimisé), sinon extraire de partnerData
                            const matchedPartnerKeys = new Set(response.matches.map(match => {
                                // En mode optimisé, utiliser directement la clé du match
                                if (match.key) {
                                    return match.key;
                                }
                                // Sinon, extraire de partnerData (mode normal)
                                if (match.partnerData && match.partnerData[originalRequest.partnerKeyColumn]) {
                                    return match.partnerData[originalRequest.partnerKeyColumn];
                                }
                                // Fallback : essayer de trouver la clé dans les données
                                return match.partnerData?.[originalRequest.partnerKeyColumn] || 
                                       match.boData?.[originalRequest.boKeyColumn] || 
                                       '';
                            }).filter(key => key !== '' && key !== null && key !== undefined));
                            
                            const beforeCount = remainingPartnerData.length;
                            remainingPartnerData = remainingPartnerData.filter(partnerRow => {
                                const partnerKey = partnerRow[originalRequest.partnerKeyColumn];
                                return !matchedPartnerKeys.has(partnerKey);
                            });
                            
                            console.log(`📊 ${beforeCount - remainingPartnerData.length} lignes Partner retirées, ${remainingPartnerData.length} restantes`);
                            console.log(`🔑 Clés matchées extraites: ${matchedPartnerKeys.size} clés uniques`);
                        }
                        
                        // Ajouter les lignes BO sans correspondance
                        if (response.boOnly && response.boOnly.length > 0) {
                            console.log(`📊 Ajout de ${response.boOnly.length} lignes BO sans correspondance...`);
                            allBoOnly.push(...response.boOnly);
                        }
                        
                        // Vérifier la mémoire
                        console.log(`💾 État mémoire: ${allMatches.length} matches, ${allBoOnly.length} bo-only, ${remainingPartnerData.length} partner restantes`);
                        
                        // Mettre à jour la progression avec les informations détaillées
                        const progressPercentage = Math.min(95, (currentBoIndex / boChunks.length) * 90);
                        this.progressSubject.next({
                            percentage: progressPercentage,
                            processed: currentBoIndex,
                            total: boChunks.length,
                            step: `Chunk BO ${currentBoIndex}/${boChunks.length} traité`,
                            currentBoChunk: currentBoIndex,
                            totalBoChunks: boChunks.length,
                            matchesCount: allMatches.length,
                            boOnlyCount: allBoOnly.length,
                            partnerRemaining: remainingPartnerData.length
                        });
                        
                        console.log(`🔄 Passage au chunk suivant (${currentBoIndex + 1}/${boChunks.length})...`);
                        processNextBoChunk();
                    } catch (error) {
                        console.error(`❌ Erreur lors du traitement des résultats du chunk BO ${currentBoIndex}:`, error);
                        processNextBoChunk();
                    }
                },
                error: (error) => {
                    console.error(`❌ Erreur lors du traitement du chunk BO ${currentBoIndex}:`, error);
                    // Continuer avec le chunk suivant
                    processNextBoChunk();
                }
            });
        };
        
        processNextBoChunk();
    }

    /**
     * Finalise les résultats optimisés
     */
    private finalizeOptimizedResults(
        allMatches: any[], 
        allBoOnly: any[], 
        remainingPartnerData: any[], 
        observer: any
    ): void {
        try {
            console.log('📊 Finalisation des résultats optimisés:', {
                totalMatches: allMatches.length,
                totalBoOnly: allBoOnly.length,
                totalPartnerOnly: remainingPartnerData.length
            });
            
            // Créer le résultat final avec gestion d'erreur
            const finalResult: ReconciliationResponse = {
                matches: allMatches,
                boOnly: allBoOnly,
                partnerOnly: remainingPartnerData,
                mismatches: [],
                totalBoRecords: allMatches.length + allBoOnly.length,
                totalPartnerRecords: allMatches.length + remainingPartnerData.length,
                totalMatches: allMatches.length,
                totalMismatches: 0,
                totalBoOnly: allBoOnly.length,
                totalPartnerOnly: remainingPartnerData.length,
                executionTimeMs: Date.now(),
                processedRecords: allMatches.length + allBoOnly.length + remainingPartnerData.length,
                progressPercentage: 100
            };
            
            console.log('✅ Résultats optimisés finalisés:', {
                matches: finalResult.matches.length,
                boOnly: finalResult.boOnly.length,
                partnerOnly: finalResult.partnerOnly.length,
                totalBoRecords: finalResult.totalBoRecords,
                totalPartnerRecords: finalResult.totalPartnerRecords
            });
            
            observer.next(finalResult);
            observer.complete();
            
        } catch (error) {
            console.error('❌ Erreur lors de la finalisation des résultats:', error);
            observer.error(error);
        }
    }

    /**
     * Agrège les résultats de tous les chunks
     */
    private aggregateChunkResults(accumulatedResults: any[], observer: any): void {
        console.log(`📊 Agrégation de ${accumulatedResults.length} résultats de chunks`);
        
        if (accumulatedResults.length === 0) {
            console.error('❌ Aucun résultat à agréger');
            observer.error(new Error('Aucun résultat à agréger'));
            return;
        }
        
        // Agrégation complète de tous les résultats
        const aggregatedResult: ReconciliationResponse = {
            matches: [],
            boOnly: [],
            partnerOnly: [],
            mismatches: [],
            totalBoRecords: 0,
            totalPartnerRecords: 0,
            totalMatches: 0,
            totalMismatches: 0,
            totalBoOnly: 0,
            totalPartnerOnly: 0,
            executionTimeMs: 0,
            processedRecords: 0,
            progressPercentage: 100
        };
        
        // Combiner tous les résultats
        accumulatedResults.forEach((result, index) => {
            if (result && result.matches) {
                aggregatedResult.matches.push(...result.matches);
                aggregatedResult.boOnly.push(...result.boOnly);
                aggregatedResult.partnerOnly.push(...result.partnerOnly);
                aggregatedResult.mismatches.push(...result.mismatches);
                
                aggregatedResult.totalBoRecords += result.totalBoRecords || 0;
                aggregatedResult.totalPartnerRecords += result.totalPartnerRecords || 0;
                aggregatedResult.totalMatches += result.totalMatches || 0;
                aggregatedResult.totalMismatches += result.totalMismatches || 0;
                aggregatedResult.totalBoOnly += result.totalBoOnly || 0;
                aggregatedResult.totalPartnerOnly += result.totalPartnerOnly || 0;
                aggregatedResult.executionTimeMs += result.executionTimeMs || 0;
                aggregatedResult.processedRecords += result.processedRecords || 0;
                
                console.log(`📊 Chunk ${index + 1}: ${result.matches?.length || 0} matches, ${result.boOnly?.length || 0} bo-only, ${result.partnerOnly?.length || 0} partner-only`);
            }
        });
        
        console.log('✅ Résultats agrégés avec succès:', {
            totalMatches: aggregatedResult.matches.length,
            totalBoOnly: aggregatedResult.boOnly.length,
            totalPartnerOnly: aggregatedResult.partnerOnly.length,
            totalBoRecords: aggregatedResult.totalBoRecords,
            totalPartnerRecords: aggregatedResult.totalPartnerRecords
        });
        
        observer.next(aggregatedResult);
        observer.complete();
    }

    /**
     * Crée des chunks à partir d'un tableau de données
     */
    private createChunks(data: any[], chunkSize: number): any[][] {
        const chunks: any[][] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }


    /**
     * Détermine si une requête de réconciliation nécessite un traitement par chunks
     */
    private isLargeReconciliationRequest(request: ReconciliationRequest): boolean {
        // Désactiver le traitement par chunks frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        console.log('📊 Utilisation du backend pour tous les fichiers (traitement optimisé)');
        return false;
    }

    /**
     * Réconciliation par chunks pour les gros fichiers
     */
    private reconcileWithChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation par chunks');
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processReconciliationChunks(request, jobId)
                .then(() => {
                    // Récupérer les résultats
                    this.getFrontendChunkedResults(jobId).subscribe({
                        next: (response) => {
                            observer.next(response);
                            observer.complete();
                        },
                        error: (error) => {
                            observer.error(error);
                        }
                    });
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks
     */
    private async processReconciliationChunks(request: ReconciliationRequest, jobId: string): Promise<void> {
        try {
            console.log('🔄 Début du traitement par chunks');
            
            const boData = request.boFileContent || [];
            const partnerData = request.partnerFileContent || [];
            
            console.log(`📊 Données à traiter: BO=${boData.length}, Partner=${partnerData.length}`);
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                const partnerChunk = partnerData.slice(i, i + chunkSize);
                
                // Traitement du chunk
                const chunkResults = this.processReconciliationChunk(boChunk, partnerChunk, {
                    boReconciliationKey: request.boKeyColumn,
                    partnerReconciliationKey: request.partnerKeyColumn
                } as ChunkProcessingConfig);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                results.unmatchedPartnerRecords.push(...chunkResults.unmatchedPartnerRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, {
                boReconciliationKey: request.boKeyColumn,
                partnerReconciliationKey: request.partnerKeyColumn
            } as ChunkProcessingConfig);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement par chunks:', error);
            throw error;
        }
    }

    /**
     * Test de santé du service
     */
    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Analyse les clés de réconciliation
     */
    analyzeReconciliationKeys(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/analyze-keys`, formData)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Exécute la réconciliation
     */
    executeReconciliation(config: ReconciliationConfig): Observable<ReconciliationResponse> {
        return this.reconcile({
            boFileContent: [],
            partnerFileContent: [],
            boKeyColumn: config.boReconciliationKey,
            partnerKeyColumn: config.partnerReconciliationKey,
            additionalKeys: config.additionalKeys || [],
            comparisonColumns: [],
            selectedService: undefined,
            boColumnFilters: []
        });
    }

    /**
     * Annule la réconciliation
     */
    cancelReconciliation(jobId: string): Observable<any> {
        return this.cancelJob(jobId);
    }

    /**
     * Obtient la progression d'un job
     */
    getJobProgress(jobId: string): Observable<ProgressUpdate> {
        return this.getJobStatus(jobId).pipe(
            map((status: any) => ({
                percentage: status.progress?.percentage || 0,
                processed: status.progress?.processed || 0,
                total: status.progress?.total || 100,
                step: status.progress?.step || 'Traitement...',
                currentFile: status.progress?.currentFile || 0,
                totalFiles: status.progress?.totalFiles || 0,
                estimatedTimeRemaining: status.progress?.estimatedTimeRemaining || 0
            }))
        );
    }

    /**
     * Sauvegarde le résumé sélectionné
     */
    saveSelectedSummary(summary: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/save-summary`, summary)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Efface les données
     */
    clearData(): void {
        this.currentJobId = null;
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 0,
            step: '',
            currentFile: 0,
            totalFiles: 0,
            estimatedTimeRemaining: 0
        });
    }

    /**
     * Gestion des erreurs
     */
    private handleError = (error: HttpErrorResponse | any): Observable<never> => {
        console.error('❌ Erreur dans ReconciliationService:', error);
        
        let errorMessage = 'Une erreur est survenue';
        
        // Détecter les erreurs de timeout
        if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
            errorMessage = 'Le délai d\'attente a été dépassé. La réconciliation prend plus de temps que prévu. ' +
                          'Pour les très gros fichiers, veuillez patienter ou diviser les fichiers en plus petits lots.';
            console.warn('⏰ Timeout détecté lors de la réconciliation');
        } else if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status) {
            // Erreur côté serveur
            if (error.status === 504 || error.status === 408) {
                errorMessage = 'Le serveur a mis trop de temps à répondre. ' +
                              'Veuillez réessayer ou diviser les fichiers en plus petits lots.';
            } else {
                errorMessage = `Erreur ${error.status}: ${error.message || 'Erreur serveur'}`;
            }
            if (error.error && error.error.message) {
                errorMessage = error.error.message;
            }
        }
        
        // Mettre à jour la progression en cas d'erreur
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: `Erreur: ${errorMessage}`,
            estimatedTimeRemaining: 0
        });
        
        return throwError(() => new Error(errorMessage));
    };
}