package com.reconciliation.repository;

import com.reconciliation.entity.CompteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompteRepository extends JpaRepository<CompteEntity, Long> {
    
    Optional<CompteEntity> findByNumeroCompte(String numeroCompte);
    
    List<CompteEntity> findByPays(String pays);
    
    List<CompteEntity> findByCodeProprietaire(String codeProprietaire);
    
    @Query("SELECT c FROM CompteEntity c WHERE c.solde > :soldeMin")
    List<CompteEntity> findBySoldeSuperieurA(@Param("soldeMin") Double soldeMin);
    
    @Query("SELECT c FROM CompteEntity c WHERE c.dateDerniereMaj >= :dateDebut")
    List<CompteEntity> findByDateDerniereMajApres(@Param("dateDebut") String dateDebut);
    
    @Query("SELECT DISTINCT c.pays FROM CompteEntity c WHERE c.pays IS NOT NULL AND c.pays != '' ORDER BY c.pays")
    List<String> findDistinctPays();
    
    @Query("SELECT DISTINCT c.codeProprietaire FROM CompteEntity c WHERE c.codeProprietaire IS NOT NULL AND c.codeProprietaire != '' ORDER BY c.codeProprietaire")
    List<String> findDistinctCodeProprietaire();
    
    /**
     * Récupère les comptes qui commencent par une agence spécifique
     */
    @Query("SELECT c FROM CompteEntity c WHERE c.numeroCompte LIKE :agency + '_%' ORDER BY c.numeroCompte")
    List<CompteEntity> findByAgency(@Param("agency") String agency);
    
    /**
     * Récupère les comptes qui contiennent un service spécifique
     */
    @Query("SELECT c FROM CompteEntity c WHERE c.numeroCompte = :service ORDER BY c.numeroCompte")
    List<CompteEntity> findByService(@Param("service") String service);
    
    boolean existsByNumeroCompte(String numeroCompte);
} 