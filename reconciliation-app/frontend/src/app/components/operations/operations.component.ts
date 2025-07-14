import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OperationService } from '../../services/operation.service';
import { CompteService } from '../../services/compte.service';
import { Operation, OperationFilter, TypeOperation, StatutOperation, OperationUpdateRequest } from '../../models/operation.model';
import { Compte } from '../../models/compte.model';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-operations',
    templateUrl: './operations.component.html',
    styleUrls: ['./operations.component.scss']
})
export class OperationsComponent implements OnInit, OnDestroy {
    operations: Operation[] = [];
    filteredOperations: Operation[] = [];
    pagedOperations: Operation[] = [];
    comptes: Compte[] = [];
    paysList: string[] = [];
    codeProprietaireList: string[] = [];
    banqueList: string[] = [];
    serviceList: string[] = [];
    statutList: string[] = [];
    
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;

    isLoading = false;
    isAdding = false;
    isExporting = false;
    showAddForm = false;
    showEditForm = false;

    addForm: FormGroup;
    editForm: FormGroup;
    filterForm: FormGroup;

    editingOperation: Operation | null = null;

    typeOperations = Object.values(TypeOperation);
    statutOperations = Object.values(StatutOperation);

    totalOperations = 0;
    totalMontant = 0;
    montantMoyen = 0;
    operationsValidees = 0;

    // Nouvelles propriétés pour les statistiques par type
    statsByType: any = {};
    isLoadingStats = false;
    
    // Filtres pour les statistiques
    selectedPays: string = '';
    selectedCompteNumero: string = '';
    selectedCompteId: number | undefined = undefined;
    
    // Pagination des cartes de statistiques
    statsCardsPerPage = 3;
    currentStatsPage = 1;
    totalStatsPages = 1;

    // Propriété pour les numéros de comptes (pour l'autocomplétion)
    get comptesNumeros(): string[] {
        return this.comptes.map(c => c.numeroCompte);
    }

    // Propriété pour les options de comptes avec ID et nom
    get compteOptions(): { value: number, label: string }[] {
        return this.comptes.map(c => ({
            value: c.id!,
            label: `${c.numeroCompte} - ${c.pays}`
        }));
    }

    filterTypeOptions = [
        { value: '', label: 'Tous' },
        { value: 'total_cashin', label: 'Total Cash-in' },
        { value: 'total_paiement', label: 'Total Paiement' },
        { value: 'approvisionnement', label: 'Approvisionnement' },
        { value: 'ajustement', label: 'Ajustement' },
        { value: 'compense', label: 'Compense' },
        { value: 'FRAIS_TRANSACTION', label: 'Frais Transaction' },
        { value: 'annulation_partenaire', label: 'Annulation Partenaire' },
        { value: 'annulation_bo', label: 'Annulation BO' },
        { value: 'transaction_cree', label: 'Transaction Créée' }
    ];

    private subscription = new Subscription();

    constructor(
        private operationService: OperationService,
        private compteService: CompteService,
        private fb: FormBuilder
    ) {
        this.addForm = this.fb.group({
            typeOperation: ['', [Validators.required]],
            montant: [0, [Validators.required]],
            pays: [{ value: '', disabled: true }],
            banque: [''],
            nomBordereau: [''],
            service: [''],
            compteId: ['', [Validators.required]],
            codeProprietaire: [{ value: '', disabled: true }],
            soldeAvant: [{ value: 0, disabled: true }],
            soldeApres: [{ value: 0, disabled: true }],
            dateOperation: [new Date().toISOString().split('T')[0], [Validators.required]]
        });

        this.editForm = this.fb.group({
            id: [null],
            typeOperation: ['', [Validators.required]],
            montant: [0, [Validators.required]],
            banque: [''],
            nomBordereau: [''],
            service: [''],
            dateOperation: ['', [Validators.required]]
        });

        this.filterForm = this.fb.group({
            typeOperation: [''],
            pays: [''],
            statut: [''],
            banque: [''],
            codeProprietaire: [''],
            service: [''],
            dateDebut: [''],
            dateFin: ['']
        });

        this.addForm.get('montant')?.valueChanges.subscribe(() => this.calculateSoldeApres());
        this.addForm.get('typeOperation')?.valueChanges.subscribe(() => this.calculateSoldeApres());
        this.addForm.get('compteId')?.valueChanges.subscribe(() => this.onCompteChange());
    }

    ngOnInit() {
        this.loadOperations();
        this.loadComptes();
        this.loadPaysList();
        this.loadCodeProprietaireListFromBackend();
        this.loadBanqueListFromBackend();
        this.loadServiceListFromBackend();
        this.loadStatsByType();
        this.initializeStatutList();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadOperations() {
        this.isLoading = true;
        this.operationService.getAllOperations().subscribe({
            next: (data) => {
                this.operations = data.sort((a, b) => 
                    new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime()
                );
                this.filteredOperations = [...this.operations];
                this.paysList = [...new Set(data.map(op => op.pays))].sort();
                this.applyFilters();
                this.calculateStats();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur de chargement des opérations', err);
                this.isLoading = false;
            }
        });
    }

    loadComptes() {
        this.compteService.getAllComptes().subscribe(data => this.comptes = data);
    }

    loadPaysList() {
        this.paysList = [...new Set(this.operations.map(op => op.pays))].sort();
    }

    loadCodeProprietaireList() {
        this.codeProprietaireList = [...new Set(this.operations.map(op => op.codeProprietaire).filter(code => code !== undefined))] as string[];
    }

    loadBanqueList() {
        this.banqueList = [...new Set(this.operations.map(op => op.banque).filter(banque => banque !== undefined))] as string[];
    }

    loadServiceList() {
        this.serviceList = [...new Set(this.operations.map(op => op.service).filter(service => service !== undefined))] as string[];
    }

    loadCodeProprietaireListFromBackend() {
        this.subscription.add(
            this.operationService.getDistinctCodeProprietaire().subscribe({
                next: (codes: string[]) => {
                    this.codeProprietaireList = codes;
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des codes propriétaires:', error);
                }
            })
        );
    }
    
    loadBanqueListFromBackend() {
        this.subscription.add(
            this.operationService.getDistinctBanque().subscribe({
                next: (banques: string[]) => {
                    this.banqueList = banques;
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des banques:', error);
                }
            })
        );
    }

    loadServiceListFromBackend() {
        this.subscription.add(
            this.operationService.getDistinctService().subscribe({
                next: (services: string[]) => {
                    this.serviceList = services;
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des services:', error);
                }
            })
        );
    }

    loadStatsByType() {
        this.isLoadingStats = true;
        this.currentStatsPage = 1;
        this.subscription.add(
            this.operationService.getOperationsStatsByTypeWithFilters(this.selectedPays, this.selectedCompteId).subscribe({
                next: (stats) => {
                    this.statsByType = stats;
                    this.isLoadingStats = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des statistiques par type:', error);
                    this.isLoadingStats = false;
                }
            })
        );
    }

    applyStatsFilters() {
        if (this.selectedCompteNumero) {
            const compte = this.comptes.find(c => c.numeroCompte === this.selectedCompteNumero);
            this.selectedCompteId = compte ? compte.id : undefined;
        } else {
            this.selectedCompteId = undefined;
        }
        this.loadStatsByType();
    }

    clearStatsFilters() {
        this.selectedPays = '';
        this.selectedCompteId = undefined;
        this.loadStatsByType();
    }

    onCompteChange() {
        const compteNumero = this.addForm.get('compteId')?.value;
        console.log('onCompteChange appelé avec:', compteNumero);
        console.log('Comptes disponibles:', this.comptes);
        
        const selectedCompte = this.comptes.find(c => c.numeroCompte === compteNumero);
        console.log('Compte sélectionné:', selectedCompte);
        
        if (selectedCompte) {
            this.addForm.patchValue({
                pays: selectedCompte.pays,
                codeProprietaire: selectedCompte.numeroCompte,
                soldeAvant: selectedCompte.solde
            });
            this.calculateSoldeApres();
            console.log('Champs mis à jour avec:', {
                pays: selectedCompte.pays,
                codeProprietaire: selectedCompte.numeroCompte,
                soldeAvant: selectedCompte.solde
            });
        }
    }

    calculateSoldeApres() {
        const soldeAvant = this.addForm.get('soldeAvant')?.value || 0;
        const montant = this.addForm.get('montant')?.value || 0;
        const typeOperation = this.addForm.get('typeOperation')?.value;
        let soldeApres = soldeAvant;

        // Logique inversée : total_cashin débite, total_paiement crédite
        if (typeOperation === 'total_cashin') {
            soldeApres = soldeAvant - montant;
        } else if (typeOperation === 'total_paiement') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'approvisionnement') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'ajustement') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'annulation_partenaire' || typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            soldeApres = soldeAvant - montant;
        } else {
            soldeApres = soldeAvant - montant;
        }

        this.addForm.patchValue({ soldeApres });
    }

    addOperation() {
        if (this.addForm.invalid) return;
        this.isAdding = true;

        const formData = this.addForm.getRawValue();
        
        // Find the compte ID from the account number
        const selectedCompte = this.comptes.find(c => c.numeroCompte === formData.compteId);
        if (!selectedCompte) {
            console.error('Compte non trouvé:', formData.compteId);
            this.isAdding = false;
            return;
        }

        // Règle métier pour annulation BO
        if (formData.typeOperation === 'annulation_bo') {
          if (formData.service && formData.service.toLowerCase().includes('cashin')) {
            // Montant positif (crédit)
            formData.montant = Math.abs(formData.montant);
          } else if (formData.service && formData.service.toLowerCase().includes('paiement')) {
            // Montant négatif (débit)
            formData.montant = -Math.abs(formData.montant);
          }
        }

        const newOperation = {
            compteId: selectedCompte.id!,
            typeOperation: formData.typeOperation,
            montant: formData.montant,
            banque: formData.banque,
            nomBordereau: formData.nomBordereau,
            service: formData.service,
            dateOperation: formData.dateOperation
        };

        this.operationService.createOperation(newOperation).subscribe({
            next: (op) => {
                this.loadOperations();
                this.loadComptes();
                this.cancelAdd();
            },
            error: (err) => console.error('Erreur ajout opération', err)
        }).add(() => this.isAdding = false);
    }

    cancelAdd() {
        this.showAddForm = false;
        this.addForm.reset();
    }

    editOperation(operation: Operation) {
        this.editingOperation = { ...operation };
        this.editForm.patchValue(this.editingOperation);
        this.showEditForm = true;
        this.showAddForm = false;
    }

    cancelEdit() {
        this.showEditForm = false;
        this.editingOperation = null;
        this.editForm.reset();
    }

    updateOperation() {
        if (!this.editForm.valid || !this.editingOperation?.id) return;
        
        const updateRequest: OperationUpdateRequest = {
            typeOperation: this.editForm.value.typeOperation,
            montant: this.editForm.value.montant,
            banque: this.editForm.value.banque,
            nomBordereau: this.editForm.value.nomBordereau,
            service: this.editForm.value.service,
            dateOperation: this.editForm.value.dateOperation
        };

        // Règle métier pour annulation BO lors de la modification
        if (updateRequest.typeOperation === 'annulation_bo') {
          if (updateRequest.service && updateRequest.service.toLowerCase().includes('cashin')) {
            updateRequest.montant = Math.abs(updateRequest.montant ?? 0);
          } else if (updateRequest.service && updateRequest.service.toLowerCase().includes('paiement')) {
            updateRequest.montant = -Math.abs(updateRequest.montant ?? 0);
          }
        }

        this.operationService.updateOperation(this.editingOperation.id, updateRequest).subscribe({
            next: () => {
                this.loadOperations();
                this.loadComptes();
                this.cancelEdit();
            },
            error: (err) => console.error('Erreur mise à jour opération', err)
        });
    }

    deleteOperation(id: number) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) {
            this.operationService.deleteOperation(id).subscribe({
                next: () => {
                    this.loadOperations();
                },
                error: (err) => {
                    console.error('Erreur lors de la suppression', err);
                }
            });
        }
    }

    validateOperation(id: number) {
        this.operationService.updateOperationStatut(id, 'Validée').subscribe({
            next: (success) => {
                if (success) {
                    this.loadOperations();
                } else {
                    alert('Impossible de valider cette opération. Le solde du compte est insuffisant.');
                }
            },
            error: (err) => {
                console.error('Erreur lors de la validation', err);
                alert('Erreur lors de la validation de l\'opération');
            }
        });
    }

    annulerOperation(id: number) {
        if (confirm('Voulez-vous vraiment annuler cette opération ?')) {
            this.operationService.updateOperationStatut(id, 'Annulée').subscribe({
                next: (success) => {
                    if (success) {
                        this.loadOperations();
                        alert('Opération annulée avec succès.');
                    } else {
                        alert('Impossible d\'annuler cette opération.');
                    }
                },
                error: (err) => {
                    console.error('Erreur lors de l\'annulation', err);
                    alert('Erreur lors de l\'annulation de l\'opération');
                }
            });
        }
    }

    applyFilters() {
        const filters = this.filterForm.value;
        
        this.filteredOperations = this.operations.filter(op => {
            return (!filters.typeOperation || op.typeOperation === filters.typeOperation) &&
                   (!filters.pays || op.pays === filters.pays) &&
                   (!filters.statut || op.statut === filters.statut) &&
                   (!filters.banque || op.banque?.toLowerCase().includes(filters.banque.toLowerCase())) &&
                   (!filters.codeProprietaire || op.codeProprietaire.toLowerCase().includes(filters.codeProprietaire.toLowerCase())) &&
                   (!filters.service || op.service?.toLowerCase().includes(filters.service.toLowerCase())) &&
                   (!filters.dateDebut || new Date(op.dateOperation) >= new Date(filters.dateDebut)) &&
                   (!filters.dateFin || new Date(op.dateOperation) <= new Date(filters.dateFin));
        }).sort((a, b) => 
            new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime()
        );
        
        this.currentPage = 1;
        this.updatePagedOperations();
        this.calculateStats();
    }

    clearFilters() {
        this.filterForm.reset({ typeOperation: '', pays: '', statut: '', banque: '', codeProprietaire: '', service: '', dateDebut: '', dateFin: '' });
        this.applyFilters();
    }

    updatePagedOperations() {
        this.totalPages = Math.ceil(this.filteredOperations.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.pagedOperations = this.filteredOperations.slice(startIndex, startIndex + this.pageSize);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagedOperations();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagedOperations();
        }
    }

    calculateStats() {
        this.totalOperations = this.filteredOperations.length;
        this.totalMontant = this.filteredOperations.reduce((sum, op) => sum + op.montant, 0);
        this.montantMoyen = this.totalOperations > 0 ? this.totalMontant / this.totalOperations : 0;
        this.operationsValidees = this.filteredOperations.filter(op => op.statut === 'Validée').length;
    }

    getOperationTypes(): string[] {
        // Récupérer tous les types d'opération disponibles
        const allTypes = Object.values(TypeOperation);
        
        // Si nous avons des statistiques, retourner les types qui ont des données
        if (this.statsByType && Object.keys(this.statsByType).length > 0) {
            return Object.keys(this.statsByType);
        }
        
        // Sinon, retourner tous les types disponibles
        return allTypes;
    }

    getPagedOperationTypes(): string[] {
        const allTypes = this.getOperationTypes();
        this.totalStatsPages = Math.ceil(allTypes.length / this.statsCardsPerPage);
        const startIndex = (this.currentStatsPage - 1) * this.statsCardsPerPage;
        const endIndex = startIndex + this.statsCardsPerPage;
        return allTypes.slice(startIndex, endIndex);
    }

    nextStatsPage() {
        if (this.currentStatsPage < this.totalStatsPages) {
            this.currentStatsPage++;
        }
    }

    prevStatsPage() {
        if (this.currentStatsPage > 1) {
            this.currentStatsPage--;
        }
    }

    goToStatsPage(page: number) {
        if (page >= 1 && page <= this.totalStatsPages) {
            this.currentStatsPage = page;
        }
    }

    getTypeDisplayName(type: string): string {
        const typeNames: { [key: string]: string } = {
            'total_cashin': 'Total Cash-in',
            'total_paiement': 'Total Paiement',
            'approvisionnement': 'Approvisionnement',
            'ajustement': 'Ajustement',
            'compense': 'Compense',
            'FRAIS_TRANSACTION': 'Frais Transaction',
            'annulation_partenaire': 'Annulation Partenaire',
            'annulation_bo': 'Annulation BO',
            'transaction_cree': 'Transaction Créée'
        };
        return typeNames[type] || type;
    }

    getTypeImpact(type: string): string {
        const impacts: { [key: string]: string } = {
            'total_cashin': 'Débite le compte',
            'total_paiement': 'Crédite le compte',
            'approvisionnement': 'Crédite le compte',
            'ajustement': 'Impact variable (+/-)',
            'compense': 'Débite le compte',
            'FRAIS_TRANSACTION': 'Débite le compte',
            'annulation_partenaire': 'Débite le compte',
            'annulation_bo': 'Débite le compte'
        };
        return impacts[type] || 'Impact standard';
    }

    async exportOperations() {
        this.isExporting = true;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Opérations');

        sheet.columns = [
            { header: 'Date', key: 'dateOperation', width: 20 },
            { header: 'Type', key: 'typeOperation', width: 20 },
            { header: 'Compte', key: 'codeProprietaire', width: 20 },
            { header: 'Service', key: 'service', width: 20 },
            { header: 'Débit', key: 'debit', width: 15 },
            { header: 'Crédit', key: 'credit', width: 15 },
            { header: 'Solde Avant', key: 'soldeAvant', width: 18 },
            { header: 'Solde Après', key: 'soldeApres', width: 18 },
            { header: 'Statut', key: 'statut', width: 15 },
            { header: 'Pays', key: 'pays', width: 10 },
            { header: 'Banque', key: 'banque', width: 15 },
            { header: 'Bordereau', key: 'nomBordereau', width: 25 },
        ];

        let totalDebit = 0;
        let totalCredit = 0;
        let soldeOuverture = null;
        let soldeCloture = null;
        const totauxParType: { [type: string]: { debit: number, credit: number } } = {};

        this.filteredOperations.forEach((op, idx) => {
            const { debit, credit } = this.getDebitCreditForOperation(op);
            sheet.addRow({
                dateOperation: op.dateOperation,
                typeOperation: op.typeOperation,
                codeProprietaire: op.codeProprietaire,
                service: op.service,
                debit: debit ? debit : '',
                credit: credit ? credit : '',
                soldeAvant: op.soldeAvant,
                soldeApres: op.soldeApres,
                statut: op.statut,
                pays: op.pays,
                banque: op.banque,
                nomBordereau: op.nomBordereau
            });
            totalDebit += debit || 0;
            totalCredit += credit || 0;
            // Calcul du solde d'ouverture et de clôture
            if (idx === 0) soldeOuverture = op.soldeAvant;
            soldeCloture = op.soldeApres;
            // Totaux par type
            const type = op.typeOperation;
            if (!totauxParType[type]) totauxParType[type] = { debit: 0, credit: 0 };
            totauxParType[type].debit += debit || 0;
            totauxParType[type].credit += credit || 0;
        });

        // Laisser une ligne vide
        sheet.addRow([]);
        // Résumé
        sheet.addRow(['RÉSUMÉ']);
        sheet.addRow(['Total Débit', totalDebit]);
        sheet.addRow(['Total Crédit', totalCredit]);
        sheet.addRow(['Différence solde ouverture/clôture', soldeCloture !== null && soldeOuverture !== null ? (soldeCloture - soldeOuverture) : '']);
        sheet.addRow([]);
        sheet.addRow(['Totaux par type']);
        Object.keys(totauxParType).forEach(type => {
            sheet.addRow([
                type,
                'Débit', totauxParType[type].debit,
                'Crédit', totauxParType[type].credit
            ]);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `operations_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.isExporting = false;
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagedOperations();
        }
    }

    getVisiblePages(): number[] {
        const maxVisible = 5;
        const pages: number[] = [];
        
        if (this.totalPages <= maxVisible) {
            // Si moins de 5 pages, afficher toutes
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Si plus de 5 pages, afficher intelligemment
            let start = Math.max(1, this.currentPage - 2);
            let end = Math.min(this.totalPages, start + maxVisible - 1);
            
            // Ajuster si on est près de la fin
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    getVisibleStatsPages(): number[] {
        const maxVisible = 5;
        const pages: number[] = [];
        
        if (this.totalStatsPages <= maxVisible) {
            // Si moins de 5 pages, afficher toutes
            for (let i = 1; i <= this.totalStatsPages; i++) {
                pages.push(i);
            }
        } else {
            // Si plus de 5 pages, afficher intelligemment
            let start = Math.max(1, this.currentStatsPage - 2);
            let end = Math.min(this.totalStatsPages, start + maxVisible - 1);
            
            // Ajuster si on est près de la fin
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    initializeStatutList() {
        // Initialiser avec les statuts standards
        this.statutList = ['Validée', 'En attente', 'Rejetée', 'Annulée', 'En cours'];
    }

    // Détermine si une opération est un débit
    isDebitOperation(type: string): boolean {
        return [
            'total_paiement',
            'ajustement',
            'compense',
            'FRAIS_TRANSACTION',
            'annulation_partenaire',
            'annulation_bo',
            'transaction_cree'
        ].includes(type);
    }

    // Détermine si une opération est un crédit
    isCreditOperation(type: string): boolean {
        return [
            'total_cashin',
            'approvisionnement'
        ].includes(type);
    }

    // Calcule le débit et le crédit selon la logique métier
    getDebitCreditForOperation(op: Operation): { debit: number, credit: number } {
        const montant = Number(op.montant) || 0;
        const frais = Number((op as any).frais) || 0;
        const type = (op.typeOperation || '').toLowerCase().replace(/\s/g, '');
        const service = (op.service || '').toLowerCase().replace(/\s/g, '');

        let debit = 0;
        let credit = 0;

        // Cas spécial : frais liés à une annulation
        if (type === 'frais_transaction' && op.parentOperationId) {
            const parent = this.operations.find(o => o.id === op.parentOperationId);
            if (parent && (parent.typeOperation || '').toLowerCase().replace(/\s/g, '').startsWith('annulation_')) {
                debit = 0;
                credit = montant;
                return { debit, credit };
            }
        }

        // Gestion des opérations d'annulation (impact inverse)
        if (type.startsWith('annulation_')) {
            const typeOrigine = type.substring(11); // Enlever 'annulation_'
            
            switch (typeOrigine) {
                case 'total_cashin':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant + frais;
                    debit = 0;
                    break;
                case 'total_paiement':
                    // L'opération d'origine était en crédit, l'annulation est en débit
                    debit = montant;
                    credit = frais;
                    break;
                case 'approvisionnement':
                    // L'opération d'origine était en crédit, l'annulation est en débit
                    debit = montant;
                    credit = 0;
                    break;
                case 'ajustement':
                    // L'opération d'origine dépendait du signe, l'annulation inverse
                    if (montant >= 0) {
                        debit = montant;
                        credit = 0;
                    } else {
                        debit = 0;
                        credit = -montant;
                    }
                    break;
                case 'compense':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
                    break;
                case 'frais_transaction':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
                    break;
                case 'transaction_cree':
                    if (service.includes('cashin')) {
                        // L'opération d'origine était en débit, l'annulation est en crédit
                        credit = montant + frais;
                        debit = 0;
                    } else if (service.includes('paiement')) {
                        // L'opération d'origine était en crédit, l'annulation est en débit
                        debit = montant;
                        credit = frais;
                    }
                    break;
                case 'bo':
                    if (service.includes('cashin')) {
                        debit = 0;
                        credit = montant;
                    } else if (service.includes('paiement')) {
                        debit = montant;
                        credit = 0;
                    } else {
                        debit = 0;
                        credit = 0;
                    }
                    credit += frais;
                    break;
                case 'partenaire':
                    debit = 0;
                    credit = 0;
                    break;
                default:
                    debit = 0;
                    credit = 0;
            }
            return { debit, credit };
        }

        // Gestion des opérations normales (non-annulation)
        switch (type) {
            case 'total_cashin':
                debit = montant + frais;
                credit = 0;
                break;
            case 'total_paiement':
                debit = frais;
                credit = montant;
                break;
            case 'approvisionnement':
                debit = 0;
                credit = montant;
                break;
            case 'ajustement':
                if (montant >= 0) {
                    debit = 0;
                    credit = montant;
                } else {
                    debit = -montant;
                    credit = 0;
                }
                break;
            case 'compense':
            case 'frais_transaction':
                debit = montant;
                credit = 0;
                break;
            case 'transaction_cree':
                if (service.includes('cashin')) {
                    debit = montant + frais;
                    credit = 0;
                } else if (service.includes('paiement')) {
                    debit = frais;
                    credit = montant;
                }
                break;
            default:
                debit = 0;
                credit = 0;
        }

        return { debit, credit };
    }
} 