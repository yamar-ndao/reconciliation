# Transaction Créée et Frais Automatiques

## Vue d'ensemble

Les **transactions créées** (`transaction_cree`) calculent automatiquement leurs frais de transaction selon la même logique que les opérations `annulation_bo` et `annulation_partenaire`.

## Type d'Opération

### Transaction Créée (`transaction_cree`)
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
Le système utilise une logique spéciale pour les transactions créées :

1. **Pour les transactions créées** :
   - **Frais fixes** : Toujours `1 transaction` (pas le `recordCount`)
   - **Frais en pourcentage** : Utilise le `montant` de la transaction

2. **Pour les autres opérations** :
   - **Priorité 1** : Utilise le `recordCount` de l'opération elle-même
   - **Priorité 2** : Cherche dans `agency_summary` avec correspondance exacte
   - **Priorité 3** : Utilise le `recordCount` de l'opération (fallback)

```java
// LOGIQUE SPÉCIALE POUR LES TRANSACTIONS CRÉÉES
if ("annulation_bo".equals(operation.getTypeOperation()) || 
    "annulation_partenaire".equals(operation.getTypeOperation()) || 
    "transaction_cree".equals(operation.getTypeOperation())) {
    // Pour les transactions créées : toujours 1 transaction pour les frais fixes
    nombreTransactions = 1;
} else {
    // Pour les autres opérations : calcul normal
    nombreTransactions = getNombreTransactionsFromOperationWithRetry(operation);
}
```

## Exemples de Calcul

### Transaction Créée avec Frais Fixes
```
Service: CASHINOMCMPART2
Montant paramétré: 300 FCFA par transaction
Frais calculés: 1 × 300 = 300 FCFA (toujours 1 transaction pour les transactions créées)
```

### Transaction Créée avec Frais en Pourcentage
```
Service: CM_PAIEMENTMARCHAND_OM_TP
Montant transaction: 1,500,000 FCFA
Pourcentage: 1%
Frais calculés: 1,500,000 × 0.01 = 15,000 FCFA (utilise le montant de la transaction)
```

## Configuration Requise

### 1. Dans le Formulaire Frontend
- **Service** : Doit être renseigné (obligatoire pour déclencher les frais)
- **RecordCount** : Optionnel (non utilisé pour le calcul des frais des transactions créées)
- **Montant** : Montant total de la transaction (utilisé pour les frais en pourcentage)

### 2. Dans la Base de Données
- **Table `frais_transaction`** : Configuration des montants par service
- **Table `operation`** : Stockage du `recordCount`

## Test et Validation

### Script de Test
Utilisez le script `test-transaction-cree.ps1` pour vérifier :

1. **Création de transaction créée** avec service et recordCount
2. **Vérification des frais automatiques** générés
3. **Validation des montants** calculés

### Logs de Debug
Les logs affichent :
```
DEBUG: Opération: transaction_cree - CASHINOMCMPART2 - CELCM0001
DEBUG: Calcul frais fixe pour ANNULATION:
DEBUG: Type: transaction_cree
DEBUG: Montant paramétré: 300 FCFA
DEBUG: Nombre de transactions: 1 (toujours 1 pour les transactions créées)
DEBUG: Montant frais: 300 FCFA
```

## Avantages

1. **Cohérence** : Même logique que les annulations BO et partenaire
2. **Automatisation** : Pas de saisie manuelle des frais
3. **Précision** : Utilise toujours 1 transaction pour les frais fixes
4. **Flexibilité** : Supporte frais fixes et pourcentages

## Points d'Attention

1. **Service obligatoire** : Les frais ne se calculent que si un service est défini
2. **RecordCount optionnel** : Non utilisé pour le calcul des frais des transactions créées
3. **Configuration des frais** : Doit être paramétrée dans la table `frais_transaction`
4. **Impact sur le solde** : Les transactions créées sont des débits, les frais aussi

## Différences avec les Autres Types

| Type d'Opération | Impact Solde | Frais Fixes | Frais Pourcentage |
|------------------|--------------|-------------|-------------------|
| `total_cashin` | Débit | `recordCount × montant` | `montant × pourcentage` |
| `total_paiement` | Crédit | `recordCount × montant` | `montant × pourcentage` |
| `annulation_bo` | Débit | `1 × montant` | `montant × pourcentage` |
| `annulation_partenaire` | Débit | `1 × montant` | `montant × pourcentage` |
| `transaction_cree` | Débit | `1 × montant` | `montant × pourcentage` |

## Conclusion

Les transactions créées calculent automatiquement leurs frais dès qu'elles ont un service défini, garantissant la cohérence et la précision du système de facturation, avec le même comportement que les annulations BO et partenaire. 