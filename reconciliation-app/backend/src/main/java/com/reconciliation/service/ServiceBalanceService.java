package com.reconciliation.service;

import com.reconciliation.entity.CompteEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.service.CompteRegroupementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class ServiceBalanceService {
    
    private static final Logger logger = LoggerFactory.getLogger(ServiceBalanceService.class);
    
    @Autowired
    private CompteRepository compteRepository;
    
    @Autowired
    private OperationRepository operationRepository;
    
    @Autowired
    private CompteRegroupementService compteRegroupementService;
    
    /**
     * Fusionne plusieurs comptes service en un nouveau compte
     * Les anciens comptes restent opérationnels avec leurs soldes inchangés
     * 
     * @param compteIds Liste des IDs des comptes à fusionner
     * @param nouveauNomCompte Nom du nouveau compte fusionné
     * @param pays Pays du nouveau compte
     * @return Résultat de la fusion avec le solde total
     */
    @Transactional
    public FusionResult mergeServiceComptes(List<Long> compteIds, String nouveauNomCompte, String pays) {
        logger.info("=== DÉBUT mergeServiceComptes ===");
        logger.info("Comptes à fusionner: {}", compteIds);
        logger.info("Nouveau nom: {}, Pays: {}", nouveauNomCompte, pays);
        
        try {
            // 1. Récupérer les comptes à fusionner
            List<CompteEntity> comptesAFusionner = compteRepository.findAllById(compteIds);
            
            if (comptesAFusionner.isEmpty()) {
                throw new IllegalArgumentException("Aucun compte trouvé avec les IDs fournis");
            }
            
            if (comptesAFusionner.size() != compteIds.size()) {
                throw new IllegalArgumentException("Certains comptes n'ont pas été trouvés");
            }
            
            // 2. Calculer le solde total
            double soldeTotal = comptesAFusionner.stream()
                .mapToDouble(CompteEntity::getSolde)
                .sum();
            
            logger.info("Solde total calculé: {}", soldeTotal);
            
            // 3. Créer le nouveau compte fusionné
            CompteEntity nouveauCompte = new CompteEntity();
            nouveauCompte.setNumeroCompte(nouveauNomCompte);
            nouveauCompte.setSolde(soldeTotal);
            nouveauCompte.setPays(pays);
            nouveauCompte.setDateDerniereMaj(LocalDateTime.now());
            
            // Déterminer l'agence (prendre la première agence trouvée)
            String agence = comptesAFusionner.stream()
                .map(CompteEntity::getAgence)
                .filter(ag -> ag != null && !ag.trim().isEmpty())
                .findFirst()
                .orElse("REGROUPEMENT");
            
            nouveauCompte.setAgence(agence);
            
            // Définir le codeProprietaire avec les services choisis (numéros de compte des services fusionnés)
            String codeProprietaire = comptesAFusionner.stream()
                .map(CompteEntity::getNumeroCompte)
                .filter(numero -> numero != null && !numero.trim().isEmpty())
                .collect(Collectors.joining(","));
            
            nouveauCompte.setCodeProprietaire(codeProprietaire);
            logger.info("Code propriétaire défini pour le compte fusionné: {}", codeProprietaire);
            
            // 4. Sauvegarder le nouveau compte
            CompteEntity compteSauvegarde = compteRepository.save(nouveauCompte);
            logger.info("Nouveau compte créé avec ID: {}", compteSauvegarde.getId());
            
            // 5. Créer une opération de regroupement pour tracer la fusion
            OperationEntity operationRegroupement = new OperationEntity();
            operationRegroupement.setTypeOperation("regroupement_comptes_service");
            operationRegroupement.setMontant(soldeTotal);
            operationRegroupement.setCompte(compteSauvegarde); // L'opération est liée au nouveau compte
            operationRegroupement.setDateOperation(LocalDateTime.now());
            operationRegroupement.setStatut("VALIDE");
            operationRegroupement.setReference("REGROUPEMENT_" + nouveauNomCompte + "_" + System.currentTimeMillis());
            operationRegroupement.setCodeProprietaire(nouveauNomCompte);
            operationRegroupement.setPays(pays);
            operationRegroupement.setSoldeAvant(0.0); // Le nouveau compte commence à 0
            operationRegroupement.setSoldeApres(soldeTotal); // Puis a le solde total
            
            operationRepository.save(operationRegroupement);
            logger.info("Opération de regroupement créée pour le nouveau compte: {}", nouveauNomCompte);
            
            // 6. Créer les relations de regroupement pour la synchronisation des soldes
            for (CompteEntity compteOriginal : comptesAFusionner) {
                compteRegroupementService.createRegroupementRelation(compteSauvegarde, compteOriginal);
            }
            
            // 7. Synchroniser immédiatement le solde du compte consolidé
            compteRegroupementService.synchroniserSoldeCompteConsolide(compteSauvegarde.getId());
            logger.info("Solde du compte consolidé synchronisé avec les comptes originaux");
            
            // 8. Les anciens comptes restent opérationnels avec leurs soldes inchangés
            // On ne modifie pas les soldes des comptes fusionnés, ils restent actifs
            logger.info("Les {} comptes fusionnés restent opérationnels avec leurs soldes inchangés", comptesAFusionner.size());
            logger.info("Relations de regroupement créées pour la synchronisation automatique des soldes");
            
            logger.info("=== FIN mergeServiceComptes ===");
            
            return new FusionResult(
                compteSauvegarde.getId(),
                nouveauNomCompte,
                soldeTotal,
                comptesAFusionner.size(),
                pays
            );
            
        } catch (Exception e) {
            logger.error("Erreur lors de la fusion des comptes service: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la fusion des comptes: " + e.getMessage(), e);
        }
    }
    
    /**
     * Récupère tous les comptes service (comptes avec catégorie "Service" ou noms longs contenant des underscores)
     */
    public List<CompteEntity> getServiceComptes() {
        logger.info("Récupération des comptes service");
        
        List<CompteEntity> allComptes = compteRepository.findAll();
        
        // Filtrer les comptes service par catégorie "Service" ou par pattern de nom
        List<CompteEntity> serviceComptes = allComptes.stream()
            .filter(compte -> {
                // Vérifier d'abord la catégorie
                if (compte.getCategorie() != null && "Service".equalsIgnoreCase(compte.getCategorie())) {
                    return true;
                }
                // Sinon, vérifier le pattern du nom
                return isServiceCompte(compte.getNumeroCompte());
            })
            .toList();
        
        logger.info("Nombre de comptes service trouvés: {}", serviceComptes.size());
        return serviceComptes;
    }
    
    /**
     * Récupère tous les comptes (pour debug)
     */
    public List<CompteEntity> getAllComptes() {
        logger.info("Récupération de tous les comptes");
        List<CompteEntity> allComptes = compteRepository.findAll();
        logger.info("Nombre total de comptes: {}", allComptes.size());
        return allComptes;
    }
    
    /**
     * Récupère les statistiques de consommation des services
     * Retourne des statistiques par service : nombre d'opérations, volume total, etc.
     */
    public Map<String, Object> getServiceConsumptionStats() {
        logger.info("Récupération des statistiques de consommation des services");
        
        try {
            // Récupérer tous les comptes service
            List<CompteEntity> serviceComptes = getServiceComptes();
            
            Map<String, Object> stats = new java.util.HashMap<>();
            List<Map<String, Object>> serviceStatsList = new java.util.ArrayList<>();
            
            double totalVolume = 0.0;
            int totalOperations = 0;
            
            // Pour chaque compte service, récupérer les statistiques
            for (CompteEntity serviceCompte : serviceComptes) {
                String serviceNumero = serviceCompte.getNumeroCompte();
                
                // Récupérer toutes les opérations de ce service
                List<OperationEntity> operations = operationRepository.findByServiceOrderByDateOperationDesc(serviceNumero);
                
                if (operations.isEmpty()) {
                    continue;
                }
                
                // Calculer les statistiques
                double serviceVolume = operations.stream()
                    .mapToDouble(op -> op.getMontant() != null ? op.getMontant() : 0.0)
                    .sum();
                
                int operationCount = operations.size();
                
                // Grouper par code propriétaire
                Map<String, Long> codeProprietaireCount = operations.stream()
                    .filter(op -> op.getCodeProprietaire() != null && !op.getCodeProprietaire().trim().isEmpty())
                    .collect(java.util.stream.Collectors.groupingBy(
                        OperationEntity::getCodeProprietaire,
                        java.util.stream.Collectors.counting()
                    ));
                
                Map<String, Object> serviceStat = new java.util.HashMap<>();
                serviceStat.put("serviceName", serviceNumero);
                serviceStat.put("serviceId", serviceCompte.getId());
                serviceStat.put("pays", serviceCompte.getPays());
                serviceStat.put("solde", serviceCompte.getSolde());
                serviceStat.put("totalVolume", serviceVolume);
                serviceStat.put("operationCount", operationCount);
                serviceStat.put("uniqueCodeProprietaires", codeProprietaireCount.size());
                serviceStat.put("codeProprietaireDetails", codeProprietaireCount);
                
                serviceStatsList.add(serviceStat);
                
                totalVolume += serviceVolume;
                totalOperations += operationCount;
            }
            
            // Trier par volume décroissant
            serviceStatsList.sort((a, b) -> {
                double volumeA = (Double) a.get("totalVolume");
                double volumeB = (Double) b.get("totalVolume");
                return Double.compare(volumeB, volumeA);
            });
            
            stats.put("services", serviceStatsList);
            stats.put("totalServices", serviceStatsList.size());
            stats.put("totalVolume", totalVolume);
            stats.put("totalOperations", totalOperations);
            
            logger.info("Statistiques récupérées: {} services, {} opérations, volume total: {}", 
                       serviceStatsList.size(), totalOperations, totalVolume);
            
            return stats;
            
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des statistiques de consommation: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la récupération des statistiques: " + e.getMessage(), e);
        }
    }
    
    /**
     * Détermine si un compte est un compte service
     */
    private boolean isServiceCompte(String numeroCompte) {
        if (numeroCompte == null || numeroCompte.trim().isEmpty()) {
            return false;
        }
        
        String numero = numeroCompte.trim().toUpperCase();
        
        // Un compte service est identifié par:
        // 1. Contient "SERVICE" dans le nom
        // 2. Contient des underscores (format SERVICE_XXX_YYY)
        // 3. Commence par "SERVICE"
        // 4. Contient des patterns de comptes service
        return numero.contains("SERVICE") || 
               numero.contains("_") || 
               numero.startsWith("SERVICE") ||
               numero.matches(".*SERVICE.*") ||
               numero.matches(".*_[A-Z0-9]+_.*");
    }
    
    /**
     * Fusionne plusieurs sous-comptes (codes propriétaires) en un nouveau compte consolidé
     * Les sous-comptes sont des codes propriétaires qui impactent un service
     * 
     * @param subComptes Liste des sous-comptes à fusionner (codeProprietaire + serviceCompteId)
     * @param nouveauNomCompte Nom du nouveau compte fusionné
     * @param pays Pays du nouveau compte
     * @return Résultat de la fusion avec le solde total
     */
    @Transactional
    public FusionResult mergeSubComptes(List<SubCompteRequest> subComptes, String nouveauNomCompte, String pays) {
        logger.info("=== DÉBUT mergeSubComptes ===");
        logger.info("Sous-comptes à fusionner: {}", subComptes);
        logger.info("Nouveau nom: {}, Pays: {}", nouveauNomCompte, pays);
        
        try {
            if (subComptes == null || subComptes.isEmpty()) {
                throw new IllegalArgumentException("Aucun sous-compte fourni pour la fusion");
            }
            
            if (subComptes.size() < 2) {
                throw new IllegalArgumentException("Au moins 2 sous-comptes sont requis pour la fusion");
            }
            
            double soldeTotal = 0.0;
            List<String> codesProprietaires = new java.util.ArrayList<>();
            
            // 1. Pour chaque sous-compte, récupérer les opérations et calculer le solde
            for (SubCompteRequest subCompte : subComptes) {
                String codeProprietaire = subCompte.getCodeProprietaire();
                Long serviceCompteId = subCompte.getServiceCompteId();
                
                if (codeProprietaire == null || codeProprietaire.trim().isEmpty()) {
                    logger.warn("Sous-compte ignoré: codeProprietaire vide");
                    continue;
                }
                
                if (serviceCompteId == null) {
                    logger.warn("Sous-compte ignoré: serviceCompteId vide pour {}", codeProprietaire);
                    continue;
                }
                
                // Récupérer le compte service
                CompteEntity serviceCompte = compteRepository.findById(serviceCompteId)
                    .orElseThrow(() -> new IllegalArgumentException("Compte service introuvable: " + serviceCompteId));
                
                String serviceNumero = serviceCompte.getNumeroCompte();
                
                // Récupérer toutes les opérations du service avec ce codeProprietaire
                List<OperationEntity> operations = operationRepository.findByServiceOrderByDateOperationDesc(serviceNumero)
                    .stream()
                    .filter(op -> codeProprietaire.equals(op.getCodeProprietaire()))
                    .collect(java.util.stream.Collectors.toList());
                
                logger.info("Trouvé {} opérations pour service {} avec codeProprietaire {}", 
                           operations.size(), serviceNumero, codeProprietaire);
                
                // Calculer le solde pour ce sous-compte
                double soldeSubCompte = operations.stream()
                    .mapToDouble(op -> calculateOperationImpact(op))
                    .sum();
                
                soldeTotal += soldeSubCompte;
                codesProprietaires.add(codeProprietaire);
                
                logger.info("Solde calculé pour {}: {}", codeProprietaire, soldeSubCompte);
            }
            
            if (codesProprietaires.isEmpty()) {
                throw new IllegalArgumentException("Aucun code propriétaire valide trouvé");
            }
            
            logger.info("Solde total calculé: {}", soldeTotal);
            
            // 2. Créer le nouveau compte consolidé
            CompteEntity nouveauCompte = new CompteEntity();
            nouveauCompte.setNumeroCompte(nouveauNomCompte);
            nouveauCompte.setSolde(soldeTotal);
            nouveauCompte.setPays(pays);
            nouveauCompte.setDateDerniereMaj(LocalDateTime.now());
            nouveauCompte.setAgence("REGROUPEMENT_SUBCOMPTES");
            nouveauCompte.setCategorie("Service");
            
            // Définir le codeProprietaire avec les codes propriétaires fusionnés
            String codeProprietaire = String.join(",", codesProprietaires);
            nouveauCompte.setCodeProprietaire(codeProprietaire);
            logger.info("Code propriétaire défini pour le compte fusionné: {}", codeProprietaire);
            
            // 3. Sauvegarder le nouveau compte
            CompteEntity compteSauvegarde = compteRepository.save(nouveauCompte);
            logger.info("Nouveau compte créé avec ID: {}", compteSauvegarde.getId());
            
            // 4. Créer une opération de regroupement pour tracer la fusion
            OperationEntity operationRegroupement = new OperationEntity();
            operationRegroupement.setTypeOperation("regroupement_sous_comptes");
            operationRegroupement.setMontant(soldeTotal);
            operationRegroupement.setCompte(compteSauvegarde);
            operationRegroupement.setDateOperation(LocalDateTime.now());
            operationRegroupement.setStatut("VALIDE");
            operationRegroupement.setReference("REGROUPEMENT_SUBCOMPTES_" + nouveauNomCompte + "_" + System.currentTimeMillis());
            operationRegroupement.setCodeProprietaire(codeProprietaire);
            operationRegroupement.setPays(pays);
            operationRegroupement.setSoldeAvant(0.0);
            operationRegroupement.setSoldeApres(soldeTotal);
            
            operationRepository.save(operationRegroupement);
            logger.info("Opération de regroupement créée pour le nouveau compte: {}", nouveauNomCompte);
            
            logger.info("=== FIN mergeSubComptes ===");
            
            return new FusionResult(
                compteSauvegarde.getId(),
                nouveauNomCompte,
                soldeTotal,
                codesProprietaires.size(),
                pays
            );
            
        } catch (Exception e) {
            logger.error("Erreur lors de la fusion des sous-comptes: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la fusion des sous-comptes: " + e.getMessage(), e);
        }
    }
    
    /**
     * Calcule l'impact d'une opération sur le solde
     */
    private double calculateOperationImpact(OperationEntity operation) {
        // Utiliser la différence de solde si disponible
        if (operation.getSoldeAvant() != null && operation.getSoldeApres() != null) {
            return operation.getSoldeApres() - operation.getSoldeAvant();
        }
        
        // Sinon, utiliser le montant selon le type d'opération
        String type = operation.getTypeOperation() != null ? operation.getTypeOperation().toLowerCase() : "";
        double montant = operation.getMontant() != null ? operation.getMontant() : 0.0;
        
        // Opérations qui augmentent le solde
        if (type.contains("cashin") || type.contains("appro") || type.contains("ajustement") || type.contains("transaction_cree")) {
            return montant;
        }
        
        // Opérations qui diminuent le solde
        if (type.contains("paiement") || type.contains("compense") || type.contains("frais") || type.contains("annulation")) {
            return -montant;
        }
        
        return 0.0;
    }
    
    /**
     * Classe de requête pour les sous-comptes
     */
    public static class SubCompteRequest {
        private String codeProprietaire;
        private Long serviceCompteId;
        private String serviceCompteNumero;
        
        public SubCompteRequest() {}
        
        public SubCompteRequest(String codeProprietaire, Long serviceCompteId, String serviceCompteNumero) {
            this.codeProprietaire = codeProprietaire;
            this.serviceCompteId = serviceCompteId;
            this.serviceCompteNumero = serviceCompteNumero;
        }
        
        public String getCodeProprietaire() { return codeProprietaire; }
        public void setCodeProprietaire(String codeProprietaire) { this.codeProprietaire = codeProprietaire; }
        
        public Long getServiceCompteId() { return serviceCompteId; }
        public void setServiceCompteId(Long serviceCompteId) { this.serviceCompteId = serviceCompteId; }
        
        public String getServiceCompteNumero() { return serviceCompteNumero; }
        public void setServiceCompteNumero(String serviceCompteNumero) { this.serviceCompteNumero = serviceCompteNumero; }
    }
    
    /**
     * Classe de résultat pour la fusion
     */
    public static class FusionResult {
        private final Long nouveauCompteId;
        private final String nouveauNomCompte;
        private final double totalSolde;
        private final int nombreComptesFusionnes;
        private final String pays;
        
        public FusionResult(Long nouveauCompteId, String nouveauNomCompte, double totalSolde, 
                           int nombreComptesFusionnes, String pays) {
            this.nouveauCompteId = nouveauCompteId;
            this.nouveauNomCompte = nouveauNomCompte;
            this.totalSolde = totalSolde;
            this.nombreComptesFusionnes = nombreComptesFusionnes;
            this.pays = pays;
        }
        
        // Getters
        public Long getNouveauCompteId() { return nouveauCompteId; }
        public String getNouveauNomCompte() { return nouveauNomCompte; }
        public double getTotalSolde() { return totalSolde; }
        public int getNombreComptesFusionnes() { return nombreComptesFusionnes; }
        public String getPays() { return pays; }
    }
}
