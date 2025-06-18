import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ReconciliationService } from './services/reconciliation.service';
import { AppStateService } from './services/app-state.service';
import { ReconciliationRequest } from './models/reconciliation-request.model';
import { ReconciliationResponse } from './models/reconciliation-response.model';

@Component({
    selector: 'app-root',
    template: `
        <div class="app-container">
            <header class="app-header">
                <h1>🔄 Outil de Réconciliation CSV</h1>
                <p class="subtitle">Comparez et analysez vos fichiers CSV en toute simplicité</p>
            </header>

            <main class="app-content">
                <div class="step-indicator">
                    <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
                        <div class="step-number">1</div>
                        <div class="step-label">Upload des fichiers</div>
                    </div>
                    <div class="step-line" [class.completed]="currentStep > 1"></div>
                    <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
                        <div class="step-number">2</div>
                        <div class="step-label">Sélection des colonnes</div>
                    </div>
                    <div class="step-line" [class.completed]="currentStep > 2"></div>
                    <div class="step" [class.active]="currentStep === 3">
                        <div class="step-number">3</div>
                        <div class="step-label">Résultats</div>
                    </div>
                    <div class="step-line" [class.completed]="currentStep > 3"></div>
                    <div class="step" [class.active]="currentStep === 4">
                        <div class="step-number">4</div>
                        <div class="step-label">Statistiques</div>
                    </div>
                </div>

                <div class="step-content">
                    <!-- Message d'erreur -->
                    <div *ngIf="errorMessage" class="error-message">
                        <div class="error-content">
                            <span class="error-icon">⚠️</span>
                            <span class="error-text">{{errorMessage}}</span>
                            <button class="error-close" (click)="clearError()">×</button>
                        </div>
                    </div>

                    <!-- Barre de progression -->
                    <div class="progress-bar" *ngIf="progress > 0 && progress < 100">
                        <div class="progress-bar-fill" [style.width.%]="progress"></div>
                        <div class="progress-text">{{progress}}%</div>
                    </div>

                    <!-- Contenu dynamique -->
                    <ng-container [ngSwitch]="currentStep">
                        <!-- Étape 1: Upload des fichiers -->
                        <app-file-upload
                            *ngSwitchCase="1"
                            (filesLoaded)="onFilesLoaded($event)">
                        </app-file-upload>

                        <!-- Étape 2: Sélection des colonnes -->
                        <app-column-selection
                            *ngSwitchCase="2"
                            [boData]="boData"
                            [partnerData]="partnerData"
                            (selectionComplete)="onColumnSelectionComplete($event)">
                        </app-column-selection>

                        <!-- Étape 3: Résultats -->
                        <app-reconciliation-results
                            *ngSwitchCase="3"
                            [response]="reconciliationResponse">
                        </app-reconciliation-results>

                        <!-- Étape 4: Statistiques -->
                        <app-stats
                            *ngSwitchCase="4">
                        </app-stats>
                    </ng-container>
                </div>
            </main>

            <footer class="app-footer">
                <p>© 2024 Outil de Réconciliation CSV - Tous droits réservés</p>
            </footer>
        </div>
    `,
    styles: [`
        .app-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: #f5f5f5;
        }

        .app-header {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .app-header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }

        .subtitle {
            margin: 1rem 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }

        .app-content {
            flex: 1;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        .step-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 3rem;
        }

        .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        }

        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e0e0e0;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 0.5rem;
            transition: all 0.3s ease;
        }

        .step.active .step-number {
            background: #2196F3;
            color: white;
        }

        .step.completed .step-number {
            background: #4CAF50;
            color: white;
        }

        .step-label {
            color: #666;
            font-size: 0.9em;
            transition: all 0.3s ease;
        }

        .step.active .step-label {
            color: #2196F3;
            font-weight: bold;
        }

        .step.completed .step-label {
            color: #4CAF50;
        }

        .step-line {
            width: 100px;
            height: 2px;
            background: #e0e0e0;
            margin: 0 1rem;
            transition: all 0.3s ease;
        }

        .step-line.completed {
            background: #4CAF50;
        }

        .step-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 2rem;
        }

        .error-message {
            background: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 4px;
            padding: 1rem;
            margin-bottom: 1rem;
        }

        .error-content {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .error-icon {
            font-size: 1.5em;
        }

        .error-text {
            flex: 1;
            color: #c62828;
        }

        .error-close {
            background: none;
            border: none;
            color: #c62828;
            font-size: 1.5em;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .app-footer {
            background: #f8f9fa;
            padding: 1rem;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            margin: 10px 0;
            position: relative;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease-in-out;
        }

        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000;
            font-weight: bold;
        }
    `]
})
export class AppComponent implements OnInit {
    currentStep = 1;
    boData: Record<string, string>[] = [];
    partnerData: Record<string, string>[] = [];
    reconciliationResponse!: ReconciliationResponse;
    errorMessage: string = '';
    progress: number = 0;

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.appStateService.currentStep$.subscribe(step => {
            console.log('Step changed to:', step);
            this.currentStep = step;
            this.cdr.detectChanges();
        });

        this.reconciliationService.progress$.subscribe(progress => {
            this.progress = progress;
            this.cdr.detectChanges();
        });
    }

    onFilesLoaded(data: { boData: Record<string, string>[], partnerData: Record<string, string>[] }) {
        this.boData = data.boData;
        this.partnerData = data.partnerData;
        this.appStateService.setCurrentStep(2);
    }

    onColumnSelectionComplete(selection: {
        boKeyColumn: string,
        partnerKeyColumn: string,
        comparisonColumns: { boColumn: string, partnerColumn: string }[]
    }) {
        console.log('Column selection complete:', selection);

        const request: ReconciliationRequest = {
            boFileContent: this.boData,
            partnerFileContent: this.partnerData,
            boKeyColumn: selection.boKeyColumn,
            partnerKeyColumn: selection.partnerKeyColumn,
            comparisonColumns: selection.comparisonColumns
        };

        console.log('Sending reconciliation request...');
        this.reconciliationService.reconcile(request).subscribe({
            next: (response) => {
                console.log('Reconciliation response received:', response);
                this.reconciliationResponse = response;
                console.log('Setting currentStep to 3...');
                this.appStateService.setCurrentStep(3);
                this.cdr.detectChanges();
                this.errorMessage = '';
            },
            error: (error) => {
                console.error('Erreur lors de la réconciliation:', error);
                this.errorMessage = error.message || 'Une erreur est survenue lors de la réconciliation';
            }
        });
    }

    clearError() {
        this.errorMessage = '';
    }
} 