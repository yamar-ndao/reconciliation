import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { CompteService } from '../../services/compte.service';
import { Compte } from '../../models/compte.model';
import { ServiceBalanceService, SubCompteRequest } from '../../services/service-balance.service';
import { PopupService } from '../../services/popup.service';
import { OperationService } from '../../services/operation.service';
import { Operation } from '../../models/operation.model';

// Interface pour les sous-comptes par code propriétaire
interface SubCompte {
    codeProprietaire: string;
    solde: number;
    nombreOperations: number;
    serviceCompteId: number; // ID du compte service parent
    serviceCompteNumero: string; // Numéro du compte service parent
}

@Component({
    selector: 'app-service-balance',
    templateUrl: './service-balance.component.html',
    styleUrls: ['./service-balance.component.scss']
})
export class ServiceBalanceComponent implements OnInit, OnDestroy {
    serviceComptes: Compte[] = [];
    filteredServiceComptes: Compte[] = [];
    paginatedComptes: Compte[] = [];
    groupedByCountry: { [key: string]: Compte[] } = {};
    selectedComptes: Compte[] = [];
    selectedCountry: string = '';
    
    // Filtres et recherche
    searchTerm: string = '';
    sortBy: string = 'numeroCompte';
    sortOrder: 'asc' | 'desc' = 'asc';
    filterBySolde: 'all' | 'positive' | 'negative' | 'zero' = 'all';
    filterByType: string = 'all';
    filterByCategorie: string = 'all';
    
    // Liste des types de compte disponibles
    compteTypes: string[] = ['TOP20', 'B2B', 'G&I'];
    
    // Liste des catégories de compte disponibles
    compteCategories: string[] = ['Client', 'Service', 'Banque', 'Comptable'];
    
    // Exposer Math pour le template
    Math = Math;
    
    // Pagination
    currentPage: number = 1;
    itemsPerPage: number = 12;
    totalPages: number = 1;
    
    isLoading = false;
    isMerging = false;
    showMergeForm = false;
    
    mergeForm: FormGroup;
    
    // Sous-comptes par code propriétaire pour les comptes Service
    serviceSubComptes: { [compteId: number]: SubCompte[] } = {};
    expandedComptes: Set<number> = new Set();
    loadingSubComptes: Set<number> = new Set();
    
    // Sous-comptes sélectionnés pour fusion
    selectedSubComptes: SubCompte[] = [];
    
    private subscriptions: Subscription[] = [];

    constructor(
        private compteService: CompteService,
        private serviceBalanceService: ServiceBalanceService,
        private popupService: PopupService,
        private operationService: OperationService,
        private fb: FormBuilder
    ) {
        this.mergeForm = this.fb.group({
            newCompteName: ['', [Validators.required, Validators.minLength(3)]],
            selectedCountry: ['', Validators.required]
        });
    }

    ngOnInit() {
        this.testPing();
        this.testConnection();
        this.loadServiceComptes();
    }

    testPing() {
        this.subscriptions.push(
            this.serviceBalanceService.testPing().subscribe({
                next: (result) => {
                    console.log('✅ Ping Backend OK:', result);
                },
                error: (error) => {
                    console.error('❌ Erreur Ping Backend:', error);
                    this.popupService.showError('Erreur Backend', 'Le backend n\'est pas accessible. Vérifiez qu\'il est démarré sur le port 8080.');
                }
            })
        );
    }

    testConnection() {
        this.subscriptions.push(
            this.serviceBalanceService.testConnection().subscribe({
                next: (result) => {
                    console.log('✅ Connexion API Service Balance OK:', result);
                },
                error: (error) => {
                    console.error('❌ Erreur de connexion API Service Balance:', error);
                    this.popupService.showError('Erreur de connexion', 'Impossible de se connecter à l\'API Service Balance');
                }
            })
        );
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    loadServiceComptes() {
        this.isLoading = true;
        this.subscriptions.push(
            this.serviceBalanceService.getServiceComptes().subscribe({
                next: (comptes) => {
                    console.log('Comptes service reçus:', comptes);
                    this.serviceComptes = comptes;
                    this.groupComptesByCountry();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des comptes service:', error);
                    this.popupService.showError('Erreur', 'Impossible de charger les comptes service');
                    this.isLoading = false;
                }
            })
        );
    }
    
    loadAllComptes() {
        this.isLoading = true;
        this.subscriptions.push(
            this.serviceBalanceService.getAllComptes().subscribe({
                next: (comptes) => {
                    console.log('Tous les comptes reçus:', comptes);
                    this.serviceComptes = comptes;
                    this.groupComptesByCountry();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement de tous les comptes:', error);
                    this.popupService.showError('Erreur', 'Impossible de charger tous les comptes');
                    this.isLoading = false;
                }
            })
        );
    }

    groupComptesByCountry() {
        this.groupedByCountry = {};
        this.serviceComptes.forEach(compte => {
            const country = compte.pays || 'Non défini';
            if (!this.groupedByCountry[country]) {
                this.groupedByCountry[country] = [];
            }
            this.groupedByCountry[country].push(compte);
        });
    }

    onCountryChange(country: string) {
        this.selectedCountry = country;
        this.filteredServiceComptes = this.groupedByCountry[country] || [];
        this.currentPage = 1; // Reset à la première page
        this.selectedComptes = [];
        this.selectedSubComptes = [];
        this.mergeForm.patchValue({ selectedCountry: country });
        this.applyFiltersAndPagination();
    }

    toggleCompteSelection(compte: Compte) {
        const index = this.selectedComptes.findIndex(c => c.id === compte.id);
        if (index > -1) {
            this.selectedComptes.splice(index, 1);
        } else {
            this.selectedComptes.push(compte);
        }
    }

    isCompteSelected(compte: Compte): boolean {
        return this.selectedComptes.some(c => c.id === compte.id);
    }

    getTotalSelectedSolde(): number {
        return this.selectedComptes.reduce((total, compte) => total + compte.solde, 0);
    }

    getSelectedComptesCount(): number {
        return this.selectedComptes.length;
    }

    // Méthodes pour la sélection des sous-comptes
    toggleSubCompteSelection(subCompte: SubCompte, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        
        const index = this.selectedSubComptes.findIndex(
            sc => sc.codeProprietaire === subCompte.codeProprietaire && 
                  sc.serviceCompteId === subCompte.serviceCompteId
        );
        
        if (index > -1) {
            this.selectedSubComptes.splice(index, 1);
        } else {
            this.selectedSubComptes.push(subCompte);
        }
    }

    isSubCompteSelected(subCompte: SubCompte): boolean {
        return this.selectedSubComptes.some(
            sc => sc.codeProprietaire === subCompte.codeProprietaire && 
                  sc.serviceCompteId === subCompte.serviceCompteId
        );
    }

    getSelectedSubComptesCount(): number {
        return this.selectedSubComptes.length;
    }

    getTotalSelectedSubComptesSolde(): number {
        return this.selectedSubComptes.reduce((total, subCompte) => total + subCompte.solde, 0);
    }

    getTotalSelectedCount(): number {
        return this.selectedComptes.length + this.selectedSubComptes.length;
    }

    getTotalSelectedSoldeIncludingSubComptes(): number {
        return this.getTotalSelectedSolde() + this.getTotalSelectedSubComptesSolde();
    }

    showMergeDialog() {
        const totalSelected = this.getTotalSelectedCount();
        if (totalSelected < 2) {
            this.popupService.showWarning('Sélection insuffisante', 'Veuillez sélectionner au moins 2 éléments (comptes ou sous-comptes) à fusionner');
            return;
        }
        this.showMergeForm = true;
    }

    cancelMerge() {
        this.showMergeForm = false;
        this.mergeForm.reset();
        // Note: On ne réinitialise pas les sélections ici pour permettre à l'utilisateur de réessayer
    }

    mergeComptes() {
        const totalSelected = this.getTotalSelectedCount();
        if (this.mergeForm.invalid || totalSelected < 2) {
            return;
        }

        this.isMerging = true;
        const newCompteName = this.mergeForm.get('newCompteName')?.value;
        const selectedCountry = this.mergeForm.get('selectedCountry')?.value;

        const compteIds = this.selectedComptes.map(c => c.id!);
        const hasSubComptes = this.selectedSubComptes.length > 0;
        const hasComptes = this.selectedComptes.length > 0;

        // Si on a des sous-comptes sélectionnés, on les fusionne
        if (hasSubComptes && !hasComptes) {
            // Fusion uniquement des sous-comptes
            const subComptesRequest = this.selectedSubComptes.map(sc => ({
                codeProprietaire: sc.codeProprietaire,
                serviceCompteId: sc.serviceCompteId,
                serviceCompteNumero: sc.serviceCompteNumero
            }));

            this.subscriptions.push(
                this.serviceBalanceService.mergeSubComptes(
                    subComptesRequest,
                    newCompteName,
                    selectedCountry
                ).subscribe({
                    next: (result) => {
                        console.log('Fusion des sous-comptes réussie:', result);
                        this.popupService.showSuccess(
                            'Regroupement réussi', 
                            `Un nouveau compte "${newCompteName}" a été créé avec un solde total de ${result.totalSolde.toLocaleString()} XAF. ${this.selectedSubComptes.length} sous-compte(s) regroupé(s).`
                        );
                        this.showMergeForm = false;
                        this.mergeForm.reset();
                        this.selectedComptes = [];
                        this.selectedSubComptes = [];
                        this.loadServiceComptes(); // Recharger la liste
                    },
                    error: (error) => {
                        console.error('Erreur lors de la fusion des sous-comptes:', error);
                        let errorMessage = 'Impossible de fusionner les sous-comptes';
                        if (error.error && error.error.message) {
                            errorMessage = error.error.message;
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        this.popupService.showError('Erreur de fusion', errorMessage);
                    },
                    complete: () => {
                        this.isMerging = false;
                    }
                })
            );
        } else if (hasComptes && !hasSubComptes) {
            // Fusion uniquement des comptes principaux
            this.subscriptions.push(
                this.serviceBalanceService.mergeServiceComptes(
                    compteIds,
                    newCompteName,
                    selectedCountry
                ).subscribe({
                    next: (result) => {
                        console.log('Fusion réussie:', result);
                        this.popupService.showSuccess(
                            'Regroupement réussi', 
                            `Un nouveau compte "${newCompteName}" a été créé avec un solde total de ${result.totalSolde.toLocaleString()} XAF. Les ${this.selectedComptes.length} compte(s) original(aux) restent opérationnels.`
                        );
                        this.showMergeForm = false;
                        this.mergeForm.reset();
                        this.selectedComptes = [];
                        this.selectedSubComptes = [];
                        this.loadServiceComptes(); // Recharger la liste
                    },
                    error: (error) => {
                        console.error('Erreur lors de la fusion:', error);
                        let errorMessage = 'Impossible de fusionner les comptes';
                        if (error.error && error.error.message) {
                            errorMessage = error.error.message;
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        this.popupService.showError('Erreur de fusion', errorMessage);
                    },
                    complete: () => {
                        this.isMerging = false;
                    }
                })
            );
        } else if (hasComptes && hasSubComptes) {
            // Cas mixte : on fusionne d'abord les comptes, puis on pourrait ajouter les sous-comptes
            // Pour l'instant, on affiche un message d'information
            this.popupService.showWarning(
                'Fusion mixte', 
                'La fusion simultanée de comptes et de sous-comptes n\'est pas encore supportée. Veuillez sélectionner soit des comptes, soit des sous-comptes.'
            );
            this.isMerging = false;
        } else {
            this.isMerging = false;
        }
    }

    getCountries(): string[] {
        return Object.keys(this.groupedByCountry).sort();
    }

    getComptesForCountry(country: string): Compte[] {
        return this.groupedByCountry[country] || [];
    }

    getTotalSoldeForCountry(country: string): number {
        return this.getComptesForCountry(country).reduce((total, compte) => total + compte.solde, 0);
    }

    // Méthodes pour les filtres et la recherche
    onSearchChange() {
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }

    onSortChange() {
        this.applyFiltersAndPagination();
    }

    onFilterChange() {
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }

    applyFiltersAndPagination() {
        let filtered = [...this.filteredServiceComptes];

        // Filtrage par terme de recherche
        if (this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(compte => 
                compte.numeroCompte.toLowerCase().includes(searchLower) ||
                (compte.agence && compte.agence.toLowerCase().includes(searchLower))
            );
        }

        // Filtrage par solde
        if (this.filterBySolde !== 'all') {
            filtered = filtered.filter(compte => {
                switch (this.filterBySolde) {
                    case 'positive': return compte.solde > 0;
                    case 'negative': return compte.solde < 0;
                    case 'zero': return compte.solde === 0;
                    default: return true;
                }
            });
        }

        // Filtrage par type de compte
        if (this.filterByType !== 'all') {
            if (this.filterByType === 'none') {
                filtered = filtered.filter(compte => !compte.type || compte.type.trim() === '');
            } else {
                filtered = filtered.filter(compte => compte.type === this.filterByType);
            }
        }

        // Filtrage par catégorie de compte
        if (this.filterByCategorie !== 'all') {
            if (this.filterByCategorie === 'none') {
                filtered = filtered.filter(compte => !compte.categorie || compte.categorie.trim() === '');
            } else {
                filtered = filtered.filter(compte => compte.categorie === this.filterByCategorie);
            }
        }

        // Tri
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (this.sortBy) {
                case 'numeroCompte':
                    aValue = a.numeroCompte.toLowerCase();
                    bValue = b.numeroCompte.toLowerCase();
                    break;
                case 'solde':
                    aValue = a.solde;
                    bValue = b.solde;
                    break;
                case 'dateDerniereMaj':
                    aValue = new Date(a.dateDerniereMaj).getTime();
                    bValue = new Date(b.dateDerniereMaj).getTime();
                    break;
                default:
                    aValue = a.numeroCompte.toLowerCase();
                    bValue = b.numeroCompte.toLowerCase();
            }

            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Mise à jour des comptes filtrés
        this.filteredServiceComptes = filtered;
        
        // Calcul de la pagination
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        // Application de la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.paginatedComptes = filtered.slice(startIndex, endIndex);
    }

    // Méthodes de pagination
    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.applyFiltersAndPagination();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    // Méthodes utilitaires
    getTotalFilteredCount(): number {
        return this.filteredServiceComptes.length;
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    clearFilters() {
        this.searchTerm = '';
        this.sortBy = 'numeroCompte';
        this.sortOrder = 'asc';
        this.filterBySolde = 'all';
        this.filterByType = 'all';
        this.filterByCategorie = 'all';
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }

    // Méthodes pour les sous-comptes Service
    isServiceCompte(compte: Compte): boolean {
        return compte.categorie === 'Service';
    }

    toggleSubComptes(compte: Compte) {
        if (!compte.id) return;
        
        if (this.expandedComptes.has(compte.id)) {
            this.expandedComptes.delete(compte.id);
        } else {
            this.expandedComptes.add(compte.id);
            if (!this.serviceSubComptes[compte.id]) {
                this.loadSubComptes(compte);
            }
        }
    }

    isExpanded(compte: Compte): boolean {
        return compte.id ? this.expandedComptes.has(compte.id) : false;
    }

    isLoadingSubComptes(compte: Compte): boolean {
        return compte.id ? this.loadingSubComptes.has(compte.id) : false;
    }

    getSubComptes(compte: Compte): SubCompte[] {
        return compte.id ? (this.serviceSubComptes[compte.id] || []) : [];
    }

    loadSubComptes(compte: Compte) {
        if (!compte.id || !compte.numeroCompte) return;

        this.loadingSubComptes.add(compte.id);

        // Récupérer toutes les opérations du compte service par le champ service
        // Les opérations sont liées au service par le champ 'service', pas par numeroCompte
        this.subscriptions.push(
            this.operationService.getOperationsByService(compte.numeroCompte).subscribe({
                next: (operations: Operation[]) => {
                    console.log(`Opérations trouvées pour le service ${compte.numeroCompte}:`, operations.length);
                    
                    // Grouper les opérations par codeProprietaire (en excluant le codeProprietaire du service)
                    const subComptesMap: { [codeProprietaire: string]: SubCompte } = {};
                    const serviceCodeProprietaire = compte.codeProprietaire || compte.numeroCompte;

                    operations.forEach(operation => {
                        const codeProprietaire = operation.codeProprietaire;
                        
                        // Ignorer les opérations sans codeProprietaire ou avec le même codeProprietaire que le service
                        if (!codeProprietaire || codeProprietaire.trim() === '' || 
                            codeProprietaire === serviceCodeProprietaire) {
                            return;
                        }

                        if (!subComptesMap[codeProprietaire]) {
                            subComptesMap[codeProprietaire] = {
                                codeProprietaire: codeProprietaire,
                                solde: 0,
                                nombreOperations: 0,
                                serviceCompteId: compte.id!,
                                serviceCompteNumero: compte.numeroCompte
                            };
                        }

                        // Calculer l'impact de l'opération sur le solde
                        const impact = this.getOperationImpact(operation);
                        subComptesMap[codeProprietaire].solde += impact;
                        subComptesMap[codeProprietaire].nombreOperations++;
                    });

                    console.log(`Sous-comptes trouvés:`, Object.keys(subComptesMap).length, Object.keys(subComptesMap));

                    // Convertir en tableau et trier par solde décroissant
                    this.serviceSubComptes[compte.id!] = Object.values(subComptesMap)
                        .sort((a, b) => b.solde - a.solde);
                    
                    this.loadingSubComptes.delete(compte.id!);
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des sous-comptes:', error);
                    this.popupService.showError('Erreur', 'Impossible de charger les sous-comptes');
                    this.loadingSubComptes.delete(compte.id!);
                }
            })
        );
    }

    private getOperationImpact(operation: Operation): number {
        // Calculer l'impact de l'opération sur le solde du service
        // Utiliser la différence de solde si disponible, sinon utiliser le montant selon le type
        if (operation.soldeAvant !== undefined && operation.soldeApres !== undefined) {
            return operation.soldeApres - operation.soldeAvant;
        }

        // Sinon, utiliser le montant selon le type d'opération
        const type = operation.typeOperation?.toLowerCase() || '';
        const montant = operation.montant || 0;
        
        // Opérations qui augmentent le solde du service
        if (type.includes('cashin') || 
            type.includes('appro') || 
            type.includes('ajustement') ||
            type.includes('transaction_cree')) {
            return montant;
        }
        
        // Opérations qui diminuent le solde du service
        if (type.includes('paiement') || 
            type.includes('compense') || 
            type.includes('frais') ||
            type.includes('annulation')) {
            return -montant;
        }
        
        // Par défaut, retourner 0 si on ne peut pas déterminer l'impact
        return 0;
    }
}
