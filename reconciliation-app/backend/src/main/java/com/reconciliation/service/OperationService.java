package com.reconciliation.service;

import com.reconciliation.entity.OperationEntity;
import com.reconciliation.entity.CompteEntity;
import com.reconciliation.model.Operation;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.repository.CompteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.context.annotation.Lazy;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;

import com.reconciliation.dto.OperationUpdateRequest;
import com.reconciliation.dto.OperationCreateRequest;
import com.reconciliation.service.FraisTransactionService;
import com.reconciliation.entity.FraisTransactionEntity;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.entity.AgencySummaryEntity;

@Service
public class OperationService {
    
    @Autowired
    private OperationRepository operationRepository;
    
    @Autowired
    private CompteRepository compteRepository;
    
    @Autowired
    private FraisTransactionService fraisTransactionService;
    
    @Autowired
    private AgencySummaryRepository agencySummaryRepository;
    
    @Autowired
    @Lazy
    private OperationService self; // Self-injection pour la gestion transactionnelle
    
    public List<Operation> getAllOperations() {
        return operationRepository.findAllOrderByDateOperationDesc().stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public Optional<Operation> getOperationById(Long id) {
        return operationRepository.findById(id)
                .map(this::convertToModel);
    }
    
    public List<Operation> getOperationsByCompteId(Long compteId) {
        return operationRepository.findByCompteIdOrderByDateOperationDesc(compteId).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByCompte(String numeroCompte, LocalDateTime dateDebut, LocalDateTime dateFin, String typeOperation) {
        return operationRepository.findByCompteNumeroCompteAndFiltersOrderByDateOperationDesc(
                numeroCompte, dateDebut, dateFin, typeOperation).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByCompteForReleve(String numeroCompte, LocalDateTime dateDebut, LocalDateTime dateFin, String typeOperation) {
        return operationRepository.findByCompteNumeroCompteAndFiltersOrderByDateOperationAsc(
                numeroCompte, dateDebut, dateFin, typeOperation).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByType(String typeOperation) {
        return operationRepository.findByTypeOperationOrderByDateOperationDesc(typeOperation).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByPays(String pays) {
        return operationRepository.findByPaysOrderByDateOperationDesc(pays).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByStatut(String statut) {
        return operationRepository.findByStatutOrderByDateOperationDesc(statut).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByBanque(String banque) {
        return operationRepository.findByBanqueOrderByDateOperationDesc(banque).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByDateRange(LocalDateTime dateDebut, LocalDateTime dateFin) {
        return operationRepository.findByDateOperationBetween(dateDebut, dateFin).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByMontantSuperieurA(Double montantMin) {
        return operationRepository.findByMontantSuperieurAOrderByDateOperationDesc(montantMin).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByCodeProprietaire(String codeProprietaire) {
        return operationRepository.findByCodeProprietaireOrderByDateOperationDesc(codeProprietaire).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByNomBordereau(String nomBordereau) {
        return operationRepository.findByNomBordereauContainingOrderByDateOperationDesc(nomBordereau).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> getOperationsByService(String service) {
        return operationRepository.findByServiceOrderByDateOperationDesc(service).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Operation> filterOperations(Long compteId, String typeOperation, String pays, String statut, 
                                          String banque, String codeProprietaire, String service, String nomBordereau, 
                                          LocalDateTime dateDebut, LocalDateTime dateFin) {
        return operationRepository.findFilteredOperationsOrderByDateOperationDesc(
                compteId, typeOperation, pays, statut, banque, codeProprietaire, service, nomBordereau, dateDebut, dateFin)
                .stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<String> getDistinctCodeProprietaire() {
        return operationRepository.findDistinctCodeProprietaire();
    }
    
    public List<String> getDistinctBanque() {
        return operationRepository.findDistinctBanque();
    }
    
    public List<String> getDistinctService() {
        return operationRepository.findDistinctService();
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Operation createAdjustment(Long compteId, double amount, String reason) {
        OperationCreateRequest adjustmentRequest = new OperationCreateRequest();
        adjustmentRequest.setCompteId(compteId);
        adjustmentRequest.setMontant(amount);
        adjustmentRequest.setTypeOperation("ajustement_solde");
        adjustmentRequest.setNomBordereau(reason);
        adjustmentRequest.setBanque("SYSTEM");
        
        return createOperation(adjustmentRequest);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Operation createOperationForSummary(OperationCreateRequest request) {
        // Tentative de création de l'opération
        // Si le solde est insuffisant, l'erreur sera relancée sans ajustement automatique
        return createOperation(request);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Operation createOperation(OperationCreateRequest request) {
        CompteEntity compte = compteRepository.findById(request.getCompteId())
                .orElseThrow(() -> new IllegalArgumentException("Compte non trouvé avec ID: " + request.getCompteId()));

        OperationEntity entity = new OperationEntity();
        entity.setCompte(compte);
        entity.setTypeOperation(request.getTypeOperation());
        entity.setMontant(request.getMontant());
        entity.setBanque(request.getBanque());
        entity.setNomBordereau(request.getNomBordereau());
        entity.setService(request.getService());
        // Date de l'opération : utiliser celle du DTO si fournie, sinon maintenant
        if (request.getDateOperation() != null && !request.getDateOperation().isEmpty()) {
            try {
                System.out.println("DEBUG: Parsing date: " + request.getDateOperation());
                // Si la date fournie ne contient pas d'heure, on ajoute l'heure courante
                if (request.getDateOperation().length() == 10) { // format yyyy-MM-dd
                    java.time.LocalDate date = java.time.LocalDate.parse(request.getDateOperation());
                    java.time.LocalTime now = java.time.LocalTime.now();
                    entity.setDateOperation(date.atTime(now));
                } else {
                    entity.setDateOperation(java.time.LocalDateTime.parse(request.getDateOperation()));
                }
                System.out.println("DEBUG: Date parsée: " + entity.getDateOperation());
            } catch (Exception e) {
                System.out.println("DEBUG: Erreur parsing date: " + e.getMessage());
                entity.setDateOperation(LocalDateTime.now()); // fallback si parsing échoue
            }
        } else {
            entity.setDateOperation(LocalDateTime.now());
        }
        entity.setPays(compte.getPays());
        entity.setCodeProprietaire(compte.getNumeroCompte());
        entity.setRecordCount(request.getRecordCount());
        entity.setParentOperationId(request.getParentOperationId()); // Ajouter cette ligne

        double soldeAvant = compte.getSolde();
        entity.setSoldeAvant(soldeAvant);
        double impact = calculateImpact(entity.getTypeOperation(), entity.getMontant(), entity.getService());
        double soldeApres = soldeAvant + impact;

        // Si le solde est insuffisant, statut 'En attente', pas d'impact sur le compte
        if (soldeAvant + impact < 0 && !isAjustementOperation(entity.getTypeOperation())) {
            entity.setStatut("En attente");
            entity.setSoldeApres(soldeAvant); // Pas d'impact
            // Ne pas modifier le solde du compte
        } else {
            entity.setStatut("Validée");
            entity.setSoldeApres(soldeApres);
            compte.setSolde(soldeApres);
            compte.setDateDerniereMaj(LocalDateTime.now());
            compteRepository.save(compte);
        }

        OperationEntity savedEntity = operationRepository.save(entity);
        
        // Créer automatiquement les frais de transaction si applicable
        // Pour toutes les opérations qui ont un service défini et qui ne sont pas déjà des frais
        if (entity.getService() != null && !"FRAIS_TRANSACTION".equals(entity.getTypeOperation())) {
            createFraisTransactionAutomatique(savedEntity);
        }
        
        return convertToModel(savedEntity);
    }

    @Transactional
    public Operation updateOperation(Long id, OperationUpdateRequest request) {
        OperationEntity operationToUpdate = operationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opération non trouvée avec ID: " + id));

        CompteEntity compte = operationToUpdate.getCompte();
        if (compte == null) {
            throw new IllegalStateException("L'opération à modifier n'est pas associée à un compte.");
        }

        double oldImpact = operationToUpdate.getSoldeApres() - operationToUpdate.getSoldeAvant();
        
        // Mettre à jour les champs modifiables
        operationToUpdate.setTypeOperation(request.getTypeOperation());
        operationToUpdate.setMontant(request.getMontant());
        operationToUpdate.setBanque(request.getBanque());
        operationToUpdate.setNomBordereau(request.getNomBordereau());
        operationToUpdate.setService(request.getService());
        
        // Mettre à jour la date d'opération si fournie
        if (request.getDateOperation() != null && !request.getDateOperation().isEmpty()) {
            try {
                operationToUpdate.setDateOperation(java.time.LocalDate.parse(request.getDateOperation()).atStartOfDay());
            } catch (Exception e) {
                System.out.println("DEBUG: Erreur parsing date de mise à jour: " + e.getMessage());
                // Ne pas changer la date si le parsing échoue
            }
        }

        // Recalculer le nouvel impact et le solde après
        double newImpact = calculateImpact(request.getTypeOperation(), request.getMontant(), request.getService());
        operationToUpdate.setSoldeApres(operationToUpdate.getSoldeAvant() + newImpact);

        double impactDifference = newImpact - oldImpact;

        // Mettre à jour les opérations suivantes
        List<OperationEntity> subsequentOps = operationRepository
            .findByCompteIdAndDateOperationAfterOrderByDateOperationAsc(compte.getId(), operationToUpdate.getDateOperation());
            
        for (OperationEntity op : subsequentOps) {
            op.setSoldeAvant(op.getSoldeAvant() + impactDifference);
            op.setSoldeApres(op.getSoldeApres() + impactDifference);
        }
        operationRepository.saveAll(subsequentOps);
        
        // Mettre à jour le solde du compte
        compte.setSolde(compte.getSolde() + impactDifference);
        
        if (compte.getSolde() < 0) {
            throw new IllegalStateException("La modification résulte en un solde de compte négatif.");
        }
        
        compteRepository.save(compte);
        OperationEntity savedEntity = operationRepository.save(operationToUpdate);
        
        return convertToModel(savedEntity);
    }
    
    @Transactional
    public boolean deleteOperation(Long id) {
        Optional<OperationEntity> optionalOperation = operationRepository.findById(id);
        if (optionalOperation.isPresent()) {
            OperationEntity operation = optionalOperation.get();
            if (operation.getCompte() != null) {
                CompteEntity compte = operation.getCompte();
                double soldeAvant = operation.getSoldeAvant();
                // 1. Supprimer l'opération
                operationRepository.deleteById(id);
                // 2. Recalculer les soldes de toutes les opérations restantes du compte, dans l'ordre chronologique
                List<OperationEntity> allOps = operationRepository.findByCompteIdOrderByDateOperationAsc(compte.getId());
                double soldeCourant = 0.0;
                for (OperationEntity op : allOps) {
                    op.setSoldeAvant(soldeCourant);
                    double impact = calculateImpact(op.getTypeOperation(), op.getMontant(), op.getService());
                    soldeCourant += impact;
                    op.setSoldeApres(soldeCourant);
                }
                if (!allOps.isEmpty()) {
                    operationRepository.saveAll(allOps);
                    compte.setSolde(allOps.get(allOps.size() - 1).getSoldeApres());
                } else {
                    compte.setSolde(0.0);
                }
                compte.setDateDerniereMaj(java.time.LocalDateTime.now());
                compteRepository.save(compte);
            } else {
                // Si pas de compte associé, juste supprimer
            operationRepository.deleteById(id);
            }
            return true;
        }
        return false;
    }
    
    @Transactional
    public boolean updateOperationStatut(Long id, String nouveauStatut) {
        Optional<OperationEntity> optionalOperation = operationRepository.findById(id);
        if (optionalOperation.isPresent()) {
            OperationEntity operation = optionalOperation.get();
            if ("Validée".equals(nouveauStatut) && "En attente".equals(operation.getStatut())) {
                CompteEntity compte = operation.getCompte();
                
                // Récupérer le solde réel actuel du compte
                double soldeReelActuel = compte.getSolde();
                double impact = calculateImpact(operation.getTypeOperation(), operation.getMontant(), operation.getService());
                
                if (soldeReelActuel + impact < 0 && !isAjustementOperation(operation.getTypeOperation())) {
                    // Toujours insuffisant
                    return false;
                }
                
                // Mettre à jour le solde avant avec le solde réel actuel
                operation.setSoldeAvant(soldeReelActuel);
                operation.setSoldeApres(soldeReelActuel + impact);
                
                // Mettre à jour le solde du compte
                compte.setSolde(soldeReelActuel + impact);
                compte.setDateDerniereMaj(LocalDateTime.now());
                compteRepository.save(compte);
                
                // Mettre à jour les soldes des opérations suivantes
                List<OperationEntity> operationsSuivantes = operationRepository
                    .findByCompteIdAndDateOperationAfterOrderByDateOperationAsc(compte.getId(), operation.getDateOperation());
                
                double soldeCourant = soldeReelActuel + impact;
                for (OperationEntity opSuivante : operationsSuivantes) {
                    opSuivante.setSoldeAvant(soldeCourant);
                    double impactOpSuivante = calculateImpact(opSuivante.getTypeOperation(), opSuivante.getMontant(), opSuivante.getService());
                    soldeCourant += impactOpSuivante;
                    opSuivante.setSoldeApres(soldeCourant);
                }
                
                if (!operationsSuivantes.isEmpty()) {
                    operationRepository.saveAll(operationsSuivantes);
                }
            }
            
            operation.setStatut(nouveauStatut);
            operationRepository.save(operation);

            // Suppression dans agency_summary si statut Annulée ou Rejetée ET type concerné
            if (("Annulée".equals(nouveauStatut) || "Rejetée".equals(nouveauStatut)) &&
                ("total_cashin".equals(operation.getTypeOperation()) || "total_paiement".equals(operation.getTypeOperation()))) {
                String date = operation.getDateOperation().toLocalDate().toString();
                String agency = operation.getCodeProprietaire();
                String service = operation.getService();
                agencySummaryRepository.deleteByDateAndAgencyAndService(date, agency, service);
            }

            // Création de l'opération d'annulation si le statut devient "Annulée"
            if ("Annulée".equals(nouveauStatut)) {
                // 1. Créer l'opération d'annulation pour l'opération nominale
                OperationCreateRequest annulationRequest = new OperationCreateRequest();
                annulationRequest.setCompteId(operation.getCompte().getId());
                annulationRequest.setTypeOperation("annulation_" + operation.getTypeOperation());
                annulationRequest.setMontant(operation.getMontant());
                annulationRequest.setBanque(operation.getBanque());
                annulationRequest.setNomBordereau("ANNULATION_" + (operation.getNomBordereau() != null ? operation.getNomBordereau() : ""));
                annulationRequest.setService(operation.getService());
                annulationRequest.setDateOperation(java.time.LocalDateTime.now().toString());
                annulationRequest.setRecordCount(operation.getRecordCount());
                annulationRequest.setParentOperationId(operation.getId());
                // Création de l'opération d'annulation avec impact inverse (sans frais automatiques)
                this.createOperationWithoutFrais(annulationRequest);
                
                // 2. Annuler automatiquement les frais liés à cette opération
                List<OperationEntity> fraisOperations = operationRepository.findFraisByParentOperationId(operation.getId());
                System.out.println("DEBUG: 🔍 Recherche des frais pour l'opération ID: " + operation.getId());
                System.out.println("DEBUG: 📊 Nombre de frais trouvés: " + fraisOperations.size());
                
                // Si aucun frais trouvé par parentOperationId, essayer de les trouver par bordereau
                if (fraisOperations.isEmpty()) {
                    System.out.println("DEBUG: 🔍 Aucun frais trouvé par parentOperationId, recherche par bordereau...");
                    String bordereauPattern = "FEES_SUMMARY_" + operation.getDateOperation().toLocalDate().toString() + "_" + operation.getCodeProprietaire();
                    List<OperationEntity> fraisByBordereau = operationRepository.findByNomBordereauContaining(bordereauPattern).stream()
                        .filter(op -> "FRAIS_TRANSACTION".equals(op.getTypeOperation()))
                        .collect(Collectors.toList());
                    System.out.println("DEBUG: 📊 Nombre de frais trouvés par bordereau: " + fraisByBordereau.size());
                    fraisOperations = fraisByBordereau;
                }
                
                for (OperationEntity fraisOp : fraisOperations) {
                    System.out.println("DEBUG: 💰 Traitement du frais ID: " + fraisOp.getId() + ", Statut: " + fraisOp.getStatut() + ", ParentOperationId: " + fraisOp.getParentOperationId());
                    if (!"Annulée".equals(fraisOp.getStatut())) {
                        System.out.println("DEBUG: ✅ Annulation du frais ID: " + fraisOp.getId());
                        // Créer une opération d'annulation pour chaque frais (sans frais automatiques)
                        OperationCreateRequest annulationFraisRequest = new OperationCreateRequest();
                        annulationFraisRequest.setCompteId(fraisOp.getCompte().getId());
                        annulationFraisRequest.setTypeOperation("annulation_FRAIS_TRANSACTION");
                        annulationFraisRequest.setMontant(fraisOp.getMontant());
                        annulationFraisRequest.setBanque(fraisOp.getBanque());
                        annulationFraisRequest.setNomBordereau("ANNULATION_FRAIS_" + (fraisOp.getNomBordereau() != null ? fraisOp.getNomBordereau() : ""));
                        annulationFraisRequest.setService(fraisOp.getService());
                        annulationFraisRequest.setDateOperation(java.time.LocalDateTime.now().toString());
                        annulationFraisRequest.setRecordCount(fraisOp.getRecordCount());
                        annulationFraisRequest.setParentOperationId(fraisOp.getId());
                        // Création de l'opération d'annulation des frais (sans frais automatiques)
                        this.createOperationWithoutFrais(annulationFraisRequest);
                        
                        // Marquer le frais comme annulé
                        fraisOp.setStatut("Annulée");
                        operationRepository.save(fraisOp);
                        System.out.println("DEBUG: ✅ Frais ID: " + fraisOp.getId() + " marqué comme annulé");
                    } else {
                        System.out.println("DEBUG: ⚠️ Frais ID: " + fraisOp.getId() + " déjà annulé, ignoré");
                    }
                }
            }
            return true;
        }
        return false;
    }
    
    /**
     * Détermine si une opération est un débit (diminue le solde)
     */
    private boolean isDebitOperation(String typeOperation) {
        return "total_cashin".equals(typeOperation) || 
               "compense".equals(typeOperation) || 
               "FRAIS_TRANSACTION".equals(typeOperation) ||
               "annulation_partenaire".equals(typeOperation) ||
               "annulation_bo".equals(typeOperation) ||
               "transaction_cree".equals(typeOperation);
    }
    
    /**
     * Détermine si une opération est un crédit (augmente le solde)
     */
    private boolean isCreditOperation(String typeOperation) {
        return "total_paiement".equals(typeOperation) || 
               "approvisionnement".equals(typeOperation);
    }
    
    /**
     * Détermine si une opération est un ajustement (peut être positif ou négatif)
     */
    private boolean isAjustementOperation(String typeOperation) {
        return "ajustement".equals(typeOperation);
    }
    
    private double calculateImpact(String typeOperation, double montant, String service) {
        // Traitement des opérations d'annulation
        if (typeOperation.startsWith("annulation_")) {
            // Extraire le type d'origine (enlever le préfixe 'annulation_')
            String typeOrigine = typeOperation.substring(11); // 'annulation_'.length = 11
            
            // Calculer l'impact inverse de l'opération d'origine
            if ("FRAIS_TRANSACTION".equals(typeOrigine)) {
                // Les frais sont toujours des débits, donc l'annulation des frais est un crédit
                return montant; // crédit (positif)
            } else if ("total_paiement".equals(typeOrigine)) {
                // total_paiement est un crédit, donc l'annulation est un débit
                return -montant; // débit (négatif)
            } else if ("total_cashin".equals(typeOrigine)) {
                // total_cashin est un débit, donc l'annulation est un crédit
                return montant; // crédit (positif)
            } else if ("approvisionnement".equals(typeOrigine)) {
                // approvisionnement est un crédit, donc l'annulation est un débit
                return -montant; // débit (négatif)
            } else if ("compense".equals(typeOrigine)) {
                // compense est un débit, donc l'annulation est un crédit
                return montant; // crédit (positif)
            } else if ("ajustement".equals(typeOrigine)) {
                // ajustement peut être positif ou négatif, l'annulation inverse le signe
                return -montant; // inverse du montant
            } else {
                // Pour les autres types, utiliser la logique par défaut
                if (isDebitOperation(typeOrigine)) {
                    return montant; // Si l'original était un débit, l'annulation est un crédit
                } else if (isCreditOperation(typeOrigine)) {
                    return -montant; // Si l'original était un crédit, l'annulation est un débit
                }
            }
        }
        
        if ("annulation_bo".equals(typeOperation)) {
            if (service != null) {
                String s = service.toLowerCase();
                if (s.contains("cashin")) {
                    return montant; // crédit (positif)
                } else if (s.contains("paiement")) {
                    return -Math.abs(montant); // débit (négatif)
                }
            }
            // Par défaut, comportement précédent pour annulation_bo
            return -montant;
        }
        if ("transaction_cree".equals(typeOperation)) {
            if (service != null) {
                String s = service.toLowerCase();
                if (s.contains("cashin") || s.contains("send") || s.contains("airtime")) {
                    return -montant;
                } else if (s.contains("paiement")) {
                    return montant;
                }
            }
            // Par défaut, comportement précédent
            return -montant;
        }
        if (isDebitOperation(typeOperation)) {
            return -montant;
        } else if (isCreditOperation(typeOperation)) {
            return montant;
        } else if (isAjustementOperation(typeOperation)) {
            return montant;
        }
        return 0; // Ou une autre logique par défaut
    }
    
    private Operation convertToModel(OperationEntity entity) {
        Operation op = new Operation(
                entity.getId(),
                entity.getTypeOperation(),
                entity.getDateOperation(),
                entity.getCodeProprietaire(),
                entity.getService(),
                entity.getMontant(),
                entity.getSoldeAvant(),
                entity.getSoldeApres(),
                entity.getNomBordereau(),
                entity.getBanque(),
                entity.getStatut(),
                entity.getPays(),
                entity.getCompte() != null ? entity.getCompte().getId() : null,
                entity.getRecordCount()
        );
        op.setParentOperationId(entity.getParentOperationId());
        return op;
    }
    
    private OperationEntity convertToEntity(Operation model) {
        OperationEntity entity = new OperationEntity();
        entity.setId(model.getId());
        entity.setTypeOperation(model.getTypeOperation());
        entity.setDateOperation(model.getDateOperation());
        entity.setCodeProprietaire(model.getCodeProprietaire());
        entity.setService(model.getService());
        entity.setMontant(model.getMontant());
        entity.setSoldeAvant(model.getSoldeAvant());
        entity.setSoldeApres(model.getSoldeApres());
        entity.setNomBordereau(model.getNomBordereau());
        entity.setBanque(model.getBanque());
        entity.setStatut(model.getStatut());
        entity.setPays(model.getPays());
        if (model.getCompteId() != null) {
            compteRepository.findById(model.getCompteId()).ifPresent(entity::setCompte);
        }
        entity.setRecordCount(model.getRecordCount());
        entity.setParentOperationId(model.getParentOperationId());
        return entity;
    }
    
    public Map<String, Object> getStatsByType() {
        Map<String, Object> stats = new HashMap<>();
        
        // Récupérer toutes les opérations
        List<Operation> allOperations = getAllOperations();
        
        // Filtrer pour exclure les annulations des types spécifiques
        List<String> excludedAnnulationTypes = Arrays.asList(
            "annulation_total_paiement",
            "annulation_total_cashin", 
            "annulation_annulation_bo",
            "annulation_annulation_partenaire",
            "annulation_FRAIS_TRANSACTION",
            "annulation_compense",
            "annulation_ajustement",
            "annulation_approvisionnement"
        );
        
        // Types d'opérations à exclure si statut "Annulé" ou "Rejeté"
        List<String> excludedStatusTypes = Arrays.asList(
            "total_paiement",
            "total_cashin",
            "compense",
            "ajustement",
            "approvisionnement",
            "FRAIS_TRANSACTION",
            "annulation_bo",
            "annulation_partenaire"
        );
        
        List<Operation> filteredOperations = allOperations.stream()
                .filter(op -> !excludedAnnulationTypes.contains(op.getTypeOperation()))
                .filter(op -> !(excludedStatusTypes.contains(op.getTypeOperation()) && 
                               (op.getStatut() != null && (op.getStatut().equals("Annulée") || op.getStatut().equals("Rejetée")))))
                .collect(Collectors.toList());
        
        // Grouper par type d'opération
        Map<String, List<Operation>> operationsByType = filteredOperations.stream()
                .collect(Collectors.groupingBy(Operation::getTypeOperation));
        
        // Calculer les statistiques pour chaque type
        for (Map.Entry<String, List<Operation>> entry : operationsByType.entrySet()) {
            String typeOperation = entry.getKey();
            List<Operation> operations = entry.getValue();
            
            Map<String, Object> typeStats = new HashMap<>();
            typeStats.put("count", operations.size());
            typeStats.put("totalAmount", operations.stream().mapToDouble(Operation::getMontant).sum());
            
            stats.put(typeOperation, typeStats);
        }
        
        return stats;
    }
    
    public Map<String, Object> getStatsByTypeWithFilters(String pays, Long compteId) {
        Map<String, Object> stats = new HashMap<>();
        
        // Récupérer toutes les opérations
        List<Operation> allOperations = getAllOperations();
        
        // Appliquer les filtres
        List<String> excludedAnnulationTypes = Arrays.asList(
            "annulation_total_paiement",
            "annulation_total_cashin", 
            "annulation_annulation_bo",
            "annulation_annulation_partenaire",
            "annulation_FRAIS_TRANSACTION",
            "annulation_compense",
            "annulation_ajustement",
            "annulation_approvisionnement"
        );
        
        // Types d'opérations à exclure si statut "Annulé" ou "Rejeté"
        List<String> excludedStatusTypes = Arrays.asList(
            "total_paiement",
            "total_cashin",
            "compense",
            "ajustement",
            "approvisionnement",
            "FRAIS_TRANSACTION",
            "annulation_bo",
            "annulation_partenaire"
        );
        
        List<Operation> filteredOperations = allOperations.stream()
                .filter(op -> pays == null || pays.isEmpty() || pays.equals(op.getPays()))
                .filter(op -> compteId == null || compteId.equals(op.getCompteId()))
                .filter(op -> !excludedAnnulationTypes.contains(op.getTypeOperation())) // Exclure les annulations des types spécifiques
                .filter(op -> !(excludedStatusTypes.contains(op.getTypeOperation()) && 
                               (op.getStatut() != null && (op.getStatut().equals("Annulée") || op.getStatut().equals("Rejetée"))))) // Exclure les opérations annulées/rejetées
                .collect(Collectors.toList());
        
        // Grouper par type d'opération
        Map<String, List<Operation>> operationsByType = filteredOperations.stream()
                .collect(Collectors.groupingBy(Operation::getTypeOperation));
        
        // Calculer les statistiques pour chaque type
        for (Map.Entry<String, List<Operation>> entry : operationsByType.entrySet()) {
            String typeOperation = entry.getKey();
            List<Operation> operations = entry.getValue();
            
            Map<String, Object> typeStats = new HashMap<>();
            typeStats.put("count", operations.size());
            typeStats.put("totalAmount", operations.stream().mapToDouble(Operation::getMontant).sum());
            
            stats.put(typeOperation, typeStats);
        }
        
        return stats;
    }
    
    /**
     * Créer automatiquement une opération de frais de transaction
     * AMÉLIORATION : Garantir que les données AgencySummary sont disponibles
     */
    private void createFraisTransactionAutomatique(OperationEntity operation) {
        System.out.println("=== DÉBUT createFraisTransactionAutomatique ===");
        System.out.println("DEBUG: 📋 Opération: " + operation.getTypeOperation() + " - " + operation.getService() + " - " + operation.getCodeProprietaire());
        
        // Vérifier si l'opération a un service défini
        if (operation.getService() == null || operation.getService().trim().isEmpty()) {
            System.out.println("DEBUG: ⚠️ Pas de service défini, pas de frais");
            return;
        }
        
        // Récupérer le numéro de compte (qui est l'agence)
        String numeroCompte = operation.getCodeProprietaire();
        if (numeroCompte == null || numeroCompte.trim().isEmpty()) {
            System.out.println("DEBUG: ⚠️ Pas de code propriétaire, pas de frais");
            return;
        }
        
        // Chercher le frais applicable pour ce service et cette agence
        Optional<FraisTransactionEntity> fraisOpt = fraisTransactionService.getFraisApplicable(operation.getService(), numeroCompte);
        
        if (fraisOpt.isEmpty()) {
            System.out.println("DEBUG: ⚠️ Aucun frais applicable trouvé pour service=" + operation.getService() + " et agence=" + numeroCompte);
            return;
        }
        
        FraisTransactionEntity frais = fraisOpt.get();
        System.out.println("DEBUG: ✅ Frais trouvé: ID=" + frais.getId() + ", Description='" + frais.getDescription() + "', Montant=" + frais.getMontantFrais() + ", Type=" + frais.getTypeCalcul());
        
        // Calculer le montant des frais selon le type
        Double montantFrais;
        if ("POURCENTAGE".equals(frais.getTypeCalcul()) && frais.getPourcentage() != null) {
            // Frais en pourcentage : Volume Total × Pourcentage
            montantFrais = operation.getMontant() * (frais.getPourcentage() / 100.0);
            System.out.println("DEBUG: 💰 Calcul frais en pourcentage:");
            System.out.println("  - Volume total: " + operation.getMontant() + " FCFA");
            System.out.println("  - Pourcentage: " + frais.getPourcentage() + "%");
            System.out.println("  - Montant frais: " + montantFrais + " FCFA");
        } else {
            // Frais fixe : Valeur fixe × Nombre de transactions
            int nombreTransactions;
            
            // LOGIQUE SPÉCIALE POUR LES ANNULATIONS
            if ("annulation_bo".equals(operation.getTypeOperation()) || "annulation_partenaire".equals(operation.getTypeOperation()) || "transaction_cree".equals(operation.getTypeOperation())) {
                // Pour les annulations : toujours 1 transaction pour les frais fixes
                nombreTransactions = 1;
                System.out.println("DEBUG: 💰 Calcul frais fixe pour ANNULATION:");
                System.out.println("  - Type: " + operation.getTypeOperation());
                System.out.println("  - Montant paramétré: " + frais.getMontantFrais() + " FCFA");
                System.out.println("  - Nombre de transactions: " + nombreTransactions + " (toujours 1 pour les annulations)");
            } else {
                // Pour les autres opérations : calcul normal
                nombreTransactions = getNombreTransactionsFromOperationWithRetry(operation);
                System.out.println("DEBUG: 💰 Calcul frais fixe pour opération normale:");
                System.out.println("  - Montant paramétré: " + frais.getMontantFrais() + " FCFA");
                System.out.println("  - Nombre de transactions: " + nombreTransactions);
            }
            
            montantFrais = frais.getMontantFrais() * nombreTransactions;
            System.out.println("  - Montant frais: " + montantFrais + " FCFA");
        }
        
        // Créer l'opération de frais avec les caractéristiques spécifiées
        OperationEntity fraisOperation = new OperationEntity();
        fraisOperation.setCompte(operation.getCompte()); // Même compte (agence)
        fraisOperation.setTypeOperation("FRAIS_TRANSACTION");
        // Lien vers l'opération nominale d'origine
        fraisOperation.setParentOperationId(operation.getId());
        // Règle métier : pour annulation_bo (cashin ou paiement), les frais créditent le compte
        // TOUJOURS enregistrer un montant positif pour les frais
        double montantFraisFinal = Math.abs(montantFrais);
        fraisOperation.setMontant(montantFraisFinal);
        fraisOperation.setParentOperationId(operation.getId()); // Lien explicite avec l'opération d'origine
        fraisOperation.setService(operation.getService());
        fraisOperation.setDateOperation(operation.getDateOperation());
        fraisOperation.setBanque("SYSTEM");
        fraisOperation.setPays(operation.getPays() != null ? operation.getPays() : "CM");
        fraisOperation.setCodeProprietaire(operation.getCodeProprietaire());
        // Format du bordereau : FEES_SUMMARY_[DATE]_[AGENCE]
        String dateStr = operation.getDateOperation().toLocalDate().toString();
        fraisOperation.setNomBordereau("FEES_SUMMARY_" + dateStr + "_" + numeroCompte);
        // Calculer les soldes
        double soldeAvant = operation.getSoldeApres();
        double soldeApres;
        if ("annulation_bo".equals(operation.getTypeOperation()) && operation.getService() != null &&
            (operation.getService().toLowerCase().contains("cashin") || operation.getService().toLowerCase().contains("paiement"))) {
            soldeApres = soldeAvant + montantFraisFinal; // Créditer les frais
        } else {
            soldeApres = soldeAvant - montantFraisFinal; // Débiter les frais (comportement par défaut)
        }
        fraisOperation.setSoldeAvant(soldeAvant);
        // Vérifier si le solde est suffisant pour les frais
        if (soldeApres < 0) {
            fraisOperation.setStatut("En attente");
            fraisOperation.setSoldeApres(soldeAvant);
        } else {
            fraisOperation.setStatut("Validée");
            fraisOperation.setSoldeApres(soldeApres);
            CompteEntity compte = operation.getCompte();
            compte.setSolde(soldeApres);
            compte.setDateDerniereMaj(java.time.LocalDateTime.now());
            compteRepository.save(compte);
        }
        
        System.out.println("DEBUG: 📝 Création de l'opération FRAIS_TRANSACTION:");
        System.out.println("  - Montant: " + montantFrais);
        System.out.println("  - Bordereau: " + fraisOperation.getNomBordereau());
        System.out.println("  - Solde avant: " + soldeAvant);
        System.out.println("  - Solde après: " + fraisOperation.getSoldeApres());
        System.out.println("  - Statut: " + fraisOperation.getStatut());
        
        // Sauvegarder l'opération de frais
        OperationEntity savedFraisOperation = operationRepository.save(fraisOperation);
        System.out.println("DEBUG: ✅ Opération de frais créée avec ID: " + savedFraisOperation.getId());
        System.out.println("=== FIN createFraisTransactionAutomatique ===");
    }

    /**
     * Récupérer le nombre de transactions depuis l'AgencySummary avec retry
     * AMÉLIORATION : Attendre que les données soient disponibles
     */
    private int getNombreTransactionsFromOperationWithRetry(OperationEntity operation) {
        int maxRetries = 3;
        int retryDelayMs = 1000; // 1 seconde
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                System.out.println("DEBUG: 🔍 Tentative " + attempt + "/" + maxRetries + " - Récupération du nombre de transactions");
                System.out.println("DEBUG: 📋 Service: " + operation.getService());
                System.out.println("DEBUG: 📋 Agence: " + operation.getCodeProprietaire());
                System.out.println("DEBUG: 📋 Date: " + operation.getDateOperation().toLocalDate());
                
                // Récupérer le nombre de transactions depuis l'AgencySummary
                List<AgencySummaryEntity> summaries = agencySummaryRepository.findByDateAndAgencyAndService(
                    operation.getDateOperation().toLocalDate().toString(),
                    operation.getCodeProprietaire(),
                    operation.getService()
                );
                
                System.out.println("DEBUG: Résultat repository findByDateAndAgencyAndService(" + operation.getDateOperation().toLocalDate().toString() + ", " + operation.getCodeProprietaire() + ", " + operation.getService() + ") => size=" + summaries.size());
                
                if (!summaries.isEmpty()) {
                    AgencySummaryEntity summary = summaries.get(0);
                    int nombreTransactions = summary.getRecordCount();
                    
                    System.out.println("DEBUG: ✅ AgencySummary trouvé");
                    System.out.println("DEBUG: 📊 Nombre de transactions réel: " + nombreTransactions);
                    System.out.println("DEBUG: 📊 Volume total: " + summary.getTotalVolume() + " FCFA");
                    
                    return nombreTransactions;
                } else {
                    // Aucun AgencySummary trouvé, utiliser le recordCount de l'opération
                    System.out.println("DEBUG: ⚠️ Aucun AgencySummary trouvé, utilisation du recordCount de l'opération");
                    
                    if (operation.getRecordCount() != null) {
                        System.out.println("DEBUG: 📊 Utilisation du recordCount depuis l'opération: " + operation.getRecordCount());
                        return operation.getRecordCount();
                    } else {
                        // Fallback : calculer à partir du volume de l'opération
                        double volumeTotal = operation.getMontant();
                        int nombreTransactions = (int) Math.round(volumeTotal / 118765.0);
                        
                        System.out.println("DEBUG: 📊 Aucune donnée AgencySummary trouvée, calcul basé sur le volume");
                        System.out.println("DEBUG: 📊 Volume total: " + volumeTotal + " FCFA");
                        System.out.println("DEBUG: 📊 Nombre de transactions calculé: " + nombreTransactions);
                        
                        // S'assurer d'avoir au moins 1 transaction
                        return Math.max(1, nombreTransactions);
                    }
                }
                
            } catch (Exception e) {
                System.out.println("DEBUG: ❌ Erreur lors de la récupération du nombre de transactions (tentative " + attempt + "): " + e.getMessage());
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    // Calculer à partir du volume de l'opération
                    double volumeTotal = operation.getMontant();
                    int nombreTransactions = (int) Math.round(volumeTotal / 118765.0);
                    
                    System.out.println("DEBUG: 📋 Calcul basé sur le volume: " + nombreTransactions + " transactions");
                    return Math.max(1, nombreTransactions);
                }
            }
        }
        
        // Utiliser le recordCount de l'opération si disponible, sinon estimation basée sur le volume
        if (operation.getRecordCount() != null) {
            System.out.println("DEBUG: 📊 Utilisation du recordCount depuis l'opération (fallback final): " + operation.getRecordCount());
            return operation.getRecordCount();
        } else {
            double volumeTotal = operation.getMontant();
            int nombreTransactions = (int) Math.round(volumeTotal / 118765.0);
            System.out.println("DEBUG: 📊 Fallback final: calcul basé sur le volume: " + nombreTransactions + " transactions");
            return Math.max(1, nombreTransactions);
        }
    }

    /**
     * Enrichir une opération avec ses frais de transaction associés
     */
    private Operation enrichOperationWithFrais(Operation operation) {
        try {
            // Vérifier si l'opération a un service défini
            if (operation.getService() == null || operation.getService().trim().isEmpty()) {
                operation.setFraisApplicable(false);
                return operation;
            }
            
            // Récupérer le numéro de compte (qui est l'agence)
            String numeroCompte = operation.getCodeProprietaire();
            if (numeroCompte == null || numeroCompte.trim().isEmpty()) {
                operation.setFraisApplicable(false);
                return operation;
            }
            
            // Chercher le frais applicable pour ce service et cette agence
            Optional<FraisTransactionEntity> fraisOpt = fraisTransactionService.getFraisApplicable(operation.getService(), numeroCompte);
            
            if (fraisOpt.isEmpty()) {
                operation.setFraisApplicable(false);
                return operation;
            }
            
            FraisTransactionEntity frais = fraisOpt.get();
            operation.setFraisApplicable(true);
            operation.setTypeCalculFrais(frais.getTypeCalcul());
            operation.setPourcentageFrais(frais.getPourcentage());
            operation.setDescriptionFrais(frais.getDescription());
            
            // Calculer le montant des frais selon le type
            if ("POURCENTAGE".equals(frais.getTypeCalcul()) && frais.getPourcentage() != null) {
                // Frais en pourcentage : Volume Total × Pourcentage
                operation.setMontantFrais(operation.getMontant() * (frais.getPourcentage() / 100.0));
            } else {
                // Frais fixe : Valeur fixe × Nombre de transactions estimé
                int nombreTransactions;
                
                // LOGIQUE SPÉCIALE POUR LES ANNULATIONS
                if ("annulation_bo".equals(operation.getTypeOperation()) || "annulation_partenaire".equals(operation.getTypeOperation()) || "transaction_cree".equals(operation.getTypeOperation())) {
                    // Pour les annulations : toujours 1 transaction pour les frais fixes
                    nombreTransactions = 1;
                } else {
                    // Pour les autres opérations : calcul normal
                    nombreTransactions = estimateNombreTransactions(operation);
                }
                
                operation.setMontantFrais(frais.getMontantFrais() * nombreTransactions);
            }
            
        } catch (Exception e) {
            System.out.println("DEBUG: ❌ Erreur lors de l'enrichissement des frais: " + e.getMessage());
            operation.setFraisApplicable(false);
        }
        
        return operation;
    }
    
    /**
     * Estimer le nombre de transactions pour une opération
     * AMÉLIORATION : Utiliser les données réelles de l'AgencySummary
     */
    private int estimateNombreTransactions(Operation operation) {
        try {
            // Récupérer le nombre de transactions depuis l'AgencySummary
            List<AgencySummaryEntity> summaries = agencySummaryRepository.findByDateAndAgencyAndService(
                operation.getDateOperation().toLocalDate().toString(),
                operation.getCodeProprietaire(),
                operation.getService()
            );
            
            if (!summaries.isEmpty()) {
                AgencySummaryEntity summary = summaries.get(0);
                return summary.getRecordCount();
            } else {
                // Aucun AgencySummary trouvé, utiliser le recordCount de l'opération
                System.out.println("DEBUG: ⚠️ Aucun AgencySummary trouvé, utilisation du recordCount de l'opération");
                
                if (operation.getRecordCount() != null) {
                    System.out.println("DEBUG: 📊 Utilisation du recordCount depuis l'opération: " + operation.getRecordCount());
                    return operation.getRecordCount();
                } else {
                    // Fallback : calculer à partir du volume de l'opération
                    double volumeTotal = operation.getMontant();
                    int nombreTransactions = (int) Math.round(volumeTotal / 118765.0);
                    
                    System.out.println("DEBUG: 📊 Aucune donnée AgencySummary trouvée, calcul basé sur le volume");
                    System.out.println("DEBUG: 📊 Volume total: " + volumeTotal + " FCFA");
                    System.out.println("DEBUG: 📊 Nombre de transactions calculé: " + nombreTransactions);
                    
                    // S'assurer d'avoir au moins 1 transaction
                    return Math.max(1, nombreTransactions);
                }
            }
            
        } catch (Exception e) {
            System.out.println("DEBUG: ❌ Erreur lors de l'estimation du nombre de transactions: " + e.getMessage());
            // Utiliser le recordCount de l'opération si disponible, sinon estimation basée sur le volume
            if (operation.getRecordCount() != null) {
                System.out.println("DEBUG: 📊 Utilisation du recordCount depuis l'opération (exception): " + operation.getRecordCount());
                return operation.getRecordCount();
            } else {
                double volumeTotal = operation.getMontant();
                int nombreTransactions = (int) Math.round(volumeTotal / 118765.0);
                System.out.println("DEBUG: 📊 Exception: calcul basé sur le volume: " + nombreTransactions + " transactions");
                return Math.max(1, nombreTransactions);
            }
        }
    }
    
    /**
     * Récupérer toutes les opérations enrichies avec leurs frais
     */
    public List<Operation> getAllOperationsWithFrais() {
        return operationRepository.findAllOrderByDateOperationDesc().stream()
                .map(this::convertToModel)
                .map(this::enrichOperationWithFrais)
                .collect(Collectors.toList());
    }
    
    /**
     * Récupérer une opération par ID enrichie avec ses frais
     */
    public Optional<Operation> getOperationByIdWithFrais(Long id) {
        return operationRepository.findById(id)
                .map(this::convertToModel)
                .map(this::enrichOperationWithFrais);
    }
    
    /**
     * Récupérer les opérations par compte enrichies avec leurs frais
     */
    public List<Operation> getOperationsByCompteIdWithFrais(Long compteId) {
        return operationRepository.findByCompteIdOrderByDateOperationDesc(compteId).stream()
                .map(this::convertToModel)
                .map(this::enrichOperationWithFrais)
                .collect(Collectors.toList());
    }
    
    /**
     * Corriger les frais existants qui n'ont pas de parentOperationId renseigné
     * Cette méthode lie les frais aux opérations nominales via le bordereau
     */
    @Transactional
    public int correctFraisParentOperationId() {
        System.out.println("DEBUG: 🔧 Début de la correction des parentOperationId des frais...");
        int correctedCount = 0;
        
        // Récupérer tous les frais sans parentOperationId
        List<OperationEntity> fraisWithoutParent = operationRepository.findByTypeOperation("FRAIS_TRANSACTION").stream()
            .filter(frais -> frais.getParentOperationId() == null)
            .collect(Collectors.toList());
        
        System.out.println("DEBUG: 📊 Nombre de frais sans parentOperationId: " + fraisWithoutParent.size());
        
        for (OperationEntity frais : fraisWithoutParent) {
            // Extraire la date et l'agence du bordereau des frais
            String bordereau = frais.getNomBordereau();
            if (bordereau != null && bordereau.startsWith("FEES_SUMMARY_")) {
                String[] parts = bordereau.split("_");
                if (parts.length >= 4) {
                    String date = parts[2];
                    String agence = parts[3];
                    
                    // Chercher l'opération nominale correspondante
                    String nominalBordereau = "AGENCY_SUMMARY_" + date + "_" + agence;
                    List<OperationEntity> nominalOperations = operationRepository.findByNomBordereauContaining(nominalBordereau).stream()
                        .filter(op -> !"FRAIS_TRANSACTION".equals(op.getTypeOperation()))
                        .collect(Collectors.toList());
                    
                    if (!nominalOperations.isEmpty()) {
                        // Prendre la première opération nominale trouvée
                        OperationEntity nominalOp = nominalOperations.get(0);
                        frais.setParentOperationId(nominalOp.getId());
                        operationRepository.save(frais);
                        correctedCount++;
                        System.out.println("DEBUG: ✅ Frais ID " + frais.getId() + " lié à l'opération nominale ID " + nominalOp.getId());
                    }
                }
            }
        }
        
        System.out.println("DEBUG: ✅ Correction terminée. " + correctedCount + " frais corrigés.");
        return correctedCount;
    }

    /**
     * Créer une opération sans frais automatiques.
     * Utilisé pour les opérations d'annulation qui n'ont pas besoin d'impact sur le solde.
     */
    private Operation createOperationWithoutFrais(OperationCreateRequest request) {
        CompteEntity compte = compteRepository.findById(request.getCompteId())
                .orElseThrow(() -> new IllegalArgumentException("Compte non trouvé avec ID: " + request.getCompteId()));

        OperationEntity entity = new OperationEntity();
        entity.setCompte(compte);
        entity.setTypeOperation(request.getTypeOperation());
        entity.setMontant(request.getMontant());
        entity.setBanque(request.getBanque());
        entity.setNomBordereau(request.getNomBordereau());
        entity.setService(request.getService());
        // Date de l'opération : utiliser celle du DTO si fournie, sinon maintenant
        if (request.getDateOperation() != null && !request.getDateOperation().isEmpty()) {
            try {
                System.out.println("DEBUG: Parsing date: " + request.getDateOperation());
                // Si la date fournie ne contient pas d'heure, on ajoute l'heure courante
                if (request.getDateOperation().length() == 10) { // format yyyy-MM-dd
                    java.time.LocalDate date = java.time.LocalDate.parse(request.getDateOperation());
                    java.time.LocalTime now = java.time.LocalTime.now();
                    entity.setDateOperation(date.atTime(now));
                } else {
                    entity.setDateOperation(java.time.LocalDateTime.parse(request.getDateOperation()));
                }
                System.out.println("DEBUG: Date parsée: " + entity.getDateOperation());
            } catch (Exception e) {
                System.out.println("DEBUG: Erreur parsing date: " + e.getMessage());
                entity.setDateOperation(LocalDateTime.now()); // fallback si parsing échoue
            }
        } else {
            entity.setDateOperation(LocalDateTime.now());
        }
        entity.setPays(compte.getPays());
        entity.setCodeProprietaire(compte.getNumeroCompte());
        entity.setRecordCount(request.getRecordCount());
        entity.setParentOperationId(request.getParentOperationId());

        // Calculer l'impact sur le solde comme pour les opérations normales
        double soldeAvant = compte.getSolde();
        entity.setSoldeAvant(soldeAvant);
        double impact = calculateImpact(entity.getTypeOperation(), entity.getMontant(), entity.getService());
        double soldeApres = soldeAvant + impact;

        // Si le solde est insuffisant, statut 'En attente', pas d'impact sur le compte
        if (soldeAvant + impact < 0 && !isAjustementOperation(entity.getTypeOperation())) {
            entity.setStatut("En attente");
            entity.setSoldeApres(soldeAvant); // Pas d'impact
            // Ne pas modifier le solde du compte
        } else {
            entity.setStatut("Validée");
            entity.setSoldeApres(soldeApres);
            compte.setSolde(soldeApres);
            compte.setDateDerniereMaj(LocalDateTime.now());
            compteRepository.save(compte);
        }

        OperationEntity savedEntity = operationRepository.save(entity);
        
        // Ne créer aucun frais automatique pour les opérations d'annulation
        return convertToModel(savedEntity);
    }
} 