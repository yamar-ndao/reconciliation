package com.reconciliation.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "compte")
public class CompteEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "numero_compte", nullable = false, unique = true)
    private String numeroCompte;
    
    @Column(name = "solde", nullable = false)
    private Double solde;
    
    @Column(name = "date_derniere_maj", nullable = false)
    private LocalDateTime dateDerniereMaj;
    
    @Column(name = "pays", nullable = false)
    private String pays;
    
    @Column(name = "code_proprietaire")
    private String codeProprietaire;
    
    @Column(name = "agence")
    private String agence;
    
    // Constructeurs
    public CompteEntity() {}
    
    public CompteEntity(String numeroCompte, Double solde, LocalDateTime dateDerniereMaj, String pays) {
        this.numeroCompte = numeroCompte;
        this.solde = solde;
        this.dateDerniereMaj = dateDerniereMaj;
        this.pays = pays;
    }
    
    public CompteEntity(String numeroCompte, Double solde, LocalDateTime dateDerniereMaj, String pays, String codeProprietaire) {
        this.numeroCompte = numeroCompte;
        this.solde = solde;
        this.dateDerniereMaj = dateDerniereMaj;
        this.pays = pays;
        this.codeProprietaire = codeProprietaire;
    }
    
    // Getters et Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getNumeroCompte() {
        return numeroCompte;
    }
    
    public void setNumeroCompte(String numeroCompte) {
        this.numeroCompte = numeroCompte;
    }
    
    public Double getSolde() {
        return solde;
    }
    
    public void setSolde(Double solde) {
        this.solde = solde;
    }
    
    public LocalDateTime getDateDerniereMaj() {
        return dateDerniereMaj;
    }
    
    public void setDateDerniereMaj(LocalDateTime dateDerniereMaj) {
        this.dateDerniereMaj = dateDerniereMaj;
    }
    
    public String getPays() {
        return pays;
    }
    
    public void setPays(String pays) {
        this.pays = pays;
    }
    
    public String getCodeProprietaire() {
        return codeProprietaire;
    }
    
    public void setCodeProprietaire(String codeProprietaire) {
        this.codeProprietaire = codeProprietaire;
    }
    
    public String getAgence() {
        return agence;
    }
    
    public void setAgence(String agence) {
        this.agence = agence;
    }
} 