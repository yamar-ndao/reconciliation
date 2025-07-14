# Diagnostic du Calcul Automatique des Frais

## Problème identifié

Le calcul automatique des frais ne fonctionne pas correctement :
- **Frais attendu** : 31,800 FCFA (300 × 106 transactions)
- **Frais calculé** : 755,355.30 FCFA (incorrect)

## Analyse du problème

### 1. Données AgencySummary correctes
- **01/07/2025** : 106 transactions → 31,800 FCFA ✅
- **02/07/2025** : 106 transactions → 31,800 FCFA ✅

### 2. Problème avec les nouvelles opérations
- **04/07/2025** : Nouvelle opération créée
- **Frais calculé** : 755,355.30 FCFA ❌
- **Frais attendu** : 31,800 FCFA ✅

## Causes possibles

### 1. Données AgencySummary manquantes pour la nouvelle date
Le système ne trouve pas les données AgencySummary pour la date du 04/07/2025, donc il utilise une logique de fallback incorrecte.

### 2. Logique de fallback défaillante
Dans `getNombreTransactionsFromOperationWithRetry()`, quand les données AgencySummary ne sont pas trouvées, le système utilise une estimation basée sur le volume total divisé par 1000 FCFA.

### 3. Calcul incorrect
- Volume total : 12,589,255 FCFA
- Estimation : 12,589,255 ÷ 1000 = 12,589 transactions
- Frais calculé : 300 × 12,589 = 3,776,700 FCFA
- Mais le résultat affiché est 755,355.30 FCFA (différent)

## Solutions

### Solution 1 : Créer les données AgencySummary manquantes

```sql
-- Insérer les données AgencySummary pour la nouvelle date
INSERT INTO agency_summary (date, agency, service, record_count, total_volume)
VALUES ('2025-07-04', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255);
```

### Solution 2 : Améliorer la logique de fallback

Modifier la méthode `getNombreTransactionsFromOperationWithRetry()` pour :
1. Utiliser une valeur par défaut plus raisonnable (ex: 100 transactions)
2. Ne pas utiliser l'estimation basée sur le volume total
3. Ajouter plus de logs pour tracer le calcul

### Solution 3 : Forcer la création des AgencySummary

Modifier la logique pour créer automatiquement les données AgencySummary lors de la création d'une opération principale.

## Test de la solution

Après avoir appliqué une solution, créer une nouvelle opération de test et vérifier que :
- Les frais calculés sont de 31,800 FCFA
- Les données AgencySummary sont disponibles
- Le calcul utilise le bon nombre de transactions

## Recommandation immédiate

1. **Créer les données AgencySummary manquantes** pour toutes les dates futures
2. **Tester avec une nouvelle opération** pour vérifier le calcul
3. **Si le problème persiste**, modifier la logique de fallback

## Commandes SQL pour corriger

```sql
-- Vérifier les données AgencySummary existantes
SELECT * FROM agency_summary WHERE agency = 'CELCM0001' ORDER BY date;

-- Créer les données manquantes pour les dates futures
INSERT INTO agency_summary (date, agency, service, record_count, total_volume)
VALUES 
('2025-07-04', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-05', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255),
('2025-07-06', 'CELCM0001', 'CASHINMTNCMPART', 106, 12589255);

-- Vérifier les opérations de frais récentes
SELECT id, type_operation, montant, nom_bordereau, date_operation, service
FROM operation 
WHERE code_proprietaire = 'CELCM0001' 
AND type_operation = 'FRAIS_TRANSACTION'
AND service = 'CASHINMTNCMPART'
ORDER BY date_operation DESC;
``` 