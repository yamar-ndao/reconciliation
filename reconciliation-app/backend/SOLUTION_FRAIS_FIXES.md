# Solution pour les Frais Fixes par Transaction

## Problème identifié

Vous avez un problème avec le calcul des frais fixes qui ne sont pas calculés correctement sur la base du nombre de transactions. Actuellement :

- **Frais configuré** : 300 FCFA par transaction
- **Montant actuel** : 3,776,700.00 FCFA (incorrect)
- **Montant attendu** : 31,800.00 FCFA (300 × 106 transactions)

## Solution mise en place

### 1. Amélioration du calcul automatique

J'ai modifié le code dans `OperationService.java` pour :

- **Ajouter un système de retry** : Le système attend que les données `agency_summary` soient disponibles
- **Améliorer la récupération du nombre de transactions** : Utilise les données réelles de `agency_summary`
- **Ajouter des logs détaillés** : Pour tracer le processus de calcul

```java
// Nouvelle méthode avec retry
private int getNombreTransactionsFromOperationWithRetry(OperationEntity operation) {
    int maxRetries = 3;
    int retryDelayMs = 1000; // 1 seconde
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        // Récupération des données AgencySummary
        // Si pas trouvé, attendre et réessayer
    }
}
```

### 2. Endpoint de correction automatique

J'ai créé un nouvel endpoint `/api/frais-transaction/correct-frais-amounts` qui :

- **Récupère les données AgencySummary** pour la date/agence/service
- **Calcule le montant correct** : `montant_paramétré × nombre_transactions`
- **Applique la correction** automatiquement en base de données
- **Met à jour les soldes** si nécessaire

### 3. Scripts de test

J'ai créé plusieurs scripts pour valider et corriger :

- `test-frais-fixes-simple.ps1` : Test simple du calcul
- `test-frais-fixes-celcm0001.ps1` : Test spécifique pour CELCM0001
- `correct-frais-celcm0001-2025-07-01-v2.sql` : Script SQL de correction

## Comment utiliser la solution

### 1. Pour les nouvelles opérations

Le système calcule automatiquement les frais correctement lors de la création d'opérations. Les logs vous montreront :

```
DEBUG: 💰 Calcul frais fixe:
  - Montant paramétré: 300 FCFA
  - Nombre de transactions: 106
  - Montant frais: 31,800 FCFA
```

### 2. Pour corriger les frais existants

Utilisez l'endpoint de correction :

```bash
GET /api/frais-transaction/correct-frais-amounts?date=2025-07-01&service=CASHINMTNCMPART&agences=CELCM0001
```

Ou lancez le script PowerShell :

```powershell
.\test-frais-fixes-simple.ps1
```

### 3. Pour tester le calcul

Utilisez l'endpoint de test :

```bash
GET /api/frais-transaction/test-calculation-real?service=CASHINMTNCMPART&agence=CELCM0001&date=2025-07-01
```

## Formule de calcul

**Frais fixes = Montant paramétré × Nombre de transactions**

Où :
- **Montant paramétré** : Valeur configurée dans `frais_transaction` (ex: 300 FCFA)
- **Nombre de transactions** : Valeur `record_count` de `agency_summary`

## Exemple avec CELCM0001

```
Date: 2025-07-01
Agence: CELCM0001
Service: CASHINMTNCMPART
Frais configuré: 300 FCFA par transaction
Nombre de transactions (AgencySummary): 106
Calcul: 300 × 106 = 31,800 FCFA
```

## Fichiers modifiés

1. **`OperationService.java`** : Amélioration du calcul automatique
2. **`FraisTransactionController.java`** : Nouvel endpoint de correction
3. **`test-frais-fixes-simple.ps1`** : Script de test
4. **`correct-frais-celcm0001-2025-07-01-v2.sql`** : Script SQL de correction
5. **`CALCUL_FRAIS_FIXES.md`** : Documentation détaillée

## Résultat attendu

Après application de la solution :

- ✅ Les nouvelles opérations auront les frais calculés correctement
- ✅ Les frais existants peuvent être corrigés automatiquement
- ✅ Le système attend que les données `agency_summary` soient disponibles
- ✅ Logs détaillés pour tracer le processus

## Prochaines étapes

1. **Tester la solution** avec les scripts fournis
2. **Corriger les frais existants** avec l'endpoint de correction
3. **Valider les nouveaux calculs** lors de la création d'opérations
4. **Surveiller les logs** pour s'assurer du bon fonctionnement 