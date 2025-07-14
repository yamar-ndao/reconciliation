import { Component, EventEmitter, Output } from '@angular/core';
import { ReconciliationService } from '../../services/reconciliation.service';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
    selector: 'app-file-upload',
    template: `
        <div class="file-upload-container">
            <div class="file-upload-area">
                <div class="file-input-container" (click)="boFileInput.click()" [class.has-file]="boFile">
                    <div class="file-icon">🏢</div>
                    <h4>BO (Back Office)</h4>
                    <p>Cliquez pour sélectionner le fichier CSV du BO</p>
                    <input #boFileInput type="file" (change)="onBoFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                    <div class="file-info" [class.loaded]="boFile">
                        {{ boFile ? boFile.name : 'Aucun fichier sélectionné' }}
                    </div>
                </div>

                <div class="file-input-container" (click)="partnerFileInput.click()" [class.has-file]="partnerFile">
                    <div class="file-icon">🤝</div>
                    <h4>Partenaire</h4>
                    <p>Cliquez pour sélectionner le fichier CSV du partenaire</p>
                    <input #partnerFileInput type="file" (change)="onPartnerFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                    <div class="file-info" [class.loaded]="partnerFile">
                        {{ partnerFile ? partnerFile.name : 'Aucun fichier sélectionné' }}
                    </div>
                </div>
            </div>

            <div class="status-panel">
                <div class="status-item">
                    <span class="status-label">BO chargé:</span>
                    <span class="status-value">{{ boFile ? 'Oui' : 'Non' }}</span>
                </div>
                <div class="status-item" *ngIf="boFile">
                    <span class="status-label">Nombre de lignes BO:</span>
                    <span class="status-value">{{ boData.length }} lignes</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Partenaire chargé:</span>
                    <span class="status-value">{{ partnerFile ? 'Oui' : 'Non' }}</span>
                </div>
                <div class="status-item" *ngIf="partnerFile">
                    <span class="status-label">Nombre de lignes Partenaire:</span>
                    <span class="status-value">{{ partnerData.length }} lignes</span>
                </div>
                <div class="status-item" *ngIf="estimatedTime">
                    <span class="status-label">Temps estimé:</span>
                    <span class="status-value">{{ estimatedTime }}</span>
                </div>
            </div>

            <div class="button-container">
                <button class="btn proceed-btn" [disabled]="!canProceed()" (click)="onProceed()">
                Continuer
                </button>
                <div class="action-buttons">
                    <button class="btn dashboard-btn" (click)="goToDashboard()">
                        📈 Dashboard
            </button>
            <button class="btn stats-btn" (click)="goToStats()">
                        📊 Statistiques
            </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .file-upload-container {
            padding: 20px;
        }

        .file-upload-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 20px;
        }

        .file-input-container {
            border: 3px dashed #ddd;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .file-input-container:hover {
            border-color: #4CAF50;
            background: #f9fff9;
        }

        .file-input-container.has-file {
            border-color: #4CAF50;
            background: #f0f8f0;
        }

        .file-icon {
            font-size: 3em;
            color: #4CAF50;
            margin-bottom: 10px;
        }

        .file-info {
            margin-top: 15px;
            font-size: 0.9em;
            color: #666;
        }

        .file-info.loaded {
            color: #4CAF50;
            font-weight: bold;
        }

        .status-panel {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 4px;
            background: white;
        }

        .status-label {
            font-weight: 500;
            color: #333;
        }

        .status-value {
            color: #4CAF50;
            font-weight: 600;
        }

        .button-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            margin-top: 20px;
        }

        .action-buttons {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .proceed-btn {
            background-color: #4CAF50;
            color: white;
            width: 200px;
        }

        .proceed-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        .dashboard-btn {
            background-color: #2196F3;
            color: white;
            min-width: 150px;
        }

        .stats-btn {
            background-color: #FF9800;
            color: white;
            min-width: 150px;
        }

        .btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
    `]
})
export class FileUploadComponent {
    @Output() filesLoaded = new EventEmitter<{
        boData: Record<string, string>[],
        partnerData: Record<string, string>[]
    }>();

    boFile: File | null = null;
    partnerFile: File | null = null;
    boData: Record<string, string>[] = [];
    partnerData: Record<string, string>[] = [];
    estimatedTime: string = '';

    constructor(private reconciliationService: ReconciliationService, private router: Router, private appStateService: AppStateService) {}

    private updateEstimatedTime(): void {
        // Ne calculer l'estimation que si les deux fichiers sont chargés
        if (!this.boFile || !this.partnerFile) {
            this.estimatedTime = '';
            return;
        }

        const totalRows = this.boData.length + this.partnerData.length;
        if (totalRows === 0) {
            this.estimatedTime = '';
            return;
        }

        // Estimation basée sur le nombre total de lignes
        // On suppose une moyenne de 5000 lignes par seconde
        const estimatedSeconds = Math.ceil(totalRows / 5000);
        
        if (estimatedSeconds < 60) {
            this.estimatedTime = `${estimatedSeconds} seconde${estimatedSeconds > 1 ? 's' : ''}`;
        } else {
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = estimatedSeconds % 60;
            this.estimatedTime = `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds > 0 ? `et ${seconds} seconde${seconds > 1 ? 's' : ''}` : ''}`;
        }
    }

    onBoFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.boFile = input.files[0];
            this.parseFile(this.boFile, true);
        }
    }

    onPartnerFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.partnerFile = input.files[0];
            this.parseFile(this.partnerFile, false);
        }
    }

    private convertDebitCreditToNumber(records: Record<string, any>[]): Record<string, any>[] {
        return records.map(record => {
            const newRecord = { ...record };
            if (newRecord['debit']) newRecord['debit'] = parseFloat(newRecord['debit'].toString().replace(',', '.'));
            if (newRecord['credit']) newRecord['credit'] = parseFloat(newRecord['credit'].toString().replace(',', '.'));
            return newRecord;
        });
    }

    private parseFile(file: File, isBo: boolean): void {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            this.parseCSV(file, isBo);
        } else if (fileName.endsWith('.xlsx')) {
            this.parseXLSX(file, isBo);
        } else {
            alert('Format de fichier non supporté. Veuillez choisir un fichier .csv ou .xlsx');
        }
    }

    private parseCSV(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            let text = e.target?.result as string;
            // Nettoyer le BOM éventuel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            Papa.parse(text, {
                header: true,
                delimiter: ';',
                skipEmptyLines: true,
                complete: (results) => {
                    console.log('Première ligne lue:', results.data[0]);
                    if (isBo) {
                        this.boData = results.data as Record<string, string>[];
                    } else {
                        this.partnerData = this.convertDebitCreditToNumber(results.data as Record<string, string>[]);
                    }
                    // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
                    if (this.boFile && this.partnerFile) {
                        this.updateEstimatedTime();
                    }
                },
                error: (error: any) => {
                    console.error('Erreur lors de la lecture du fichier CSV:', error);
                }
            });
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsText(file, 'utf-8');
    }

    private parseXLSX(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            if (isBo) {
                this.boData = jsonData;
            } else {
                this.partnerData = this.convertDebitCreditToNumber(jsonData);
            }
            // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
            if (this.boFile && this.partnerFile) {
                this.updateEstimatedTime();
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsArrayBuffer(file);
    }

    canProceed(): boolean {
        return this.boData.length > 0 && this.partnerData.length > 0;
    }

    onProceed(): void {
        if (this.canProceed()) {
            console.log('Navigation vers la sélection des colonnes...');
            console.log('Données BO:', this.boData.length, 'lignes');
            console.log('Données Partenaire:', this.partnerData.length, 'lignes');
            
            // Sauvegarder les données dans le service d'état
            this.appStateService.setReconciliationData(this.boData, this.partnerData);
            this.appStateService.setCurrentStep(2);
            
            // Naviguer vers la page de sélection des colonnes
            this.router.navigate(['/column-selection']);
        }
    }

    goToStats() {
        this.appStateService.setCurrentStep(4);
        this.router.navigate(['/stats']);
    }

    goToDashboard() {
        this.router.navigate(['/dashboard']);
    }
} 