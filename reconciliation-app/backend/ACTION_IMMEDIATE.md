# Action Immédiate - Correction des Frais CELCM0001

## Problème identifié

Les frais fixes pour CELCM0001 ne sont pas calculés correctement :
- **Montant actuel** : 3,776,700.00 FCFA (incorrect)
- **Montant attendu** : 31,800.00 FCFA (300 FCFA × nombre_transactions)

## Actions à effectuer IMMÉDIATEMENT

### 1. Redémarrer l'application Spring Boot

```bash
# Arrêter l'application actuelle (Ctrl+C)
# Puis redémarrer
mvn spring-boot:run
```

### 2. Exécuter le diagnostic

```powershell
powershell -ExecutionPolicy Bypass -File diagnostic-frais-celcm0001.ps1
```

### 3. Exécuter la correction automatique

```powershell
powershell -ExecutionPolicy Bypass -File correct-frais-immediate.ps1
```

### 4. Vérifier les résultats

Le script de correction va :
- Corriger les frais du 01/07/2025
- Corriger les frais du 02/07/2025
- Afficher les montants avant/après correction

## Résultats attendus

Après correction, vous devriez voir :
- **01/07/2025** : 31,800.00 FCFA (au lieu de 3,776,700.00)
- **02/07/2025** : 31,800.00 FCFA (au lieu de 3,776,700.00)

## Si la correction automatique ne fonctionne pas

### Option A : Correction SQL directe

Exécuter le script SQL :
```sql
-- Correction pour 01/07/2025
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-01' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;

-- Correction pour 02/07/2025
UPDATE operation 
SET montant = (SELECT record_count FROM agency_summary 
               WHERE agency = 'CELCM0001' 
               AND date = '2025-07-02' 
               AND service = 'CASHINMTNCMPART') * 300.0
WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant = 3776700.0;
```

### Option B : Vérification des données

Vérifier que les données AgencySummary existent :
```sql
SELECT * FROM agency_summary 
WHERE agency = 'CELCM0001' 
AND date IN ('2025-07-01', '2025-07-02')
AND service = 'CASHINMTNCMPART';
```

## Pour les futures opérations

Le système a été amélioré pour :
1. **Attendre que les données AgencySummary soient disponibles**
2. **Utiliser le nombre réel de transactions**
3. **Calculer correctement : montant_paramétré × nombre_transactions**

## Contact en cas de problème

Si les corrections ne fonctionnent pas, vérifiez :
1. L'application Spring Boot est-elle démarrée ?
2. Les données AgencySummary existent-elles ?
3. Le frais de 300 FCFA est-il configuré et actif ? 