# Annulations et Frais Automatiques

## Vue d'ensemble

Les **annulations BO** et **annulations Partenaire** calculent automatiquement leurs frais de transaction selon la même logique que les opérations `total_cashin` et `total_paiement`.

## Types d'Annulations

### 1. Annulation BO (`annulation_bo`)
- **Impact sur le solde** : Débit (diminue le solde)
- **Calcul des frais** : Automatique si un service est défini
- **Formule** : 
  - **Frais fixes** : `1 × montant_paramétré` (toujours 1 transaction)
  - **Frais en pourcentage** : `montant × pourcentage`

### 2. Annulation Partenaire (`annulation_partenaire`)
- **Impact sur le solde** : Débit (diminue le solde)
- **Calcul des frais** : Automatique si un service est défini
- **Formule** : 
  - **Frais fixes** : `1 × montant_paramétré` (toujours 1 transaction)
  - **Frais en pourcentage** : `montant × pourcentage`

## Logique de Calcul Automatique

### Déclenchement
Les frais sont calculés automatiquement pour **toutes les opérations** qui :
1. Ont un `service` défini
2. Ne sont pas déjà des opérations de type `FRAIS_TRANSACTION`

```java
// Dans OperationService.createOperation()
if (entity.getService() != null && !"FRAIS_TRANSACTION".equals(entity.getTypeOperation())) {
    createFraisTransactionAutomatique(savedEntity);
}
```

### Méthode de Calcul
Le système utilise une logique spéciale pour les annulations :

1. **Pour les annulations** :
   - **Frais fixes** : Toujours `1 transaction` (pas le `recordCount`)
   - **Frais en pourcentage** : Utilise le `montant` de l'annulation

2. **Pour les autres opérations** :
   - **Priorité 1** : Utilise le `recordCount` de l'opération elle-même
   - **Priorité 2** : Cherche dans `agency_summary` avec correspondance exacte
   - **Priorité 3** : Utilise le `recordCount` de l'opération (fallback)

```java
// LOGIQUE SPÉCIALE POUR LES ANNULATIONS
if ("annulation_bo".equals(operation.getTypeOperation()) || "annulation_partenaire".equals(operation.getTypeOperation())) {
    // Pour les annulations : toujours 1 transaction pour les frais fixes
    nombreTransactions = 1;
} else {
    // Pour les autres opérations : calcul normal
    nombreTransactions = getNombreTransactionsFromOperationWithRetry(operation);
}
```

## Exemples de Calcul

### Annulation BO avec Frais Fixes
```
Service: CASHINOMCMPART2
Montant paramétré: 300 FCFA par transaction
Frais calculés: 1 × 300 = 300 FCFA (toujours 1 transaction pour les annulations)
```

### Annulation Partenaire avec Frais en Pourcentage
```
Service: CM_PAIEMENTMARCHAND_OM_TP
Montant annulation: 3,000,000 FCFA
Pourcentage: 1%
Frais calculés: 3,000,000 × 0.01 = 30,000 FCFA (utilise le montant de l'annulation)
```

## Configuration Requise

### 1. Dans le Formulaire Frontend
- **Service** : Doit être renseigné (obligatoire pour déclencher les frais)
- **RecordCount** : Optionnel (non utilisé pour le calcul des frais des annulations)
- **Montant** : Montant total de l'annulation (utilisé pour les frais en pourcentage)

### 2. Dans la Base de Données
- **Table `frais_transaction`** : Configuration des montants par service
- **Table `operation`** : Stockage du `recordCount`

## Test et Validation

### Script de Test
Utilisez le script `test-annulations-frais.ps1` pour vérifier :

1. **Création d'annulation BO** avec service et recordCount
2. **Création d'annulation Partenaire** avec service et recordCount
3. **Vérification des frais automatiques** générés
4. **Validation des montants** calculés

### Logs de Debug
Les logs affichent :
```
DEBUG: Opération: annulation_bo - CASHINOMCMPART2 - CELCM0001
DEBUG: Calcul frais fixe pour ANNULATION:
DEBUG: Type: annulation_bo
DEBUG: Montant paramétré: 300 FCFA
DEBUG: Nombre de transactions: 1 (toujours 1 pour les annulations)
DEBUG: Montant frais: 300 FCFA
```

## Avantages

1. **Cohérence** : Même logique que les autres opérations
2. **Automatisation** : Pas de saisie manuelle des frais
3. **Précision** : Utilise le `recordCount` réel de l'opération
4. **Flexibilité** : Supporte frais fixes et pourcentages

## Points d'Attention

1. **Service obligatoire** : Les frais ne se calculent que si un service est défini
2. **RecordCount optionnel** : Non utilisé pour le calcul des frais des annulations
3. **Configuration des frais** : Doit être paramétrée dans la table `frais_transaction`
4. **Impact sur le solde** : Les annulations sont des débits, les frais aussi

## Conclusion

Les annulations BO et Partenaire calculent automatiquement leurs frais dès qu'elles ont un service défini, garantissant la cohérence et la précision du système de facturation. 