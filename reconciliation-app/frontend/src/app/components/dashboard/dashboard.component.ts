import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DashboardService, DashboardMetrics, DetailedMetrics } from '../../services/dashboard.service';
import { AppStateService } from '../../services/app-state.service';
import * as XLSX from 'xlsx';
import { ChartConfiguration } from 'chart.js';
import { AgencySummaryService } from '../../services/agency-summary.service';
import { OperationService } from '../../services/operation.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

export type DashboardMetric = 'volume' | 'transactions' | 'revenu';

// Correction du type FilterOptions pour rendre 'banques' optionnel
interface FilterOptions {
  agencies: string[];
  services: string[];
  countries: string[];
  banques?: string[];
  timeFilters: string[];
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
    public ChartDataLabels = ChartDataLabels;
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
    selectedAgency: string[] = [];
    selectedService: string[] = [];
    selectedCountry: string[] = [];
    selectedTimeFilter: string = 'Tous';
    startDate: string = '';
    endDate: string = '';
    // selectedBanque: string = 'Tous'; // supprimé

    // Listes pour les filtres
    filterOptions: FilterOptions | null = null;
    showCustomDateInputs: boolean = false;

    // Graphique à barres
    barChartData: any = { labels: [], datasets: [] };
    barChartOptions: any = {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: '' }
        // plus de datalabels ici
      }
    };

    lineChartOptions: any = {};
    selectedMetric: DashboardMetric = 'volume';
    agencySummaryData: any[] = [];
    allOperations: any[] = [];
    selectedChartType: 'bar' | 'line' = 'bar';
    lineChartData: any = { labels: [], datasets: [] };
    lineChartPlugins: any[] = [];

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
        // Trouver le lundi de la semaine en cours
        const currentDay = today.getDay(); // 0 (dimanche) à 6 (samedi)
        const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
        start = new Date(today);
        start.setDate(today.getDate() + diffToMonday);
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
      // Palette de couleurs standard (10 couleurs)
      const colorList = [
        '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2',
        '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#455a64'
      ];
      // Fonction pour générer une couleur aléatoire
      const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      // Les données sont déjà filtrées lors du chargement
      const agencySummaryFiltered = this.agencySummaryData;
      const operationsFiltered = this.allOperations;

      if (this.selectedMetric === 'transactions') {
        // Bar chart : répartition par service
        const excludedTypes = ['annulation_bo']; // NE PAS exclure 'transaction_cree'
        const filteredAgencySummary = agencySummaryFiltered.filter(s => !excludedTypes.includes((s.typeOperation || '').toLowerCase()));
        const aggregation: { [service: string]: number } = {};
        filteredAgencySummary.forEach((s: any) => {
          if (!aggregation[s.service]) aggregation[s.service] = 0;
          aggregation[s.service] += Number(s.recordCount) || 0;
        });
        const barLabels = Object.keys(aggregation);
        // Couleurs : couleur aléatoire pour 'transaction_cree', palette sinon
        const barColors = barLabels.map((label, idx) =>
          (label && label.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length]
        );
        const barData = barLabels.map(service => aggregation[service]);
        this.barChartData = {
          labels: barLabels,
          datasets: [{
            data: barData,
            backgroundColor: barColors,
            borderRadius: 6
          }]
        };
        this.barChartOptions.plugins.title.text = "Nombre de transactions par service (toutes agences)";

        // Line chart : évolution par service et par date
        const allServices = Array.from(new Set(filteredAgencySummary.map(s => s.service)));
        const allDates = Array.from(new Set(filteredAgencySummary.map(s => s.date))).sort();
        const datasets = allServices.map((service, idx) => {
          const data = allDates.map(date => {
            const found = filteredAgencySummary.find(s => s.service === service && s.date === date);
            return found ? Number(found.recordCount) : 0;
          });
          return {
            data,
            label: service,
            borderColor: (service && service.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length],
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 3
          };
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        if (this.selectedChartType === 'line') {
          const datasets = this.lineChartData.datasets || [];
          // Correction : ne compter que les datasets réellement visibles (au moins une valeur non nulle)
          const visibleDatasets = datasets.filter((ds: any) => ds.data && (ds.data as number[]).some((val: number) => val !== 0));
          this.lineChartPlugins = (visibleDatasets.length === 1) ? [ChartDataLabels] : [];
        }
        return;
      } else if (this.selectedMetric === 'revenu') {
        // Bar chart : volume des frais par service (tous les FRAIS_TRANSACTION, crédit et débit)
        const excludedTypes = ['annulation_bo']; // NE PAS exclure 'transaction_cree'
        const filteredOperations = operationsFiltered.filter(op => !excludedTypes.includes((op.typeOperation || '').toLowerCase()));
        const aggregation: { [service: string]: number } = {};
        filteredOperations
          .filter((op: any) => op.typeOperation === 'FRAIS_TRANSACTION' && op.service)
          .forEach((op: any) => {
            if (!aggregation[op.service]) aggregation[op.service] = 0;
            aggregation[op.service] += Number(op.montant) || 0;
          });
        const barLabels = Object.keys(aggregation);
        const barColors = barLabels.map((label, idx) =>
          (label && label.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length]
        );
        const barData = barLabels.map(service => aggregation[service]);
        this.barChartData = {
          labels: barLabels,
          datasets: [{
            data: barData,
            backgroundColor: barColors,
            borderRadius: 6
          }]
        };
        this.barChartOptions.plugins.title.text = "Volume des revenus par service (tous frais transaction)";

        // Line chart : évolution du volume des frais par service et par date (tous les FRAIS_TRANSACTION)
        const allServices = Array.from(new Set(filteredOperations
          .filter((op: any) => op.typeOperation === 'FRAIS_TRANSACTION' && op.service)
          .map((op: any) => op.service)));
        const allDates = Array.from(new Set(filteredOperations
          .filter((op: any) => op.typeOperation === 'FRAIS_TRANSACTION' && op.dateOperation)
          .map((op: any) => op.dateOperation.split('T')[0]))).sort();
        const datasets = allServices.map((service, idx) => {
          const data = allDates.map(date => {
            const found = filteredOperations.find(op => op.service === service && op.typeOperation === 'FRAIS_TRANSACTION' && op.dateOperation && op.dateOperation.split('T')[0] === date);
            return found ? Number(found.montant) : 0;
          });
          return {
            data,
            label: service,
            borderColor: (service && service.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length],
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 3
          };
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        if (this.selectedChartType === 'line') {
          const datasets = this.lineChartData.datasets || [];
          this.lineChartPlugins = (datasets.length === 1) ? [ChartDataLabels] : [];
        }
        return;
      } else if (this.selectedMetric === 'volume') {
        // Bar chart : volume total par type d'opération
        if (!this.detailedMetrics?.operationStats) return;
        const excludedTypes = ['annulation_bo']; // NE PAS exclure 'transaction_cree'
        const filteredStats = this.detailedMetrics.operationStats.filter(s => !excludedTypes.includes((s.operationType || '').toLowerCase()));
        // Correction : chaque type devient un dataset distinct
        const barDatasets = filteredStats.map((s: any, idx: number) => ({
          label: s.operationType ? s.operationType : '(Type inconnu)',
          data: [Number(s.totalVolume) || 0],
          backgroundColor: (s.operationType && s.operationType.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length],
          borderRadius: 6
        }));
        this.barChartData = {
          labels: [''], // une seule barre par dataset, label vide pour aligner
          datasets: barDatasets
        };
        this.barChartOptions.plugins.legend.display = true;
        this.barChartOptions.plugins.title.text = "Volume total par type d'opération";

        // Line chart : évolution du volume total par type d'opération et par date
        const filteredOperations = operationsFiltered.filter(op => !excludedTypes.includes((op.typeOperation || '').toLowerCase()));
        const allTypes = Array.from(new Set(filteredOperations.map((op: any) => op.typeOperation)));
        const allDates = Array.from(new Set(filteredOperations
          .filter((op: any) => op.dateOperation)
          .map((op: any) => op.dateOperation.split('T')[0]))).sort();
        const datasets = allTypes.map((type, idx) => {
          const data = allDates.map(date => {
            // Correction : somme de tous les montants pour ce type et cette date
            return filteredOperations
              .filter(op => op.typeOperation === type && op.dateOperation && op.dateOperation.split('T')[0] === date)
              .reduce((sum, op) => sum + Number(op.montant), 0);
          });
          return {
            data,
            label: type,
            borderColor: (type && type.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length],
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 3
          };
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        if (this.selectedChartType === 'line') {
          const datasets = this.lineChartData.datasets || [];
          this.lineChartPlugins = (datasets.length === 1) ? [ChartDataLabels] : [];
        }
        return;
      }
    }

    private routerSubscription: Subscription = new Subscription();
    private dataUpdateSubscription: Subscription = new Subscription();

    agenceSearchCtrl = new FormControl('');
    serviceSearchCtrl = new FormControl('');
    paysSearchCtrl = new FormControl('');
    filteredAgencies: string[] = [];
    filteredServices: string[] = [];
    filteredCountries: string[] = [];
    // filteredBanques: string[] = []; // supprimé

    // SUPPRIMER testMulti et testOptions

    // Ajout des compteurs pour la barre récapitulative
    get totalClientsCount(): number {
      return (this.filteredAgencies?.filter(a => a !== 'Tous').length) || 0;
    }
    get totalServicesCount(): number {
      return (this.filteredServices?.filter(s => s !== 'Tous').length) || 0;
    }
    get totalCountriesCount(): number {
      return (this.filteredCountries?.filter(p => p !== 'Tous').length) || 0;
    }

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
        this.loadAgencySummaryData();
        this.loadAllOperations();
        
        // Charger les métriques détaillées après un court délai pour s'assurer que les autres données sont chargées
        setTimeout(() => {
            this.loadDetailedMetrics();
        }, 500);
        
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

        this.filteredAgencies = this.filterOptions?.agencies || [];
        this.filteredServices = this.filterOptions?.services || [];
        this.filteredCountries = this.filterOptions?.countries || [];
        this.agenceSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '').toLowerCase();
          this.filteredAgencies = (this.filterOptions?.agencies || []).filter(a => a.toLowerCase().includes(s));
        });
        this.serviceSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '').toLowerCase();
          this.filteredServices = (this.filterOptions?.services || []).filter(a => a.toLowerCase().includes(s));
        });
        this.paysSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '').toLowerCase();
          this.filteredCountries = (this.filterOptions?.countries || []).filter(a => a.toLowerCase().includes(s));
        });
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
                this.filteredAgencies = options.agencies || [];
                this.filteredServices = options.services || [];
                this.filteredCountries = options.countries || [];
                // Forcer la valeur des contrôles de recherche à '' pour afficher toute la liste
                this.agenceSearchCtrl.setValue('');
                this.serviceSearchCtrl.setValue('');
                this.paysSearchCtrl.setValue('');
                // Initialiser les sélections à [] pour affichage automatique et choix multiple
                this.selectedAgency = [];
                this.selectedService = [];
                this.selectedCountry = [];
                this.onFilterChange();
                console.log('Filter options loaded:', options);
            },
            error: (error) => {
                console.error('Error loading filter options:', error);
                // Fallback to default values
                this.filterOptions = {
                    agencies: ['Toutes les agences'],
                    services: ['Tous les services'],
                    countries: ['Tous les pays'],
                    // banques: ['Toutes les banques'], // supprimé
                    timeFilters: ['Tous', 'Aujourd\'hui', 'Cette semaine', 'Ce mois', 'Personnalisé']
                };
                this.filteredAgencies = this.filterOptions.agencies;
                this.filteredServices = this.filterOptions.services;
                this.filteredCountries = this.filterOptions.countries;
                // this.filteredBanques = this.filterOptions.banques; // supprimé
            }
        });
    }

    private loadDetailedMetrics() {
        this.detailedLoading = true;
        this.detailedError = null;
        // Ajout de logs pour diagnostic
        console.log('[loadDetailedMetrics] Appelée avec :');
        console.log('selectedAgency:', this.selectedAgency);
        console.log('selectedService:', this.selectedService);
        console.log('selectedCountry:', this.selectedCountry);
        console.log('selectedTimeFilter:', this.selectedTimeFilter);
        console.log('startDate:', this.startDate);
        console.log('endDate:', this.endDate);
        // Adapter les filtres envoyés au backend
        const agencies = this.selectedAgency.length === 0 ? undefined : this.selectedAgency;
        const services = this.selectedService.length === 0 ? undefined : this.selectedService;
        const countries = this.selectedCountry.length === 0 ? undefined : this.selectedCountry;
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
                // Log de la réponse du backend
                console.log('[loadDetailedMetrics] Réponse du backend :', metrics);
                // Si aucune donnée n'est trouvée, afficher un message explicite et vider les données
                if (!metrics || (Array.isArray(metrics) && metrics.length === 0) || (typeof metrics === 'object' && Object.keys(metrics).length === 0)) {
                    this.detailedMetrics = null;
                    this.barChartData = { labels: [], datasets: [] };
                    this.lineChartData = { labels: [], datasets: [] };
                    this.detailedError = 'Aucune donnée pour ce pays';
                    this.detailedLoading = false;
                    this.updateBarChartData();
                    return;
                }
                this.detailedMetrics = metrics;
                this.detailedLoading = false;
                this.detailedError = null;
                this.updateBarChartData();
                console.log('Detailed metrics loaded:', metrics);
            },
            error: (error) => {
                // En cas d'erreur, vider les données et afficher un message explicite
                this.detailedMetrics = null;
                this.barChartData = { labels: [], datasets: [] };
                this.lineChartData = { labels: [], datasets: [] };
                this.detailedError = 'Aucune donnée pour ce pays';
                this.detailedLoading = false;
            }
        });
    }

    filteredAgencySummary: any[] = [];

    updateDashboardIndicators() {
      // Utiliser les données filtrées pour recalculer les indicateurs
      const agencySummaryFiltered = this.agencySummaryData.filter((s: any) =>
        (this.selectedAgency?.length === 0 || this.selectedAgency?.includes(s.agency)) &&
        (this.selectedService?.length === 0 || this.selectedService?.includes(s.service)) &&
        (this.selectedCountry?.length === 0 || this.selectedCountry?.includes(s.pays)) &&
        // (this.selectedBanque === 'Tous' || this.selectedBanque === s.banque) && // supprimé
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
        console.log('onFilterChange', this.selectedCountry, this.selectedService);
        this.loadAgencySummaryData();
        this.loadAllOperations();
        this.updateDashboardIndicators();
        // Recharger les métriques détaillées avec les nouveaux filtres
        this.loadDetailedMetrics();
        // Mettre à jour les graphiques
        this.updateBarChartData();
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

    toggleAllAgencies(event: any) {
      if (event.target.checked) {
        this.selectedAgency = [];
      }
      this.onFilterChange();
    }
    onAgencyCheckboxChange(agency: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedAgency?.includes(agency)) {
          this.selectedAgency = [...(this.selectedAgency || []), agency];
        }
      } else {
        this.selectedAgency = (this.selectedAgency || []).filter(a => a !== agency);
        if (!this.selectedAgency || this.selectedAgency.length === 0) {
          this.selectedAgency = [];
        }
      }
      this.onFilterChange();
    }
    toggleAllServices(event: any) {
      if (event.target.checked) {
        this.selectedService = [];
      }
      this.onFilterChange();
    }
    onServiceCheckboxChange(service: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedService?.includes(service)) {
          this.selectedService = [...(this.selectedService || []), service];
        }
      } else {
        this.selectedService = (this.selectedService || []).filter(s => s !== service);
        if (!this.selectedService || this.selectedService.length === 0) {
          this.selectedService = [];
        }
      }
      this.onFilterChange();
    }
    toggleAllCountries(event: any) {
      if (event.target.checked) {
        this.selectedCountry = [];
      }
      this.onFilterChange();
    }
    onCountryCheckboxChange(country: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedCountry?.includes(country)) {
          this.selectedCountry = [...(this.selectedCountry || []), country];
        }
      } else {
        this.selectedCountry = (this.selectedCountry || []).filter(c => c !== country);
        if (!this.selectedCountry || this.selectedCountry.length === 0) {
          this.selectedCountry = [];
        }
      }
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
        
        // Recharger les métriques détaillées (toujours, même sans filtres)
        this.loadDetailedMetrics();
        
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
        this.selectedAgency = [];
        this.selectedService = [];
        this.selectedCountry = [];
        this.selectedTimeFilter = 'Tous';
        this.startDate = '';
        this.endDate = '';
        this.showCustomDateInputs = false;
        this.loadDetailedMetrics();
        this.updateBarChartData();
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
            ['Agences', this.selectedAgency?.join(', ') || 'Tous'],
            ['Services', this.selectedService?.join(', ') || 'Tous'],
            ['Pays', this.selectedCountry?.join(', ') || 'Tous'],
            // ['Banque', this.selectedBanque], // supprimé
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
      const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
      const agencies = this.selectedAgency?.length === 0 ? undefined : this.selectedAgency;
      const services = this.selectedService?.length === 0 ? undefined : this.selectedService;
      const countries = this.selectedCountry?.length === 0 ? undefined : this.selectedCountry;
      // const banques = this.selectedBanque === 'Tous' ? undefined : [normalize(this.selectedBanque)]; // supprimé
      this.agencySummaryService.getAllSummaries().subscribe({
        next: (data: any[]) => {
          // DEBUG : Afficher les valeurs distinctes de banque et service
          console.log('Banques dans agencySummary:', Array.from(new Set(data.map(o => o.banque))));
          console.log('Services dans agencySummary:', Array.from(new Set(data.map(o => o.service))));
          this.agencySummaryData = data.filter((item: any) => {
            const agencyMatch = !agencies || agencies.includes(item.agency);
            const serviceMatch = !services || services.includes(item.service);
            const countryMatch = !countries || countries.includes(item.pays);
            // const banqueMatch = !banques || banques.includes(normalize(item.banque)); // supprimé
            return agencyMatch && serviceMatch && countryMatch;
          });
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
      const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
      const agencies = this.selectedAgency?.length === 0 ? undefined : this.selectedAgency;
      const services = this.selectedService?.length === 0 ? undefined : this.selectedService;
      const countries = this.selectedCountry?.length === 0 ? undefined : this.selectedCountry;
      // const banques = this.selectedBanque === 'Tous' ? undefined : [normalize(this.selectedBanque)]; // supprimé
      this.operationService.getAllOperations().subscribe({
        next: (ops: any[]) => {
          // DEBUG : Afficher les valeurs distinctes de banque et service
          console.log('Banques dans les opérations:', Array.from(new Set(ops.map(o => o.banque))));
          console.log('Services dans les opérations:', Array.from(new Set(ops.map(o => o.service))));
          this.allOperations = ops.filter((item: any) => {
            const agencyMatch = !agencies || agencies.includes(item.agence);
            const serviceMatch = !services || services.includes(item.service);
            const countryMatch = !countries || countries.includes(item.pays);
            // const banqueMatch = !banques || banques.includes(normalize(item.banque)); // supprimé
            return agencyMatch && serviceMatch && countryMatch;
          });
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