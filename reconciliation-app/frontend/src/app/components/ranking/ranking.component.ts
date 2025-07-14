import { Component, OnInit } from '@angular/core';
import { RankingService, RankingItem } from '../../services/ranking.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  
  // Données des classements
  agencyRankings: RankingItem[] = [];
  serviceRankings: RankingItem[] = [];
  
  // Types de classement
  agencyRankingType: 'transactions' | 'volume' | 'fees' = 'transactions';
  serviceRankingType: 'transactions' | 'volume' | 'fees' = 'transactions';
  
  // Période de calcul
  selectedPeriod: 'day' | 'week' | 'month' = 'month';
  
  // États de chargement
  loadingAgencies = false;
  loadingServices = false;
  
  // Erreurs
  errorAgencies = '';
  errorServices = '';

  // Pagination agences
  agencyPage = 1;
  agencyPageSize = 10;
  get paginatedAgencyRankings() {
    const start = (this.agencyPage - 1) * this.agencyPageSize;
    return this.agencyRankings.slice(start, start + this.agencyPageSize);
  }
  get agencyTotalPages() {
    return Math.ceil(this.agencyRankings.length / this.agencyPageSize);
  }

  // Pagination services
  servicePage = 1;
  servicePageSize = 10;
  get paginatedServiceRankings() {
    const start = (this.servicePage - 1) * this.servicePageSize;
    return this.serviceRankings.slice(start, start + this.servicePageSize);
  }
  get serviceTotalPages() {
    return Math.ceil(this.serviceRankings.length / this.servicePageSize);
  }

  countries: string[] = [];
  selectedCountries: string[] = ['Tous les pays'];

  constructor(private rankingService: RankingService) { }

  ngOnInit(): void {
    this.rankingService.getCountries().subscribe({
      next: (data) => {
        this.countries = ['Tous les pays', ...data];
      },
      error: () => {
        this.countries = ['Tous les pays'];
      }
    });
    this.loadAgencyRankings();
    this.loadServiceRankings();
  }

  /**
   * Charger les classements des agences
   */
  loadAgencyRankings(): void {
    this.loadingAgencies = true;
    this.errorAgencies = '';

    let observable;
    switch (this.agencyRankingType) {
      case 'transactions':
        observable = this.rankingService.getAgencyRankingByTransactions(this.selectedCountries, this.selectedPeriod);
        break;
      case 'volume':
        observable = this.rankingService.getAgencyRankingByVolume(this.selectedCountries, this.selectedPeriod);
        break;
      case 'fees':
        observable = this.rankingService.getAgencyRankingByFees(this.selectedCountries, this.selectedPeriod);
        break;
      default:
        observable = this.rankingService.getAgencyRankingByTransactions(this.selectedCountries, this.selectedPeriod);
    }

    observable.subscribe({
      next: (data) => {
        this.agencyRankings = data;
        this.loadingAgencies = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des classements des agences:', error);
        this.errorAgencies = 'Erreur lors du chargement des données';
        this.loadingAgencies = false;
      }
    });
  }

  /**
   * Charger les classements des services
   */
  loadServiceRankings(): void {
    this.loadingServices = true;
    this.errorServices = '';

    let observable;
    switch (this.serviceRankingType) {
      case 'transactions':
        observable = this.rankingService.getServiceRankingByTransactions(this.selectedCountries, this.selectedPeriod);
        break;
      case 'volume':
        observable = this.rankingService.getServiceRankingByVolume(this.selectedCountries, this.selectedPeriod);
        break;
      case 'fees':
        observable = this.rankingService.getServiceRankingByFees(this.selectedCountries, this.selectedPeriod);
        break;
      default:
        observable = this.rankingService.getServiceRankingByTransactions(this.selectedCountries, this.selectedPeriod);
    }

    observable.subscribe({
      next: (data) => {
        this.serviceRankings = data;
        this.loadingServices = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des classements des services:', error);
        this.errorServices = 'Erreur lors du chargement des données';
        this.loadingServices = false;
      }
    });
  }

  /**
   * Changer le type de classement des agences
   */
  onAgencyRankingTypeChange(): void {
    this.loadAgencyRankings();
  }

  /**
   * Changer le type de classement des services
   */
  onServiceRankingTypeChange(): void {
    this.loadServiceRankings();
  }

  /**
   * Changer la période de calcul
   */
  onPeriodChange(): void {
    this.loadAgencyRankings();
    this.loadServiceRankings();
  }

  /**
   * Obtenir le titre du classement des agences
   */
  getAgencyRankingTitle(): string {
    switch (this.agencyRankingType) {
      case 'transactions':
        return 'Classement des Agences par Nombre de Transactions';
      case 'volume':
        return 'Classement des Agences par Volume';
      case 'fees':
        return 'Classement des Agences par Frais';
      default:
        return 'Classement des Agences';
    }
  }

  /**
   * Obtenir le titre du classement des services
   */
  getServiceRankingTitle(): string {
    switch (this.serviceRankingType) {
      case 'transactions':
        return 'Classement des Services par Nombre de Transactions';
      case 'volume':
        return 'Classement des Services par Volume';
      case 'fees':
        return 'Classement des Services par Frais';
      default:
        return 'Classement des Services';
    }
  }

  /**
   * Obtenir le label de la période
   */
  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'day':
        return 'Jour';
      case 'week':
        return 'Semaine';
      case 'month':
        return 'Mois';
      default:
        return 'Mois';
    }
  }

  /**
   * Obtenir la classe CSS pour la position
   */
  getPositionClass(position: number): string {
    if (position === 1) return 'position-gold';
    if (position === 2) return 'position-silver';
    if (position === 3) return 'position-bronze';
    return 'position-normal';
  }

  /**
   * Formater un montant
   */
  formatAmount(amount: number): string {
    return this.rankingService.formatAmount(amount);
  }

  /**
   * Formater un nombre
   */
  formatNumber(num: number): string {
    return this.rankingService.formatNumber(num);
  }

  // Navigation pagination agences
  nextAgencyPage() { if (this.agencyPage < this.agencyTotalPages) this.agencyPage++; }
  prevAgencyPage() { if (this.agencyPage > 1) this.agencyPage--; }
  setAgencyPage(page: number) { this.agencyPage = page; }

  // Navigation pagination services
  nextServicePage() { if (this.servicePage < this.serviceTotalPages) this.servicePage++; }
  prevServicePage() { if (this.servicePage > 1) this.servicePage--; }
  setServicePage(page: number) { this.servicePage = page; }

  // Export CSV générique
  exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) return;
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(data[0]);
    const csv = [
      header.join(','),
      ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  exportAgencyCSV() {
    this.exportToCSV(this.agencyRankings, 'classement_agences.csv');
  }
  exportServiceCSV() {
    this.exportToCSV(this.serviceRankings, 'classement_services.csv');
  }

  exportAgencyExcel() {
    this.exportExcel(this.agencyRankings, 'classement_agences.xlsx', 'Agences');
  }
  exportServiceExcel() {
    this.exportExcel(this.serviceRankings, 'classement_services.xlsx', 'Services');
  }

  exportExcel(data: any[], filename: string, sheetName: string) {
    if (!data || !data.length) return;
    // Colonnes à exporter (dans l'ordre)
    const columns = Object.keys(data[0]);
    const header = ['Position', ...columns.map(col => this.getHeaderLabel(col))];
    const wsData = [header, ...data.map((row, idx) => [idx + 1, ...columns.map(col => row[col])])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Styles
    const gold = { fill: { fgColor: { rgb: 'FFF9D923' } } };
    const silver = { fill: { fgColor: { rgb: 'FFE0E0E0' } } };
    const bronze = { fill: { fgColor: { rgb: 'FFF4C99B' } } };
    const border = { top: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, left: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, right: { style: 'thin', color: { rgb: 'FFCCCCCC' } } };
    const headerStyle = { fill: { fgColor: { rgb: 'FF764BA2' } }, font: { bold: true, color: { rgb: 'FFFFFFFF' } }, border };
    const normalStyle = { border };

    // Appliquer le style à l'en-tête
    for (let colIdx = 0; colIdx < header.length; colIdx++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cell]) ws[cell].s = headerStyle;
    }

    // Appliquer le style à chaque ligne
    for (let i = 1; i <= data.length; i++) {
      let style = normalStyle;
      if (i === 1) style = { ...gold, ...normalStyle };
      else if (i === 2) style = { ...silver, ...normalStyle };
      else if (i === 3) style = { ...bronze, ...normalStyle };
      for (let colIdx = 0; colIdx < header.length; colIdx++) {
        const cell = XLSX.utils.encode_cell({ r: i, c: colIdx });
        if (ws[cell]) ws[cell].s = style;
      }
    }

    // Largeur automatique
    ws['!cols'] = header.map(() => ({ wch: 18 }));

    // Création du classeur
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename, { cellStyles: true });
  }

  getHeaderLabel(col: string): string {
    switch (col) {
      case 'agency': return 'Agence';
      case 'service': return 'Service';
      case 'transactionCount': return 'Transactions';
      case 'totalVolume': return 'Volume Total';
      case 'totalFees': return 'Frais Totaux';
      case 'averageVolume': return `Volume Moyen/${this.getPeriodLabel()}`;
      case 'averageFees': return `Frais Moyens/${this.getPeriodLabel()}`;
      case 'uniqueAgencies': return 'Agences';
      case 'position': return 'Position';
      default: return col;
    }
  }

  toggleCountry(country: string): void {
    if (country === 'Tous les pays') {
      // Si "Tous les pays" est coché, décocher tous les autres
      this.selectedCountries = ['Tous les pays'];
    } else {
      // Retirer "Tous les pays" si présent
      this.selectedCountries = this.selectedCountries.filter(c => c !== 'Tous les pays');
      
      if (this.selectedCountries.includes(country)) {
        // Décocher le pays
        this.selectedCountries = this.selectedCountries.filter(c => c !== country);
        // Si aucun pays n'est sélectionné, remettre "Tous les pays"
        if (this.selectedCountries.length === 0) {
          this.selectedCountries = ['Tous les pays'];
        }
      } else {
        // Cocher le pays
        this.selectedCountries.push(country);
      }
    }
    this.loadAgencyRankings();
    this.loadServiceRankings();
  }

  isCountrySelected(country: string): boolean {
    return this.selectedCountries.includes(country);
  }

  onCountryChange(): void {
    this.loadAgencyRankings();
    this.loadServiceRankings();
  }
} 