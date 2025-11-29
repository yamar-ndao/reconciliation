import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { ExportOptimizationService } from '../../services/export-optimization.service';
import { PopupService } from '../../services/popup.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

@Component({
  selector: 'app-correspondances',
  templateUrl: './correspondances.component.html',
  styleUrls: ['./correspondances.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CorrespondancesComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  private subscription = new Subscription();
  filteredMatches: Match[] = [];
  matchesPage = 1;
  readonly pageSize = 20; // Réduit pour améliorer les performances
  searchKey: string = '';
  isLoading = false;
  loadProgress = 0;
  isExporting = false;
  exportProgress = 0;
  exportMessage = '';
  
  // Cache pour les calculs
  private volumeCache: { bo: number | null; partner: number | null } = { bo: null, partner: null };
  private searchSubject = new Subject<string>();
  private exportSubscription?: Subscription;

  // Gestion des colonnes
  allColumns: string[] = []; // Toutes les colonnes disponibles
  visibleColumns: string[] = []; // Colonnes visibles dans le tableau
  columnVisibility: Map<string, boolean> = new Map(); // État de visibilité de chaque colonne
  showColumnSelector = false;
  
  // Drag & drop pour réorganiser les colonnes
  draggedColumn: string | null = null;
  dragOverColumn: string | null = null;
  isColumnReorderMode = false;

  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private reconciliationTabsService: ReconciliationTabsService,
    private exportOptimizationService: ExportOptimizationService,
    private popupService: PopupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Écouter les résultats de réconciliation
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadMatches();
        }
      })
    );

    // Debounce sur la recherche (300ms)
    this.subscription.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(searchTerm => {
        this.performSearch(searchTerm);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.exportSubscription) {
      this.exportSubscription.unsubscribe();
    }
  }

  private async loadMatches(): Promise<void> {
    this.isLoading = true;
    this.loadProgress = 0;
    this.cdr.markForCheck();
    
    try {
      const matches = this.response?.matches || [];
      const total = matches.length;
      
      if (total === 0) {
        this.filteredMatches = [];
        this.reconciliationTabsService.setFilteredMatches([]);
        return;
      }

      // Chargement progressif par chunks pour ne pas bloquer l'UI
      const chunkSize = 1000;
      this.filteredMatches = [];
      
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = matches.slice(i, Math.min(i + chunkSize, total));
        this.filteredMatches.push(...chunk);
        this.loadProgress = Math.round(((i + chunk.length) / total) * 100);
        this.cdr.markForCheck();
        
        // Permettre au navigateur de respirer
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
      this.initializeColumns();
      this.invalidateCache();
    } finally {
      this.isLoading = false;
      this.loadProgress = 100;
      this.cdr.markForCheck();
    }
  }

  private initializeColumns(): void {
    if (this.filteredMatches.length === 0) return;

    const allColumnsSet = new Set<string>();
    const sampleMatch = this.filteredMatches[0];

    // Collecter toutes les colonnes BO
    Object.keys(sampleMatch.boData).forEach(key => {
      const correctedKey = fixGarbledCharacters(key);
      allColumnsSet.add(`BO_${correctedKey}`);
    });

    // Collecter toutes les colonnes Partenaire
    Object.keys(sampleMatch.partnerData).forEach(key => {
      const correctedKey = fixGarbledCharacters(key);
      allColumnsSet.add(`PARTENAIRE_${correctedKey}`);
    });

    this.allColumns = Array.from(allColumnsSet).sort();
    
    // Par défaut, toutes les colonnes sont visibles
    this.visibleColumns = [...this.allColumns];
    this.allColumns.forEach(col => {
      this.columnVisibility.set(col, true);
    });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchKey);
  }

  private performSearch(searchTerm: string): void {
    const matches = this.response?.matches || [];
    if (!searchTerm.trim()) {
      this.filteredMatches = matches;
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredMatches = matches.filter(match => 
        match.key.toLowerCase().includes(term)
      );
    }
    this.matchesPage = 1;
    this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
    this.invalidateCache();
    this.cdr.markForCheck();
  }

  getPagedMatches(): Match[] {
    const start = (this.matchesPage - 1) * this.pageSize;
    return this.filteredMatches.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMatches.length / this.pageSize));
  }

  nextPage(): void {
    if (this.matchesPage < this.getTotalPages()) {
      this.matchesPage++;
      this.cdr.markForCheck();
    }
  }

  prevPage(): void {
    if (this.matchesPage > 1) {
      this.matchesPage--;
      this.cdr.markForCheck();
    }
  }

  getMatchesCount(): number {
    return this.response?.matches?.length || 0;
  }

  calculateTotalVolume(type: 'bo' | 'partner'): number {
    // Utiliser le cache si disponible
    if (this.volumeCache[type] !== null) {
      return this.volumeCache[type]!;
    }

    const matches = this.filteredMatches || [];
    let total = 0;
    
    // Calcul optimisé avec limite pour éviter de bloquer
    const maxToProcess = Math.min(matches.length, 10000); // Limiter à 10k pour les performances
    for (let i = 0; i < maxToProcess; i++) {
      const match = matches[i];
      if (type === 'bo') {
        const volume = parseFloat(match.boData['montant'] || match.boData['Montant'] || match.boData['volume'] || '0');
        if (!isNaN(volume)) total += volume;
      } else {
        const volume = parseFloat(match.partnerData['montant'] || match.partnerData['Montant'] || match.partnerData['Crédit'] || match.partnerData['volume'] || '0');
        if (!isNaN(volume)) total += volume;
      }
    }
    
    // Si on a limité, extrapoler
    if (matches.length > maxToProcess) {
      total = (total / maxToProcess) * matches.length;
    }
    
    this.volumeCache[type] = total;
    return total;
  }

  calculateVolumeDifference(): number {
    const boVolume = this.calculateTotalVolume('bo');
    const partnerVolume = this.calculateTotalVolume('partner');
    return boVolume - partnerVolume;
  }

  private invalidateCache(): void {
    this.volumeCache = { bo: null, partner: null };
  }

  hasDifferences(match: Match): boolean {
    return match.differences && match.differences.length > 0;
  }

  getBoAgencyAndService(match: Match): { agency: string; service: string; volume: number; date: string; country: string } {
    return {
      agency: match.boData['Agence'] || match.boData['agence'] || match.boData['AGENCE'] || '',
      service: match.boData['Service'] || match.boData['service'] || match.boData['SERVICE'] || '',
      volume: parseFloat(match.boData['montant'] || match.boData['Montant'] || match.boData['volume'] || '0') || 0,
      date: match.boData['Date'] || match.boData['date'] || match.boData['DATE'] || '',
      country: match.boData['Pays'] || match.boData['pays'] || match.boData['PAYS'] || ''
    };
  }

  getBoKeys(match: Match): string[] {
    return Object.keys(match.boData).map(key => fixGarbledCharacters(key));
  }

  getPartnerKeys(match: Match): string[] {
    return Object.keys(match.partnerData).map(key => fixGarbledCharacters(key));
  }

  getBoValue(match: Match, key: string): string {
    const originalKey = Object.keys(match.boData).find(k => fixGarbledCharacters(k) === key);
    return originalKey ? (match.boData[originalKey] || '').toString() : '';
  }

  getPartnerValue(match: Match, key: string): string {
    const originalKey = Object.keys(match.partnerData).find(k => fixGarbledCharacters(k) === key);
    return originalKey ? (match.partnerData[originalKey] || '').toString() : '';
  }

  async handleExport(): Promise<void> {
    if (!this.filteredMatches || this.filteredMatches.length === 0) {
      this.popupService.showWarning('Aucune correspondance à exporter');
      return;
    }

    this.isExporting = true;
    this.exportProgress = 0;
    this.exportMessage = 'Préparation de l\'export...';
    this.cdr.markForCheck();

    try {
      const totalMatches = this.filteredMatches.length;
      const isLargeDataset = totalMatches > 5000;

      // Étape 1: Collecter les colonnes (optimisé - une seule passe sur échantillon)
      this.exportMessage = 'Collecte des colonnes...';
      this.cdr.markForCheck();
      
      const allColumns = new Set<string>();
      const boColumnMap = new Map<string, string>(); // correctedKey -> originalKey
      const partnerColumnMap = new Map<string, string>();

      // Collecter les colonnes sur un échantillon représentatif (premier match suffit généralement)
      const sampleMatch = this.filteredMatches[0];
      
      // BO columns - créer le mapping une seule fois
      Object.keys(sampleMatch.boData).forEach(originalKey => {
        const correctedKey = fixGarbledCharacters(originalKey);
        const fullKey = `BO_${correctedKey}`;
        allColumns.add(fullKey);
        boColumnMap.set(correctedKey, originalKey);
      });
      
      // Partner columns - créer le mapping une seule fois
      Object.keys(sampleMatch.partnerData).forEach(originalKey => {
        const correctedKey = fixGarbledCharacters(originalKey);
        const fullKey = `PARTENAIRE_${correctedKey}`;
        allColumns.add(fullKey);
        partnerColumnMap.set(correctedKey, originalKey);
      });

      // Utiliser uniquement les colonnes visibles pour l'export
      const visibleCols = this.getVisibleColumns();
      const columns = visibleCols.length > 0 ? visibleCols : Array.from(allColumns).sort();

      // Étape 2: Transformer les données par chunks pour ne pas bloquer l'UI
      this.exportMessage = 'Transformation des données...';
      this.cdr.markForCheck();

      const rows: any[] = [];
      const chunkSize = 1000; // Traiter par chunks de 1000

      for (let i = 0; i < totalMatches; i += chunkSize) {
        const chunk = this.filteredMatches.slice(i, Math.min(i + chunkSize, totalMatches));
        
        // Transformer le chunk (optimisé avec cache des mappings)
        chunk.forEach(match => {
          const row: any = {};
          
          // Utiliser directement les mappings au lieu de rechercher à chaque fois
          columns.forEach(col => {
            if (col.startsWith('BO_')) {
              const correctedKey = col.replace('BO_', '');
              const originalKey = boColumnMap.get(correctedKey);
              row[col] = originalKey && match.boData[originalKey] !== undefined 
                ? String(match.boData[originalKey] || '') 
                : '';
            } else if (col.startsWith('PARTENAIRE_')) {
              const correctedKey = col.replace('PARTENAIRE_', '');
              const originalKey = partnerColumnMap.get(correctedKey);
              row[col] = originalKey && match.partnerData[originalKey] !== undefined 
                ? String(match.partnerData[originalKey] || '') 
                : '';
            }
          });
          
          rows.push(row);
        });

        // Mettre à jour la progression
        this.exportProgress = Math.round(((i + chunk.length) / totalMatches) * 50); // 50% pour la transformation
        this.exportMessage = `Transformation: ${Math.min(i + chunk.length, totalMatches).toLocaleString()}/${totalMatches.toLocaleString()} correspondances`;
        this.cdr.markForCheck();

        // Permettre au navigateur de respirer
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Étape 3: Exporter avec le service optimisé
      this.exportMessage = 'Génération du fichier Excel...';
      this.exportProgress = 50;
      this.cdr.markForCheck();

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `correspondances_${timestamp}`;

      // S'abonner à la progression de l'export
      if (this.exportSubscription) {
        this.exportSubscription.unsubscribe();
      }

      this.exportSubscription = this.exportOptimizationService.exportProgress$.subscribe(progress => {
        // Ajuster la progression : 50% pour transformation + 50% pour export
        this.exportProgress = 50 + Math.round(progress.percentage / 2);
        this.exportMessage = progress.message;
        this.cdr.markForCheck();

        if (progress.isComplete) {
          this.isExporting = false;
          if (progress.message.includes('✅')) {
            this.exportMessage = 'Export terminé avec succès !';
          } else if (progress.message.includes('Erreur')) {
            this.exportMessage = 'Erreur lors de l\'export';
          }
          this.cdr.markForCheck();
        }
      });

      // Lancer l'export optimisé
      if (isLargeDataset) {
        await this.exportOptimizationService.exportExcelOptimized(rows, columns, fileName, {
          chunkSize: 3000,
          useWebWorker: true,
          enableCompression: true
        });
      } else {
        await this.exportOptimizationService.exportExcelOptimized(rows, columns, fileName, {
          chunkSize: 2000,
          useWebWorker: false
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.isExporting = false;
      this.exportMessage = 'Erreur lors de l\'export';
      this.popupService.showError('Erreur lors de l\'export des correspondances');
      this.cdr.markForCheck();
    }
  }

  // Gestion de la visibilité des colonnes
  toggleColumnVisibility(column: string): void {
    const isVisible = this.columnVisibility.get(column) ?? true;
    this.columnVisibility.set(column, !isVisible);
    
    if (!isVisible) {
      // Ajouter la colonne à la position d'origine si elle existe
      const originalIndex = this.allColumns.indexOf(column);
      if (originalIndex >= 0) {
        const currentIndex = this.visibleColumns.findIndex(c => c === column);
        if (currentIndex === -1) {
          // Trouver la bonne position dans visibleColumns
          let insertIndex = 0;
          for (let i = 0; i < this.visibleColumns.length; i++) {
            if (this.allColumns.indexOf(this.visibleColumns[i]) < originalIndex) {
              insertIndex = i + 1;
            }
          }
          this.visibleColumns.splice(insertIndex, 0, column);
        }
      } else {
        this.visibleColumns.push(column);
      }
    } else {
      // Retirer la colonne
      this.visibleColumns = this.visibleColumns.filter(c => c !== column);
    }
    this.cdr.markForCheck();
  }

  isColumnVisible(column: string): boolean {
    return this.columnVisibility.get(column) ?? true;
  }

  getVisibleColumns(): string[] {
    return this.visibleColumns.filter(col => this.columnVisibility.get(col) ?? true);
  }

  // Drag & Drop pour réorganiser les colonnes
  onColumnDragStart(event: DragEvent, column: string): void {
    if (!this.isColumnReorderMode) return;
    this.draggedColumn = column;
    event.dataTransfer!.effectAllowed = 'move';
  }

  onColumnDragOver(event: DragEvent, column: string): void {
    if (!this.isColumnReorderMode || !this.draggedColumn) return;
    event.preventDefault();
    this.dragOverColumn = column;
  }

  onColumnDrop(event: DragEvent, targetColumn: string): void {
    if (!this.isColumnReorderMode || !this.draggedColumn) return;
    event.preventDefault();
    
    if (this.draggedColumn !== targetColumn) {
      const draggedIndex = this.visibleColumns.indexOf(this.draggedColumn);
      const targetIndex = this.visibleColumns.indexOf(targetColumn);
      
      if (draggedIndex >= 0 && targetIndex >= 0) {
        const newColumns = [...this.visibleColumns];
        newColumns.splice(draggedIndex, 1);
        newColumns.splice(targetIndex, 0, this.draggedColumn);
        this.visibleColumns = newColumns;
      }
    }
    
    this.draggedColumn = null;
    this.dragOverColumn = null;
    this.cdr.markForCheck();
  }

  onColumnDragEnd(): void {
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  toggleColumnReorderMode(): void {
    this.isColumnReorderMode = !this.isColumnReorderMode;
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  // Obtenir la valeur d'une cellule pour le tableau
  getCellValue(match: Match, column: string): string {
    if (column.startsWith('BO_')) {
      const correctedKey = column.replace('BO_', '');
      const originalKey = Object.keys(match.boData).find(k => fixGarbledCharacters(k) === correctedKey);
      return originalKey ? (match.boData[originalKey] || '').toString() : '';
    } else if (column.startsWith('PARTENAIRE_')) {
      const correctedKey = column.replace('PARTENAIRE_', '');
      const originalKey = Object.keys(match.partnerData).find(k => fixGarbledCharacters(k) === correctedKey);
      return originalKey ? (match.partnerData[originalKey] || '').toString() : '';
    }
    return '';
  }

  showAllColumns(): void {
    this.allColumns.forEach(c => {
      this.columnVisibility.set(c, true);
      if (!this.visibleColumns.includes(c)) {
        this.visibleColumns.push(c);
      }
    });
    this.visibleColumns = [...this.allColumns];
    this.cdr.markForCheck();
  }

  hideAllColumns(): void {
    this.allColumns.forEach(c => this.columnVisibility.set(c, false));
    this.visibleColumns = [];
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
