import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { ImpactOPService } from '../../services/impact-op.service';
import { OperationService } from '../../services/operation.service';
import { PopupService } from '../../services/popup.service';
import { ImpactOP } from '../../models/impact-op.model';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

@Component({
  selector: 'app-ecart-partenaire',
  templateUrl: './ecart-partenaire.component.html',
  styleUrls: ['./ecart-partenaire.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcartPartenaireComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  private subscription = new Subscription();
  filteredPartnerOnly: Record<string, string>[] = [];
  partnerOnlyPage = 1;
  pageSize = 20; // Modifiable par l'utilisateur
  searchKey: string = '';
  isLoading = false;
  loadProgress = 0;
  private volumeCache: number | null = null;
  private searchSubject = new Subject<string>();
  isSavingEcartPartnerToImpactOP = false;
  selectedPartnerOnlyKeys: string[] = [];
  selectedPartnerImportOpDate: string | null = null;

  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private reconciliationTabsService: ReconciliationTabsService,
    private impactOPService: ImpactOPService,
    private operationService: OperationService,
    private popupService: PopupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadPartnerOnly();
        }
      })
    );

    // Debounce sur la recherche
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
  }

  private async loadPartnerOnly(): Promise<void> {
    this.isLoading = true;
    this.loadProgress = 0;
    this.cdr.markForCheck();
    
    try {
      const partnerOnly = this.response?.partnerOnly || [];
      const total = partnerOnly.length;
      
      if (total === 0) {
        this.filteredPartnerOnly = [];
        this.reconciliationTabsService.setFilteredPartnerOnly([]);
        return;
      }

      // Chargement progressif par chunks
      const chunkSize = 1000;
      this.filteredPartnerOnly = [];
      
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = partnerOnly.slice(i, Math.min(i + chunkSize, total));
        this.filteredPartnerOnly.push(...chunk);
        this.loadProgress = Math.round(((i + chunk.length) / total) * 100);
        this.cdr.markForCheck();
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
      this.volumeCache = null;
    } finally {
      this.isLoading = false;
      this.loadProgress = 100;
      this.cdr.markForCheck();
    }
  }

  onSearch(): void {
    this.searchSubject.next(this.searchKey);
  }

  private performSearch(searchTerm: string): void {
    const partnerOnly = this.response?.partnerOnly || [];
    
    if (!searchTerm || !searchTerm.trim()) {
      // Pas de recherche : afficher tous les éléments
      this.filteredPartnerOnly = partnerOnly;
    } else {
      const term = searchTerm.trim();
      const termLower = term.toLowerCase();
      
      // Filtrer les éléments qui correspondent au terme de recherche
      this.filteredPartnerOnly = partnerOnly.filter(record => {
        // Parcourir toutes les colonnes et valeurs du record
        for (const [key, value] of Object.entries(record)) {
          if (!value) continue;
          
          const valueStr = value.toString();
          const valueLower = valueStr.toLowerCase();
          const keyLower = key.toLowerCase();
          
          // 1. Recherche simple : le terme est contenu dans la valeur (insensible à la casse)
          if (valueLower.includes(termLower)) {
            return true;
          }
          
          // 2. Recherche dans le nom de la colonne
          if (keyLower.includes(termLower)) {
            return true;
          }
          
          // 3. Recherche exacte pour les numéros (ignore les espaces, tirets, etc.)
          const valueNumbers = valueStr.replace(/[^\d]/g, '');
          const termNumbers = term.replace(/[^\d]/g, '');
          if (termNumbers && valueNumbers.includes(termNumbers)) {
            return true;
          }
          
          // 4. Recherche pour les montants (correspondance partielle ou exacte)
          if (keyLower.includes('montant') || keyLower.includes('amount') || keyLower.includes('volume') || 
              keyLower.includes('crédit') || keyLower.includes('credit')) {
            const valueAmount = valueStr.replace(/[^\d.-]/g, '');
            const termAmount = term.replace(/[^\d.-]/g, '');
            if (termAmount && valueAmount.includes(termAmount)) {
              return true;
            }
          }
          
          // 5. Recherche pour les dates (format flexible)
          if (keyLower.includes('date') || keyLower.includes('operation') || keyLower.includes('opération')) {
            const valueDate = valueStr.replace(/[^\d]/g, '');
            const termDate = term.replace(/[^\d]/g, '');
            if (termDate && valueDate.includes(termDate)) {
              return true;
            }
          }
          
          // 6. Recherche pour les IDs, numéros de transaction, numéro Trans GU, etc.
          if (keyLower.includes('id') || keyLower.includes('numero') || keyLower.includes('numéro') || 
              keyLower.includes('transaction') || keyLower.includes('reference') || keyLower.includes('référence') ||
              keyLower.includes('trans') || keyLower.includes('gu')) {
            if (valueLower.includes(termLower) || valueNumbers.includes(termNumbers)) {
              return true;
            }
          }
          
          // 7. Recherche pour les codes, groupes réseau, etc.
          if (keyLower.includes('code') || keyLower.includes('groupe') || keyLower.includes('reseau') || 
              keyLower.includes('réseau') || keyLower.includes('proprietaire') || keyLower.includes('propriétaire')) {
            if (valueLower.includes(termLower)) {
              return true;
            }
          }
        }
        
        // Aucune correspondance trouvée
        return false;
      });
    }
    
    // Réinitialiser à la première page après recherche
    this.partnerOnlyPage = 1;
    this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
    this.volumeCache = null;
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchKey = '';
    this.onSearch();
  }

  getSearchResultsCount(): number {
    return this.filteredPartnerOnly.length;
  }

  getTotalResultsCount(): number {
    return this.response?.partnerOnly?.length || 0;
  }

  getPagedPartnerOnly(): Record<string, string>[] {
    const start = (this.partnerOnlyPage - 1) * this.pageSize;
    return this.filteredPartnerOnly.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPartnerOnly.length / this.pageSize));
  }

  nextPage(): void {
    if (this.partnerOnlyPage < this.getTotalPages()) {
      this.partnerOnlyPage++;
      this.cdr.markForCheck();
    }
  }

  prevPage(): void {
    if (this.partnerOnlyPage > 1) {
      this.partnerOnlyPage--;
      this.cdr.markForCheck();
    }
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.partnerOnlyPage = page;
      this.cdr.markForCheck();
    }
  }

  getVisiblePages(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.partnerOnlyPage;
    const maxVisiblePages = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisiblePages) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher les pages autour de la page courante
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      // Ajuster si on est proche de la fin
      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  getStartIndex(): number {
    return (this.partnerOnlyPage - 1) * this.pageSize;
  }

  getEndIndex(): number {
    return Math.min(this.partnerOnlyPage * this.pageSize, this.filteredPartnerOnly.length);
  }

  onItemsPerPageChange(): void {
    this.partnerOnlyPage = 1; // Revenir à la première page
    this.cdr.markForCheck();
  }

  getPartnerOnlyCount(): number {
    return this.response?.partnerOnly?.length || 0;
  }

  calculateTotalVolumePartnerOnly(): number {
    if (this.volumeCache !== null) {
      return this.volumeCache;
    }

    if (!this.filteredPartnerOnly || this.filteredPartnerOnly.length === 0) {
      this.volumeCache = 0;
      return 0;
    }

    // Calcul optimisé avec limite
    const maxToProcess = Math.min(this.filteredPartnerOnly.length, 10000);
    let total = 0;
    
    for (let i = 0; i < maxToProcess; i++) {
      total += this.getPartnerOnlyVolume(this.filteredPartnerOnly[i]);
    }
    
    // Extrapolation si nécessaire
    if (this.filteredPartnerOnly.length > maxToProcess) {
      total = (total / maxToProcess) * this.filteredPartnerOnly.length;
    }
    
    this.volumeCache = total;
    return total;
  }

  getPartnerOnlyVolume(record: Record<string, string>): number {
    const amountColumns = ['montant', 'Montant', 'amount', 'Crédit', 'crédit', 'volume', 'Volume'];
    for (const col of amountColumns) {
      if (record[col]) {
        const amount = parseFloat(record[col]);
        if (!isNaN(amount)) return amount;
      }
    }
    return 0;
  }

  getPartnerOnlyDate(record: Record<string, string>): string {
    return record['Date'] || record['date'] || record['Date opération'] || record['dateOperation'] || '';
  }

  getPartnerOnlyKeys(record: Record<string, string>): string[] {
    return Object.keys(record).map(key => fixGarbledCharacters(key));
  }

  getRecordValue(record: Record<string, string>, key: string): string {
    const originalKey = Object.keys(record).find(k => fixGarbledCharacters(k) === key);
    return originalKey ? (record[originalKey] || '').toString() : '';
  }

  private getPartnerOnlyKey(record: Record<string, string>): string {
    const parts = [
      record['Numéro Trans GU'] || record['numeroTransGU'] || '',
      record['ID Opération'] || record['id_operation'] || '',
      record['Date opération'] || record['dateOperation'] || '',
      record['Montant'] || record['montant'] || ''
    ].filter(p => p).join('|');
    return parts || JSON.stringify(record);
  }

  isPartnerRecordSelected(record: Record<string, string>): boolean {
    return this.selectedPartnerOnlyKeys.includes(this.getPartnerOnlyKey(record));
  }

  togglePartnerSelection(record: Record<string, string>, event: any): void {
    const key = this.getPartnerOnlyKey(record);
    if (event.target.checked) {
      if (!this.selectedPartnerOnlyKeys.includes(key)) {
        this.selectedPartnerOnlyKeys.push(key);
      }
    } else {
      this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => k !== key);
    }
  }

  get allPartnerSelectedOnPage(): boolean {
    const page = this.getPagedPartnerOnly();
    return page.length > 0 && page.every(r => this.isPartnerRecordSelected(r));
  }

  toggleSelectAllPartnerOnPage(event: any): void {
    const page = this.getPagedPartnerOnly();
    const pageKeys = page.map(r => this.getPartnerOnlyKey(r));
    if (event.target.checked) {
      this.selectedPartnerOnlyKeys = Array.from(new Set([...this.selectedPartnerOnlyKeys, ...pageKeys]));
    } else {
      this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => !pageKeys.includes(k));
    }
  }

  isPartnerRecordEligible(record: Record<string, string>): boolean {
    // Vérifier si l'enregistrement a les données nécessaires pour créer une OP
    return !!(record['Montant'] || record['montant']) && !!(record['Date opération'] || record['dateOperation']);
  }

  async createOperationFromPartnerRecord(record: Record<string, string>): Promise<void> {
    if (!this.isPartnerRecordEligible(record)) {
      this.popupService.showWarning('❌ Données insuffisantes pour créer une opération');
      return;
    }

    // Logique de création d'opération
    this.popupService.showInfo('Fonctionnalité de création d\'opération en cours de développement');
  }

  async saveEcartPartnerToImpactOP(): Promise<void> {
    const sourceRecords: Record<string, string>[] =
      this.selectedPartnerOnlyKeys.length > 0
        ? this.filteredPartnerOnly.filter(r => this.selectedPartnerOnlyKeys.includes(this.getPartnerOnlyKey(r)))
        : this.filteredPartnerOnly;

    if (sourceRecords.length === 0) {
      this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
      return;
    }

    this.isSavingEcartPartnerToImpactOP = true;
    try {
      const dateInput = await this.popupService.showDateInput(
        'Sélectionnez la date d\'opération à appliquer pour les Import OP générés.',
        'Date Import OP',
        this.selectedPartnerImportOpDate || new Date().toISOString().split('T')[0]
      );

      if (dateInput === null) {
        return;
      }

      const impactOPData: ImpactOP[] = sourceRecords.map((record, index) => {
        const getValue = (keys: string[]): string => {
          for (const key of keys) {
            if (record[key]) return record[key].toString();
          }
          return '';
        };

        const getNumber = (keys: string[]): number => {
          const value = getValue(keys);
          const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        };

        return {
          id: undefined,
          typeOperation: getValue(['Type Opération', 'typeOperation', 'type_operation']) || 'DEPOT',
          montant: getNumber(['Montant', 'montant', 'amount']),
          soldeAvant: getNumber(['Solde avant', 'soldeAvant', 'solde_avant']),
          soldeApres: getNumber(['Solde aprés', 'Solde après', 'soldeApres', 'solde_apres']),
          codeProprietaire: getValue(['Code propriétaire', 'codeProprietaire', 'code_proprietaire']) || 'UNKNOWN',
          dateOperation: dateInput || new Date().toISOString(),
          numeroTransGU: getValue(['Numéro Trans GU', 'numeroTransGU', 'numero_trans_gu']) || `GU-${Date.now()}-${index}`,
          groupeReseau: (getValue(['groupe de réseau', 'groupeReseau', 'groupe_reseau']) || 'DEFAULT').substring(0, 10),
          statut: 'EN_ATTENTE',
          commentaire: `Importé depuis ECART Partenaire - ${new Date().toLocaleString('fr-FR')}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as ImpactOP;
      });

      let successCount = 0;
      let errorCount = 0;

      for (const impactOP of impactOPData) {
        try {
          await firstValueFrom(this.impactOPService.createImpactOP(impactOP));
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Erreur lors de la création de l\'Import OP:', error);
        }
      }

      if (successCount > 0) {
        this.popupService.showSuccess(`✅ ${successCount} Import OP créés avec succès !`);
      } else {
        this.popupService.showError('❌ Aucun Import OP n\'a pu être créé.');
      }
    } catch (error: any) {
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      this.isSavingEcartPartnerToImpactOP = false;
    }
  }

  async exportResults(): Promise<void> {
    this.popupService.showInfo('Fonctionnalité d\'export en cours de développement');
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
