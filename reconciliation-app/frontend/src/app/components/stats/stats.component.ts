import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { DataNormalizationService } from '../../services/data-normalization.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AgencySummaryService } from '../../services/agency-summary.service';
import * as ExcelJS from 'exceljs';
// @ts-ignore
import * as FileSaver from 'file-saver';

@Component({
    selector: 'app-stats',
    template: `
        <div class="stats-container">
            <h2>📊 Statistiques détaillées</h2>

            <div *ngIf="isLoading" class="loading-message">
                Chargement des données...
            </div>

            <div *ngIf="!isLoading && agencySummaries.length > 0">
                <!-- Filtres -->
                <div class="filters-section">
                    <form [formGroup]="filterForm" class="filter-form">
                        <div class="filter-group">
                            <label>Agence</label>
                            <select formControlName="agency">
                                <option value="">Toutes les agences</option>
                                <option *ngFor="let agency of getFilteredAgencies()" [value]="agency">{{agency}}</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Service</label>
                            <select formControlName="service">
                                <option value="">Tous les services</option>
                                <option *ngFor="let service of getFilteredServices()" [value]="service">{{service}}</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Pays</label>
                            <select formControlName="country">
                                <option value="">Tous les pays</option>
                                <option *ngFor="let country of getFilteredCountries()" [value]="country">{{country}}</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Date de début</label>
                            <input type="date" formControlName="startDate">
                        </div>

                        <div class="filter-group">
                            <label>Date de fin</label>
                            <input type="date" formControlName="endDate">
                        </div>

                        <button type="button" (click)="applyFilters()" class="apply-btn" [disabled]="isLoading">
                            {{isLoading ? 'Traitement en cours...' : 'Appliquer les filtres'}}
                        </button>
                    </form>
                </div>

                <!-- Résultats -->
                <div class="results-section">
                    <div class="stats-cards">
                        <div class="stat-card">
                            <div class="stat-title">Nombre total de transactions</div>
                            <div class="stat-value">{{getTotalRecords()}}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Volume total</div>
                            <div class="stat-value">{{getTotalVolume() | number:'1.0-0'}}</div>
                        </div>
                    </div>

                    <div class="details-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Agence</th>
                                    <th>Service</th>
                                    <th>Pays</th>
                                    <th>Date</th>
                                    <th>Volume Total</th>
                                    <th>Nombre de transactions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let summary of pagedStats">
                                    <td>{{summary.agency}}</td>
                                    <td>{{summary.service}}</td>
                                    <td>{{summary.country}}</td>
                                    <td>{{summary.date}}</td>
                                    <td>{{summary.totalVolume | number:'1.0-0'}}</td>
                                    <td>{{summary.recordCount}}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="pagination-controls">
                            <button (click)="prevStatsPage()" [disabled]="statsPage === 1 || isLoading">Précédent</button>
                            <span>Page {{statsPage}} / {{totalPages}}</span>
                            <button (click)="nextStatsPage()" [disabled]="statsPage === totalPages || isLoading">Suivant</button>
                        </div>
                    </div>
                </div>
            </div>

            <div *ngIf="!isLoading && agencySummaries.length === 0" class="no-data-message">
                Aucune donnée disponible
            </div>

            <div class="action-buttons">
                <button class="back-btn" (click)="goBack()" [disabled]="isLoading">
                    ← Retour aux résultats
                </button>
                <button class="export-btn" (click)="exportStats()" [disabled]="!agencySummaries.length || isLoading">
                    📥 Exporter les statistiques
                </button>
            </div>
        </div>
    `,
    styles: [`
        .stats-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .loading-message, .no-data-message {
            text-align: center;
            padding: 40px;
            font-size: 1.2em;
            color: #666;
        }

        h2 {
            color: #1976D2;
            margin-bottom: 30px;
            text-align: center;
        }

        .filters-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .filter-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            align-items: end;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .filter-group label {
            font-weight: 500;
            color: #666;
        }

        .filter-group select,
        .filter-group input {
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-size: 1em;
        }

        .apply-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .apply-btn:hover {
            background: #1976D2;
        }

        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-title {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #1976D2;
        }

        .details-table {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .details-table table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .details-table th, .details-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            text-align: left;
        }

        .details-table th {
            background: #f7f9fa;
            color: #1976D2;
            font-weight: 600;
        }

        .details-table tr:nth-child(even) {
            background: #f9fbfc;
        }

        .details-table tr:hover {
            background: #e3f2fd;
        }

        .pagination-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            padding: 20px;
            background: white;
            border-top: 1px solid #dee2e6;
        }

        .pagination-controls button {
            padding: 8px 16px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .pagination-controls button:hover:not(:disabled) {
            background: #f8f9fa;
        }

        .pagination-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        .back-btn, .export-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
        }

        .back-btn {
            background: #f5f5f5;
            color: #666;
        }

        .back-btn:hover {
            background: #e0e0e0;
        }

        .export-btn {
            background: #2196F3;
            color: white;
        }

        .export-btn:hover {
            background: #1976D2;
        }

        .back-btn:disabled, .export-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    `]
})
export class StatsComponent implements OnInit, OnDestroy {
    private readonly BATCH_SIZE = 1000;
    private readonly BATCH_DELAY = 20;
    private readonly CACHE_EXPIRY = 5 * 60 * 1000;

    filterForm: FormGroup;
    agencySummaries: any[] = [];
    filteredData: any[] = [];
    statsPage: number = 1;
    statsPageSize: number = 10;
    isLoading: boolean = false;
    pagedStats: any[] = [];
    totalPages: number = 1;
    errorMessage: string | null = null;

    private cache: {
        [key: string]: {
            data: any[];
            timestamp: number;
        }
    } = {};

    private subscription: Subscription = new Subscription();

    constructor(
        private appStateService: AppStateService,
        private dataNormalizationService: DataNormalizationService,
        private fb: FormBuilder,
        private router: Router,
        private agencySummaryService: AgencySummaryService
    ) {
        this.filterForm = this.fb.group({
            agency: [''],
            service: [''],
            country: [''],
            startDate: [''],
            endDate: ['']
        });
    }

    async ngOnInit() {
        this.loadData();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private loadData() {
        this.isLoading = true;
        this.agencySummaryService.getAllSummaries().subscribe({
            next: (data) => {
                console.log('Données reçues de l\'API agency-summary:', data);
                this.agencySummaries = data;
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Erreur lors du chargement des données:', error);
                this.errorMessage = 'Erreur lors du chargement des données';
                this.isLoading = false;
            }
        });
    }

    getFilteredAgencies(): string[] {
        let data = this.agencySummaries;
        if (this.filterForm.value.service) {
            data = data.filter(s => s.service === this.filterForm.value.service);
        }
        if (this.filterForm.value.country) {
            data = data.filter(s => s.country === this.filterForm.value.country);
        }
        return [...new Set(data.map(s => s.agency))];
    }

    getFilteredServices(): string[] {
        let data = this.agencySummaries;
        if (this.filterForm.value.agency) {
            data = data.filter(s => s.agency === this.filterForm.value.agency);
        }
        if (this.filterForm.value.country) {
            data = data.filter(s => s.country === this.filterForm.value.country);
        }
        return [...new Set(data.map(s => s.service))];
    }

    getFilteredCountries(): string[] {
        let data = this.agencySummaries;
        if (this.filterForm.value.agency) {
            data = data.filter(s => s.agency === this.filterForm.value.agency);
        }
        if (this.filterForm.value.service) {
            data = data.filter(s => s.service === this.filterForm.value.service);
        }
        return [...new Set(data.map(s => s.country))];
    }

    applyFilters() {
        const filters = this.filterForm.value;
        this.filteredData = this.agencySummaries.filter(summary => {
            const summaryDate = new Date(summary.date);
            const afterStart = !filters.startDate || summaryDate >= new Date(filters.startDate);
            const beforeEnd = !filters.endDate || summaryDate <= new Date(filters.endDate);
            return (!filters.agency || summary.agency === filters.agency) &&
                   (!filters.service || summary.service === filters.service) &&
                   (!filters.country || summary.country === filters.country) &&
                   afterStart && beforeEnd;
        });
        console.log('Données après filtrage:', this.filteredData);
        this.updatePagedStats();
    }

    getTotalRecords(): number {
        return this.filteredData.reduce((total, summary) => total + summary.recordCount, 0);
    }

    getTotalVolume(): number {
        return this.filteredData.reduce((total, summary) => total + summary.totalVolume, 0);
    }

    private updatePagedStats() {
        // Trie les données filtrées par date décroissante
        const sorted = [...this.filteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const start = (this.statsPage - 1) * this.statsPageSize;
        const end = start + this.statsPageSize;
        this.pagedStats = sorted.slice(start, end);
        this.totalPages = Math.ceil(this.filteredData.length / this.statsPageSize);
    }

    nextStatsPage() {
        if (this.statsPage < this.totalPages) {
            this.statsPage++;
            this.updatePagedStats();
        }
    }

    prevStatsPage() {
        if (this.statsPage > 1) {
            this.statsPage--;
            this.updatePagedStats();
        }
    }

    goBack() {
        this.appStateService.setCurrentStep(3);
        this.router.navigate(['/results']);
    }

    async exportStats() {
        this.isLoading = true;
        try {
            const data = this.filteredData.map(item => ({
                Client: item.agency,
                Service: item.service,
                Pays: item.country,
                Date: item.date,
                Volume: Number(item.totalVolume),
                Transactions: Number(item.recordCount)
            }));

            if (data.length === 0) {
                this.errorMessage = 'Aucune donnée à exporter';
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Statistiques');

            worksheet.columns = [
                { header: 'Client', key: 'Client', width: 20 },
                { header: 'Service', key: 'Service', width: 20 },
                { header: 'Pays', key: 'Pays', width: 20 },
                { header: 'Date', key: 'Date', width: 15 },
                { header: 'Volume', key: 'Volume', width: 15, style: { numFmt: '#,##0' } },
                { header: 'Transactions', key: 'Transactions', width: 18, style: { numFmt: '#,##0' } }
            ];

            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1976D2' }
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });

            data.forEach((row, idx) => {
                const excelRow = worksheet.addRow(row);
                if (idx % 2 === 1) {
                    excelRow.eachCell(cell => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE3F2FD' }
                        };
                    });
                }
            });

            // Calcul des totaux
            const totalVolume = data.reduce((sum, row) => sum + Number(row.Volume), 0);
            const totalTransactions = data.reduce((sum, row) => sum + Number(row.Transactions), 0);

            // Ajoute la ligne de totaux
            const totalRow = worksheet.addRow({
                Client: 'TOTAL',
                Service: '',
                Pays: '',
                Date: '',
                Volume: totalVolume,
                Transactions: totalTransactions
            });
            totalRow.eachCell((cell, colNumber) => {
                cell.font = { bold: true };
                if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFB3E5FC' }
                    };
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const agencyCode = this.filterForm.value.agency ? `_${this.filterForm.value.agency.toUpperCase().replace(/\s+/g, '')}` : '';
            const countryCode = this.filterForm.value.country ? `_${this.filterForm.value.country.toUpperCase().replace(/\s+/g, '')}` : '';
            const serviceCode = this.filterForm.value.service ? `_${this.filterForm.value.service.toUpperCase().replace(/\s+/g, '')}` : '';
            FileSaver.saveAs(
                new Blob([buffer], { type: 'application/octet-stream' }),
                `VOLUME${agencyCode}${countryCode}${serviceCode}_${new Date().toISOString().split('T')[0].toUpperCase()}.XLSX`
            );
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.errorMessage = 'Erreur lors de l\'export des données';
        } finally {
            this.isLoading = false;
        }
    }
} 