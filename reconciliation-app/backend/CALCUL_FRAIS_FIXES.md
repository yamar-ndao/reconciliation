# Calcul des Frais Fixes par Transaction

## Vue d'ensemble

Le système de calcul des frais fixes fonctionne selon la formule suivante :

```
Montant des frais = Montant paramétré × Nombre de transactions
```

## Exemple avec CELCM0001

### Données fournies
- **Date** : 01/07/2025
- **Agence** : CELCM0001
- **Service** : CASHINMTNCMPART
- **Frais configuré** : 300 FCFA par transaction
- **Opération TOTAL_CASHIN** : 12,589,255.00 FCFA
- **Opération FRAIS_TRANSACTION actuelle** : 3,776,700.00 FCFA (❌ incorrect)

### Calcul correct
1. **Récupération du nombre de transactions** depuis la table `agency_summary`
2. **Application de la formule** : `300 FCFA × nombre_transactions`
3. **Résultat attendu** : Si 106 transactions → `300 × 106 = 31,800 FCFA`

## Processus de calcul dans le système

### 1. Déclenchement automatique
Les frais de transaction sont automatiquement créés lors de la création d'opérations de type :
- `TOTAL_CASHIN`
- `TOTAL_PAIEMENT`

### 2. Recherche des données
Le système recherche dans l'ordre suivant :

```java
// 1. Recherche exacte dans AgencySummary
List<AgencySummaryEntity> summaries = agencySummaryRepository.findByDateAndAgencyAndService(
    date,           // 2025-07-01
    agence,         // CELCM0001
    service         // CASHINMTNCMPART
);

// 2. Si pas trouvé, recherche élargie (date + agence uniquement)
List<AgencySummaryEntity> summariesByDate = agencySummaryRepository.findByDateAndAgency(
    date,           // 2025-07-01
    agence          // CELCM0001
);

// 3. Si toujours pas trouvé, estimation basée sur le volume
if (operation.getNomBordereau().startsWith("AGENCY_SUMMARY_")) {
    double volumeTotal = operation.getMontant();
    int nombreTransactions = (int) Math.round(volumeTotal / 1000.0);
}
```

### 3. Calcul du montant
```java
if ("POURCENTAGE".equals(frais.getTypeCalcul())) {
    // Frais en pourcentage
    montantFrais = volumeTotal * (pourcentage / 100.0);
} else {
    // Frais fixe
    int nombreTransactions = getNombreTransactionsFromOperation(operation);
    montantFrais = frais.getMontantFrais() * nombreTransactions;
}
```

## Structure des données

### Table AgencySummary
```sql
CREATE TABLE agency_summary (
    id BIGINT PRIMARY KEY,
    agency VARCHAR(255),        -- CELCM0001
    service VARCHAR(255),       -- CASHINMTNCMPART
    date VARCHAR(255),          -- 2025-07-01
    record_count INT,           -- 106 (nombre de transactions)
    total_volume DOUBLE,        -- 12,589,255.00 (volume total)
    country VARCHAR(255),
    timestamp VARCHAR(255)
);
```

### Table FraisTransaction
```sql
CREATE TABLE frais_transaction (
    id BIGINT PRIMARY KEY,
    service VARCHAR(255),       -- CASHINMTNCMPART
    agence VARCHAR(255),        -- CELCM0001
    montant_frais DOUBLE,       -- 300.00
    type_calcul VARCHAR(255),   -- NOMINAL (pour frais fixe)
    description VARCHAR(255),   -- Frais CI MTN CELLULANT CM
    actif BOOLEAN               -- true
);
```

## Correction du problème CELCM0001

### Problème identifié
- **Montant actuel** : 3,776,700.00 FCFA
- **Montant correct** : 31,800.00 FCFA (si 106 transactions)
- **Différence** : 3,744,900.00 FCFA

### Script de correction
```sql
-- Correction automatique basée sur les données AgencySummary
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-01' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;
```

## Tests et validation

### Script de test PowerShell
Le fichier `test-frais-fixes-celcm0001.ps1` permet de :

1. **Vérifier les données AgencySummary**
2. **Récupérer le frais configuré**
3. **Calculer le montant correct**
4. **Comparer avec le montant actuel**
5. **Tester via l'API de calcul**
6. **Générer un rapport de correction**

### Endpoints de test disponibles
```bash
# Test du calcul avec données réelles
GET /api/frais-transaction/test-calculation-real?service=CASHINMTNCMPART&agence=CELCM0001&date=2025-07-01

# Test du calcul manuel
GET /api/frais-transaction/test-calculation?service=CASHINMTNCMPART&agence=CELCM0001&typeCalcul=NOMINAL&montantFrais=300&nombreTransactions=106

# Vérification du frais applicable
GET /api/frais-transaction/applicable?service=CASHINMTNCMPART&agence=CELCM0001
```

## Logs de debug

Le système génère des logs détaillés lors du calcul :

```
DEBUG: 💰 Calcul frais fixe:
  - Montant paramétré: 300 FCFA
  - Nombre de transactions: 106
  - Montant frais: 31,800 FCFA
```

## Recommandations

### Pour éviter les erreurs futures
1. **Vérification des données AgencySummary** avant le calcul
2. **Logs détaillés** pour tracer le processus
3. **Tests automatisés** pour valider les calculs
4. **Correction automatique** des montants incorrects

### Pour la correction actuelle
1. **Exécuter le script de test** pour valider les données
2. **Appliquer le script SQL de correction**
3. **Vérifier le résultat** avec les endpoints de test
4. **Documenter la correction** pour référence future

## Formule générale

Pour tout frais fixe :
```
Frais = Montant_paramétré × Nombre_transactions_AgencySummary
```

Où :
- **Montant_paramétré** : Valeur configurée dans la table `frais_transaction`
- **Nombre_transactions_AgencySummary** : Valeur `record_count` de la table `agency_summary` 