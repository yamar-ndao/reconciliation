import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColumnComparison } from '../../models/column-comparison.model';
import { AppStateService } from '../../services/app-state.service';

@Component({
    selector: 'app-column-selection',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="column-selection-container">
            <h2>📊 Sélection des colonnes</h2>
            <p class="description">Sélectionnez les colonnes clés et les colonnes à comparer</p>

            <!-- Colonnes clés -->
            <div class="section">
                <h3>🔑 Colonnes clés</h3>
                <p class="section-description">Sélectionnez les colonnes qui serviront à identifier les enregistrements correspondants</p>
                
                <div class="key-columns">
                    <div class="column-group">
                        <label>Colonne clé BO</label>
                        <select 
                            [(ngModel)]="selectedBoKeyColumn"
                            (ngModelChange)="onBoKeyColumnChange($event)">
                            <option value="">Sélectionnez une colonne</option>
                            <option *ngFor="let column of boColumns" [ngValue]="column">
                                {{column}}
                            </option>
                        </select>
                    </div>

                    <div class="column-group">
                        <label>Colonne clé Partenaire</label>
                        <select 
                            [(ngModel)]="selectedPartnerKeyColumn"
                            (ngModelChange)="onPartnerKeyColumnChange($event)">
                            <option value="">Sélectionnez une colonne</option>
                            <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                {{column}}
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Colonnes à comparer -->
            <div class="section">
                <h3>🔄 Colonnes à comparer</h3>
                <p class="section-description">Sélectionnez les colonnes que vous souhaitez comparer entre les deux fichiers</p>
                
                <div class="comparison-columns">
                    <div class="comparison-row" *ngFor="let comparison of comparisonColumns; let i = index">
                        <div class="column-group">
                            <label>Colonne BO</label>
                            <select 
                                [(ngModel)]="comparison.boColumn"
                                (ngModelChange)="onBoComparisonColumnChange($event, i)">
                                <option value="">Sélectionnez une colonne</option>
                                <option *ngFor="let column of boColumns" [ngValue]="column">
                                    {{column}}
                                </option>
                            </select>
                        </div>

                        <div class="column-group">
                            <label>Colonne Partenaire</label>
                            <select 
                                [(ngModel)]="comparison.partnerColumn"
                                (ngModelChange)="onPartnerComparisonColumnChange($event, i)">
                                <option value="">Sélectionnez une colonne</option>
                                <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                    {{column}}
                                </option>
                            </select>
                        </div>

                        <button class="remove-btn" (click)="removeComparisonColumn(i)" *ngIf="comparisonColumns.length > 1">
                            🗑️
                        </button>
                    </div>
                </div>

                <button class="add-btn" (click)="addComparisonColumn()">
                    ➕ Ajouter une colonne à comparer
                </button>
            </div>

            <!-- Bouton de validation -->
            <div class="validation-section">
                <button 
                    class="validate-btn" 
                    [disabled]="!isValid"
                    (click)="proceedWithReconciliation()">
                    🔄 Lancer la réconciliation
                </button>
            </div>
        </div>
    `,
    styles: [`
        .column-selection-container {
            padding: 20px;
        }

        h2 {
            color: #2196F3;
            margin-bottom: 10px;
        }

        .description {
            color: #666;
            margin-bottom: 30px;
        }

        .section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }

        h3 {
            color: #1976D2;
            margin-bottom: 10px;
        }

        .section-description {
            color: #666;
            margin-bottom: 20px;
            font-size: 0.9em;
        }

        .key-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .column-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        label {
            color: #333;
            font-weight: 500;
        }

        select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 1em;
        }

        .comparison-columns {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        }

        .comparison-row {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }

        .remove-btn {
            background: none;
            border: none;
            color: #dc3545;
            font-size: 1.2em;
            cursor: pointer;
            padding: 10px;
            line-height: 1;
        }

        .add-btn {
            background: #e3f2fd;
            border: 1px solid #2196F3;
            color: #2196F3;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
        }

        .add-btn:hover {
            background: #2196F3;
            color: white;
        }

        .validation-section {
            text-align: center;
            margin-top: 30px;
        }

        .validate-btn {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .validate-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .validate-btn:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }
    `]
})
export class ColumnSelectionComponent implements OnDestroy, OnChanges {
    @Input() boData: Record<string, string>[] = [];
    @Input() partnerData: Record<string, string>[] = [];
    @Output() selectionComplete = new EventEmitter<{
        boKeyColumn: string,
        partnerKeyColumn: string,
        comparisonColumns: { boColumn: string, partnerColumn: string }[]
    }>();

    boColumns: string[] = [];
    partnerColumns: string[] = [];
    selectedBoKeyColumn: string = '';
    selectedPartnerKeyColumn: string = '';
    comparisonColumns: { boColumn: string, partnerColumn: string }[] = [{ boColumn: '', partnerColumn: '' }];
    isValid: boolean = false;

    constructor(private appStateService: AppStateService) {}

    ngOnChanges(changes: SimpleChanges) {
        console.log('Input data changed:', changes);
        if (changes['boData'] || changes['partnerData']) {
            this.initializeColumns();
        }
    }

    ngOnDestroy() {
        console.log('ColumnSelectionComponent destroyed');
    }

    private initializeColumns() {
        console.log('Initializing columns with data:', {
            boData: this.boData,
            partnerData: this.partnerData
        });

        if (this.boData.length > 0) {
            this.boColumns = Object.keys(this.boData[0]);
            console.log('BO columns initialized:', this.boColumns);
        }
        if (this.partnerData.length > 0) {
            this.partnerColumns = Object.keys(this.partnerData[0]);
            console.log('Partner columns initialized:', this.partnerColumns);
        }
    }

    onBoKeyColumnChange(value: string) {
        console.log('BO key column changed:', value);
        this.selectedBoKeyColumn = value;
        this.isValid = this.validateSelection();
    }

    onPartnerKeyColumnChange(value: string) {
        console.log('Partner key column changed:', value);
        this.selectedPartnerKeyColumn = value;
        this.isValid = this.validateSelection();
    }

    onBoComparisonColumnChange(value: string, index: number) {
        console.log('BO comparison column changed:', value, 'at index:', index);
        this.comparisonColumns[index].boColumn = value;
        this.isValid = this.validateSelection();
    }

    onPartnerComparisonColumnChange(value: string, index: number) {
        console.log('Partner comparison column changed:', value, 'at index:', index);
        this.comparisonColumns[index].partnerColumn = value;
        this.isValid = this.validateSelection();
    }

    addComparisonColumn() {
        console.log('Adding new comparison column');
        this.comparisonColumns.push({ boColumn: '', partnerColumn: '' });
        this.isValid = this.validateSelection();
    }

    removeComparisonColumn(index: number) {
        console.log('Removing comparison column at index:', index);
        this.comparisonColumns.splice(index, 1);
        this.isValid = this.validateSelection();
    }

    validateSelection(): boolean {
        // Les colonnes clé sont obligatoires, les colonnes à comparer sont optionnelles
        const hasKeyColumns = Boolean(this.selectedBoKeyColumn && this.selectedPartnerKeyColumn);
        return hasKeyColumns;
    }

    proceedWithReconciliation() {
        if (this.isValid) {
            console.log('Proceeding with reconciliation:', {
                boKeyColumn: this.selectedBoKeyColumn,
                partnerKeyColumn: this.selectedPartnerKeyColumn,
                comparisonColumns: this.comparisonColumns
            });

            this.selectionComplete.emit({
                boKeyColumn: this.selectedBoKeyColumn,
                partnerKeyColumn: this.selectedPartnerKeyColumn,
                comparisonColumns: this.comparisonColumns
            });
        }
    }
} 