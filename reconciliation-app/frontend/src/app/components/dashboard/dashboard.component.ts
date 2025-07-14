import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DashboardService, DashboardMetrics, DetailedMetrics, FilterOptions } from '../../services/dashboard.service';
import { AppStateService } from '../../services/app-state.service';
import * as XLSX from 'xlsx';
import { ChartConfiguration } from 'chart.js';
import { AgencySummaryService } from '../../services/agency-summary.service';
import { OperationService } from '../../services/operation.service';

export type DashboardMetric = 'volume' | 'transactions' | 'frais';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
    totalReconciliations: number = 0;
    totalFiles: number = 0;
    lastActivity: string = 'Chargement...';
    todayReconciliations: number = 0;
    loading: boolean = true;
    error: string | null = null;

    // Métriques détaillées
    detailedMetrics: DetailedMetrics | null = null;
    detailedLoading: boolean = false;
    detailedError: string | null = null;

    // Filtres
    selectedAgency: string = 'Tous';
    selectedService: string = 'Tous';
    selectedCountry: string = 'Tous';
    selectedTimeFilter: string = 'Tous';
    startDate: string = '';
    endDate: string = '';

    // Listes pour les filtres
    filterOptions: FilterOptions | null = null;
    showCustomDateInputs: boolean = false;

    // Graphique à barres
    barChartData: any = { labels: [], datasets: [] };
    barChartOptions: any = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: '' }
      }
    };

    selectedMetric: DashboardMetric = 'volume';
    agencySummaryData: any[] = [];
    allOperations: any[] = [];
    selectedChartType: 'bar' | 'line' = 'bar';
    lineChartData: any = { labels: [], datasets: [] };

    totalVolume: number = 0;
    totalTransactions: number = 0;
    totalClients: number = 0;

    // Ajout d'une fonction utilitaire pour filtrer par période
    private filterByPeriod<T extends { date?: string; dateOperation?: string }>(data: T[]): T[] {
      const today = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (this.selectedTimeFilter === 'Aujourd\'hui') {
        // "Aujourd'hui" doit être considéré comme j-1 (hier)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
      } else if (this.selectedTimeFilter === 'Cette semaine') {
        const day = today.getDay() || 7; // 1 (lundi) à 7 (dimanche)
        start = new Date(today);
        start.setDate(today.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (this.selectedTimeFilter === 'Ce mois') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      } else if (this.selectedTimeFilter === 'Personnalisé' && this.startDate && this.endDate) {
        start = new Date(this.startDate);
        end = new Date(this.endDate);
        end.setDate(end.getDate() + 1); // inclure la date de fin
      }

      if (!start || !end) {
        return data;
      }

      return data.filter((item: any) => {
        const dateStr = item.date || item.dateOperation;
        if (!dateStr) return false;
        const date = new Date(dateStr.split('T')[0]);
        return date >= start! && date < end!;
      });
    }

    updateBarChartData() {
      // Les données sont déjà filtrées lors du chargement
      const agencySummaryFiltered = this.agencySummaryData;
      const operationsFiltered = this.allOperations;

      if (this.selectedMetric === 'transactions') {
        // Bar chart : répartition par service
        const aggregation: { [service: string]: number } = {};
        agencySummaryFiltered.forEach((s: any) => {
          if (!aggregation[s.service]) aggregation[s.service] = 0;
          aggregation[s.service] += Number(s.recordCount) || 0;
        });
        const barLabels = Object.keys(aggregation);
        const barData = barLabels.map(service => aggregation[service]);
        this.barChartData = {
          labels: barLabels,
          datasets: [{
            data: barData,
            backgroundColor: '#1976d2',
            borderRadius: 6
          }]
        };
        this.barChartOptions.plugins.title.text = "Nombre de transactions par service (toutes agences)";

        // Line chart : évolution par date
        const dateAgg: { [date: string]: number } = {};
        agencySummaryFiltered.forEach((s: any) => {
          if (!dateAgg[s.date]) dateAgg[s.date] = 0;
          dateAgg[s.date] += Number(s.recordCount) || 0;
        });
        const lineLabels = Object.keys(dateAgg).sort();
        const lineData = lineLabels.map(date => dateAgg[date]);
        this.lineChartData = {
          labels: lineLabels,
          datasets: [{
            data: lineData,
            label: 'Transactions',
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
          }]
        };
        return;
      } else if (this.selectedMetric === 'frais') {
        // Bar chart : volume des frais par service
        const aggregation: { [service: string]: number } = {};
        operationsFiltered
          .filter((op: any) => op.typeOperation && op.typeOperation.startsWith('FRAIS') && op.service)
          .forEach((op: any) => {
            if (!aggregation[op.service]) aggregation[op.service] = 0;
            aggregation[op.service] += Number(op.montant) || 0;
          });
        const barLabels = Object.keys(aggregation);
        const barData = barLabels.map(service => aggregation[service]);
        this.barChartData = {
          labels: barLabels,
          datasets: [{
            data: barData,
            backgroundColor: '#1976d2',
            borderRadius: 6
          }]
        };
        this.barChartOptions.plugins.title.text = "Volume des frais par service (toutes agences)";

        // Line chart : évolution du volume des frais par date
        const dateAgg: { [date: string]: number } = {};
        operationsFiltered
          .filter((op: any) => op.typeOperation && op.typeOperation.startsWith('FRAIS') && op.dateOperation)
          .forEach((op: any) => {
            const date = op.dateOperation.split('T')[0];
            if (!dateAgg[date]) dateAgg[date] = 0;
            dateAgg[date] += Number(op.montant) || 0;
          });
        const lineLabels = Object.keys(dateAgg).sort();
        const lineData = lineLabels.map(date => dateAgg[date]);
        this.lineChartData = {
          labels: lineLabels,
          datasets: [{
            data: lineData,
            label: 'Volume des frais',
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
          }]
        };
        return;
      } else if (this.selectedMetric === 'volume') {
        // Bar chart : volume total par type d'opération
        if (!this.detailedMetrics?.operationStats) return;
        const stats = this.detailedMetrics.operationStats;
        // On pourrait aussi filtrer stats ici si besoin
        const barLabels = stats.map((s: any) => s.operationType);
        const barData = stats.map((s: any) => s.totalVolume);
        this.barChartData = {
          labels: barLabels,
          datasets: [{
            data: barData,
            backgroundColor: '#1976d2',
            borderRadius: 6
          }]
        };
        this.barChartOptions.plugins.title.text = "Volume total par type d'opération";

        // Line chart : évolution du volume total par date
        const dateAgg: { [date: string]: number } = {};
        if (operationsFiltered.length) {
          operationsFiltered.forEach((op: any) => {
            if (!op.dateOperation) return;
            const date = op.dateOperation.split('T')[0];
            if (!dateAgg[date]) dateAgg[date] = 0;
            dateAgg[date] += Number(op.montant) || 0;
          });
          const lineLabels = Object.keys(dateAgg).sort();
          const lineData = lineLabels.map(date => dateAgg[date]);
          this.lineChartData = {
            labels: lineLabels,
            datasets: [{
              data: lineData,
              label: 'Volume total',
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 3
            }]
          };
        }
        return;
      }
    }

    private routerSubscription: Subscription = new Subscription();
    private dataUpdateSubscription: Subscription = new Subscription();

    constructor(
        private router: Router,
        private dashboardService: DashboardService,
        private appStateService: AppStateService,
        private agencySummaryService: AgencySummaryService,
        private operationService: OperationService
    ) {}

    ngOnInit() {
        this.loadDashboardData();
        this.loadFilterOptions();
        this.loadDetailedMetrics();
        this.loadAgencySummaryData();
        this.loadAllOperations();
        
        // Écouter les changements de route pour recharger les données quand on revient sur le dashboard
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event) => {
            if (event instanceof NavigationEnd && (event.url === '/' || event.url === '/dashboard')) {
                console.log('Dashboard became active, refreshing metrics...');
                this.refreshMetrics();
            }
        });

        // Écouter les notifications de mise à jour de données
        this.dataUpdateSubscription = this.appStateService.dataUpdate$.subscribe(needsUpdate => {
            if (needsUpdate) {
                console.log('Data update notification received, refreshing dashboard...');
                this.refreshMetrics();
                // Marquer que les données ont été rafraîchies
                this.appStateService.markDataRefreshed();
            }
        });

        // Gestionnaire de clic global pour fermer les dropdowns
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }

    ngOnDestroy() {
        this.routerSubscription.unsubscribe();
        this.dataUpdateSubscription.unsubscribe();
        document.removeEventListener('click', this.handleGlobalClick.bind(this));
    }

    private handleGlobalClick(event: MouseEvent): void {
        // Fermer les dropdowns si on clique en dehors
        const target = event.target as HTMLElement;
        if (!target.closest('.custom-select-container')) {
            // Les dropdowns personnalisés n'existent plus, on peut supprimer cette logique
        }
    }

    private loadDashboardData() {
        this.loading = true;
        this.error = null;

        this.dashboardService.getDashboardMetrics().subscribe({
            next: (metrics: DashboardMetrics) => {
                this.totalReconciliations = metrics.totalReconciliations;
                this.totalFiles = metrics.totalFiles;
                this.lastActivity = metrics.lastActivity;
                this.todayReconciliations = metrics.todayReconciliations;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading dashboard data:', error);
                this.error = 'Erreur lors du chargement des données';
                this.loading = false;
            }
        });
    }

    private loadFilterOptions() {
        this.dashboardService.getFilterOptions().subscribe({
            next: (options: FilterOptions) => {
                this.filterOptions = options;
                console.log('Filter options loaded:', options);
            },
            error: (error) => {
                console.error('Error loading filter options:', error);
                // Fallback to default values
                this.filterOptions = {
                    agencies: ['Toutes les agences'],
                    services: ['Tous les services'],
                    countries: ['Tous les pays'],
                    timeFilters: ['Tous', 'Aujourd\'hui', 'Cette semaine', 'Ce mois', 'Personnalisé']
                };
            }
        });
    }

    private loadDetailedMetrics() {
        this.detailedLoading = true;
        this.detailedError = null;

        // Traiter les valeurs vides comme "Tous" (pas de filtre)
        const agencies = this.selectedAgency === 'Tous' ? undefined : [this.selectedAgency];
        const services = this.selectedService === 'Tous' ? undefined : [this.selectedService];
        const countries = this.selectedCountry === 'Tous' ? undefined : [this.selectedCountry];
        const timeFilter = this.selectedTimeFilter !== 'Tous' ? this.selectedTimeFilter : undefined;
        
        this.dashboardService.getDetailedMetrics(
            agencies,
            services,
            countries,
            timeFilter,
            this.startDate || undefined,
            this.endDate || undefined
        ).subscribe({
            next: (metrics: DetailedMetrics) => {
                this.detailedMetrics = metrics;
                this.detailedLoading = false;
                this.updateBarChartData();
                console.log('Detailed metrics loaded:', metrics);
            },
            error: (error) => {
                console.error('Error loading detailed metrics:', error);
                this.detailedError = 'Erreur lors du chargement des métriques détaillées';
                this.detailedLoading = false;
                this.detailedMetrics = null;
            }
        });
    }

    filteredAgencySummary: any[] = [];

    updateDashboardIndicators() {
      // Utiliser les données filtrées pour recalculer les indicateurs
      const agencySummaryFiltered = this.agencySummaryData.filter((s: any) =>
        (this.selectedAgency === 'Tous' || s.agency === this.selectedAgency) &&
        (this.selectedService === 'Tous' || s.service === this.selectedService) &&
        (this.selectedCountry === 'Tous' || s.pays === this.selectedCountry) &&
        (this.selectedTimeFilter === 'Tous' || (s.date && s.date.startsWith(this.selectedTimeFilter)))
      );
      this.filteredAgencySummary = agencySummaryFiltered;
      // Volume total
      this.totalVolume = agencySummaryFiltered.reduce((sum: number, s: any) => sum + (Number(s.totalVolume) || 0), 0);
      // Nombre de transactions
      this.totalTransactions = agencySummaryFiltered.reduce((sum: number, s: any) => sum + (Number(s.recordCount) || 0), 0);
      // Nombre de clients (si champ client ou unique agency/service)
      this.totalClients = new Set(agencySummaryFiltered.map((s: any) => s.agency + '|' + s.service)).size;
      // Autres indicateurs à adapter si besoin
    }

    onFilterChange() {
        this.loadAgencySummaryData();
        this.loadAllOperations();
        this.updateDashboardIndicators();
        // Recharger les métriques détaillées avec les nouveaux filtres
        this.loadDetailedMetrics();
    }

    onTimeFilterChange() {
        if (this.selectedTimeFilter === 'Personnalisé') {
            this.showCustomDateInputs = true;
        } else {
            this.showCustomDateInputs = false;
            this.startDate = '';
            this.endDate = '';
        }
        this.onFilterChange();
    }

    onAgencyChange() {
        this.onFilterChange();
    }

    onServiceChange() {
        this.onFilterChange();
    }

    onCountryChange() {
        this.onFilterChange();
    }

    getFrequencyPercentage(frequency: number): number {
        if (!this.detailedMetrics || this.detailedMetrics.frequencyStats.length === 0) {
            return 0;
        }
        
        const maxFrequency = Math.max(...this.detailedMetrics.frequencyStats.map(f => f.frequency));
        return maxFrequency > 0 ? (frequency / maxFrequency) * 100 : 0;
    }

    refreshMetrics() {
        console.log('Refreshing dashboard metrics...');
        this.loading = true;
        this.error = null;
        
        // Recharger les métriques de base
        this.loadDashboardData();
        
        // Recharger les métriques détaillées seulement si des filtres sont appliqués
        const hasFilters = (this.selectedAgency !== 'Tous' || this.selectedService !== 'Tous' || this.selectedCountry !== 'Tous' ||
                          this.selectedTimeFilter !== 'Tous' || this.startDate || this.endDate);
        
        if (hasFilters) {
            this.loadDetailedMetrics();
        }
        
        // Afficher un message de confirmation
        setTimeout(() => {
            console.log('Dashboard metrics refreshed successfully');
        }, 1000);
    }

    startNewReconciliation() {
        console.log('Navigation vers nouvelle réconciliation');
        this.router.navigate(['/upload']);
    }

    goToStats() {
        console.log('Navigation vers les statistiques');
        this.router.navigate(['/stats']);
    }

    goToResults() {
        console.log('Navigation vers les résultats');
        this.router.navigate(['/results']);
    }

    getAverageTransactionsPerPeriod(): string {
        if (!this.detailedMetrics) return '0';
        return this.detailedMetrics.averageTransactions?.toLocaleString() ?? '0';
    }

    resetFilters() {
        this.selectedAgency = 'Tous';
        this.selectedService = 'Tous';
        this.selectedCountry = 'Tous';
        this.selectedTimeFilter = 'Tous';
        this.startDate = '';
        this.endDate = '';
        this.showCustomDateInputs = false;
        this.loadDetailedMetrics();
    }

    exportDetailedMetricsExcel() {
        if (!this.detailedMetrics) return;
        const wb = XLSX.utils.book_new();

        // 1. Feuille Métriques principales avec couleurs
        const mainMetrics = [
            ['Métrique', 'Valeur'],
            ['Volume Total', this.detailedMetrics.totalVolume],
            ['Transactions', this.detailedMetrics.totalTransactions],
            ['Clients', this.detailedMetrics.totalClients],
            ['Transaction moyenne/Jour', this.getAverageTransactionsPerPeriod()],
            ['Volume Moyen/Jour', this.detailedMetrics.averageVolume],
            ['Frais moyen/Jour', this.detailedMetrics.averageFeesPerDay],
        ];
        const wsMain = XLSX.utils.aoa_to_sheet(mainMetrics);
        
        // Appliquer des styles et couleurs
        wsMain['!cols'] = [{ width: 25 }, { width: 20 }];
        
        // Style pour l'en-tête
        if (wsMain['A1']) {
            wsMain['A1'].s = {
                fill: { fgColor: { rgb: "4F81BD" } },
                font: { color: { rgb: "FFFFFF" }, bold: true },
                alignment: { horizontal: "center" }
            };
        }
        if (wsMain['B1']) {
            wsMain['B1'].s = {
                fill: { fgColor: { rgb: "4F81BD" } },
                font: { color: { rgb: "FFFFFF" }, bold: true },
                alignment: { horizontal: "center" }
            };
        }
        
        // Styles pour les métriques
        for (let i = 2; i <= mainMetrics.length; i++) {
            const cellA = wsMain[`A${i}`];
            const cellB = wsMain[`B${i}`];
            
            if (cellA) {
                cellA.s = {
                    fill: { fgColor: { rgb: "E7E6E6" } },
                    font: { bold: true },
                    alignment: { horizontal: "left" }
                };
            }
            
            if (cellB) {
                cellB.s = {
                    fill: { fgColor: { rgb: "F2F2F2" } },
                    font: { color: { rgb: "000000" } },
                    alignment: { horizontal: "right" },
                    numFmt: i === 2 || i === 5 || i === 6 ? "#,##0" : "0"
                };
            }
        }
        
        XLSX.utils.book_append_sheet(wb, wsMain, 'Métriques');

        // 2. Feuille Statistiques par type d'opération avec couleurs
        if (this.detailedMetrics.operationStats && this.detailedMetrics.operationStats.length > 0) {
            const opHeader = ['Type d\'opération', 'Transactions', 'Volume total', 'Volume moyen'];
            const opData = this.detailedMetrics.operationStats.map(stat => [
                stat.operationType,
                stat.transactionCount,
                stat.totalVolume,
                stat.averageVolume
            ]);
            const wsOp = XLSX.utils.aoa_to_sheet([opHeader, ...opData]);
            
            // Appliquer des styles
            wsOp['!cols'] = [{ width: 20 }, { width: 15 }, { width: 18 }, { width: 18 }];
            
            // Style pour l'en-tête
            for (let col = 0; col < opHeader.length; col++) {
                const cell = wsOp[XLSX.utils.encode_cell({ r: 0, c: col })];
                if (cell) {
                    cell.s = {
                        fill: { fgColor: { rgb: "70AD47" } },
                        font: { color: { rgb: "FFFFFF" }, bold: true },
                        alignment: { horizontal: "center" }
                    };
                }
            }
            
            // Styles pour les données
            for (let row = 1; row <= opData.length; row++) {
                for (let col = 0; col < opHeader.length; col++) {
                    const cell = wsOp[XLSX.utils.encode_cell({ r: row, c: col })];
                    if (cell) {
                        const isEven = row % 2 === 0;
                        cell.s = {
                            fill: { fgColor: { rgb: isEven ? "F2F2F2" : "FFFFFF" } },
                            font: { color: { rgb: "000000" } },
                            alignment: { horizontal: col === 0 ? "left" : "right" },
                            numFmt: col >= 1 ? "#,##0" : "0"
                        };
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, wsOp, 'Stats opérations');
        }

        // 3. Feuille Fréquence avec couleurs
        if (this.detailedMetrics.frequencyStats && this.detailedMetrics.frequencyStats.length > 0) {
            const freqHeader = ['Type d\'opération', 'Fréquence'];
            const freqData = this.detailedMetrics.frequencyStats.map(stat => [
                stat.operationType,
                stat.frequency
            ]);
            const wsFreq = XLSX.utils.aoa_to_sheet([freqHeader, ...freqData]);
            
            // Appliquer des styles
            wsFreq['!cols'] = [{ width: 20 }, { width: 15 }];
            
            // Style pour l'en-tête
            for (let col = 0; col < freqHeader.length; col++) {
                const cell = wsFreq[XLSX.utils.encode_cell({ r: 0, c: col })];
                if (cell) {
                    cell.s = {
                        fill: { fgColor: { rgb: "FFC000" } },
                        font: { color: { rgb: "000000" }, bold: true },
                        alignment: { horizontal: "center" }
                    };
                }
            }
            
            // Styles pour les données
            for (let row = 1; row <= freqData.length; row++) {
                for (let col = 0; col < freqHeader.length; col++) {
                    const cell = wsFreq[XLSX.utils.encode_cell({ r: row, c: col })];
                    if (cell) {
                        const isEven = row % 2 === 0;
                        cell.s = {
                            fill: { fgColor: { rgb: isEven ? "FFF2CC" : "FFFFFF" } },
                            font: { color: { rgb: "000000" } },
                            alignment: { horizontal: col === 0 ? "left" : "right" },
                            numFmt: col === 1 ? "0" : "0"
                        };
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, wsFreq, 'Fréquence');
        }

        // 4. Feuille de résumé avec filtres appliqués
        const summaryData = [
            ['Rapport des Métriques Détaillées'],
            [''],
            ['Filtres appliqués:'],
            ['Agences', this.selectedAgency],
            ['Services', this.selectedService],
            ['Pays', this.selectedCountry],
            ['Période', this.selectedTimeFilter],
            [''],
            ['Date de génération', new Date().toLocaleString('fr-FR')]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Ajuster les largeurs de colonnes selon le contenu
        const maxLabelLength = Math.max(...summaryData.map(row => row[0]?.toString().length || 0));
        const maxValueLength = Math.max(...summaryData.map(row => row[1]?.toString().length || 0));
        
        wsSummary['!cols'] = [
            { width: Math.max(maxLabelLength + 2, 15) }, // Label + marge
            { width: Math.max(maxValueLength + 2, 30) }  // Valeur + marge
        ];
        
        // Style pour le titre
        if (wsSummary['A1']) {
            wsSummary['A1'].s = {
                fill: { fgColor: { rgb: "4472C4" } },
                font: { color: { rgb: "FFFFFF" }, bold: true, size: 14 },
                alignment: { horizontal: "center", vertical: "center" }
            };
            // Fusionner les cellules pour le titre
            wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        }
        
        // Style pour "Filtres appliqués"
        if (wsSummary['A3']) {
            wsSummary['A3'].s = {
                fill: { fgColor: { rgb: "E7E6E6" } },
                font: { bold: true, size: 12 },
                alignment: { horizontal: "left", vertical: "center" }
            };
            // Fusionner les cellules pour "Filtres appliqués"
            wsSummary['!merges'] = wsSummary['!merges'] || [];
            wsSummary['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });
        }
        
        // Styles pour les filtres
        for (let i = 4; i <= 7; i++) {
            const cellA = wsSummary[`A${i}`];
            const cellB = wsSummary[`B${i}`];
            
            if (cellA) {
                cellA.s = {
                    fill: { fgColor: { rgb: "F8F9FA" } },
                    font: { bold: true },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: { 
                        right: { style: "thin", color: { rgb: "CCCCCC" } }
                    }
                };
            }
            
            if (cellB) {
                cellB.s = {
                    fill: { fgColor: { rgb: "FFFFFF" } },
                    font: { color: { rgb: "333333" } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: { 
                        left: { style: "thin", color: { rgb: "CCCCCC" } }
                    }
                };
            }
        }
        
        // Style pour la date de génération
        if (wsSummary['A9']) {
            wsSummary['A9'].s = {
                fill: { fgColor: { rgb: "E7E6E6" } },
                font: { bold: true, italic: true },
                alignment: { horizontal: "left", vertical: "center" }
            };
        }
        if (wsSummary['B9']) {
            wsSummary['B9'].s = {
                fill: { fgColor: { rgb: "F2F2F2" } },
                font: { italic: true, color: { rgb: "666666" } },
                alignment: { horizontal: "left", vertical: "center" }
            };
        }
        
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

        XLSX.writeFile(wb, 'metriques_detaillees.xlsx');
    }

    loadAgencySummaryData() {
      // Appliquer les filtres lors du chargement des données
      const agencies = this.selectedAgency === 'Tous' ? undefined : [this.selectedAgency];
      const services = this.selectedService === 'Tous' ? undefined : [this.selectedService];
      const countries = this.selectedCountry === 'Tous' ? undefined : [this.selectedCountry];
      
      this.agencySummaryService.getAllSummaries().subscribe({
        next: (data: any[]) => {
          // Filtrer les données selon les critères sélectionnés
          this.agencySummaryData = data.filter((item: any) => {
            const agencyMatch = !agencies || agencies.includes(item.agency);
            const serviceMatch = !services || services.includes(item.service);
            const countryMatch = !countries || countries.includes(item.pays);
            return agencyMatch && serviceMatch && countryMatch;
          });
          
          // Appliquer le filtre de période
          this.agencySummaryData = this.filterByPeriod(this.agencySummaryData);
          
          this.updateDashboardIndicators();
          this.updateBarChartData();
        },
        error: (err) => {
          this.agencySummaryData = [];
          this.updateDashboardIndicators();
          this.updateBarChartData();
        }
      });
    }

    loadAllOperations() {
      // Appliquer les filtres lors du chargement des données
      const agencies = this.selectedAgency === 'Tous' ? undefined : [this.selectedAgency];
      const services = this.selectedService === 'Tous' ? undefined : [this.selectedService];
      const countries = this.selectedCountry === 'Tous' ? undefined : [this.selectedCountry];
      
      this.operationService.getAllOperations().subscribe({
        next: (ops: any[]) => {
          // Filtrer les données selon les critères sélectionnés
          this.allOperations = ops.filter((item: any) => {
            const agencyMatch = !agencies || agencies.includes(item.agence);
            const serviceMatch = !services || services.includes(item.service);
            const countryMatch = !countries || countries.includes(item.pays);
            return agencyMatch && serviceMatch && countryMatch;
          });
          
          // Appliquer le filtre de période
          this.allOperations = this.filterByPeriod(this.allOperations);
          
          this.updateBarChartData();
        },
        error: (err) => {
          this.allOperations = [];
          this.updateBarChartData();
        }
      });
    }
} 