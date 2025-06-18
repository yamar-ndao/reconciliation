import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DataNormalizationService } from './data-normalization.service';

@Injectable({
    providedIn: 'root'
})
export class AppStateService {
    private currentStepSubject = new BehaviorSubject<number>(1);
    currentStep$ = this.currentStepSubject.asObservable();

    private statsDataSubject = new BehaviorSubject<any[]>([]);
    statsData$ = this.statsDataSubject.asObservable();

    private selectedServiceSubject = new BehaviorSubject<string>('');
    selectedService$ = this.selectedServiceSubject.asObservable();

    constructor(
        private http: HttpClient,
        private dataNormalizationService: DataNormalizationService
    ) {
        console.log('AppStateService initialized');
    }

    setCurrentStep(step: number) {
        console.log('Setting current step to:', step);
        this.currentStepSubject.next(step);
    }

    getCurrentStep(): number {
        return this.currentStepSubject.value;
    }

    async setStatsData(data: any) {
        console.log('Setting stats data:', JSON.stringify(data, null, 2));
        if (!data) {
            console.warn('Attempting to set null stats data');
            return;
        }
        try {
            // Normaliser les données
            const normalizedData = this.dataNormalizationService.normalizeData(data);

            // Formatage des données pour le backend
            const formattedData = normalizedData.map((item: any) => {
                // Conversion des valeurs numériques
                const totalVolume = typeof item.totalVolume === 'string' 
                    ? parseFloat(item.totalVolume.replace(/,/g, '')) 
                    : Number(item.totalVolume);
                
                const recordCount = typeof item.recordCount === 'string'
                    ? parseInt(item.recordCount.replace(/,/g, ''))
                    : Number(item.recordCount);

                // Formatage de la date
                const date = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                const formatted = {
                    agency: item.agency || '',
                    service: item.service || '',
                    date: date,
                    totalVolume: totalVolume || 0,
                    recordCount: recordCount || 0
                };
                console.log('Formatted item for backend:', JSON.stringify(formatted, null, 2));
                return formatted;
            });

            console.log('Sending formatted data to backend:', JSON.stringify(formattedData, null, 2));
            const response = await this.http.post(`${environment.apiUrl}/api/statistics/save`, formattedData).toPromise();
            console.log('Backend response:', response);
            this.statsDataSubject.next(normalizedData);
        } catch (error) {
            console.error('Error setting stats data:', error);
            throw error;
        }
    }

    getStatsData(): Observable<any[]> {
        return this.statsData$;
    }

    clearStatsData() {
        console.log('Clearing stats data');
        this.statsDataSubject.next([]);
    }

    startReconciliation(service: string) {
        console.log('Starting reconciliation for service:', service);
        this.selectedServiceSubject.next(service);
        this.setCurrentStep(2);
    }

    getSelectedService(): string {
        return this.selectedServiceSubject.value;
    }
} 