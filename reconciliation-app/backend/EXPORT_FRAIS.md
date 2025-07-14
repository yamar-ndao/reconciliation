# Export des Frais de Transaction

## Vue d'ensemble

Cette fonctionnalité permet d'exporter les données des frais de transaction dans différents formats (CSV, Excel) depuis l'interface utilisateur et via l'API backend.

## Fonctionnalités

### Frontend (Angular)

#### Boutons d'Export
- **Export CSV** : Exporte les frais de transaction au format CSV
- **Export Excel** : Exporte les frais de transaction au format Excel avec mise en forme
- **Export API** : Utilise l'endpoint backend pour l'export

#### Fonctionnalités
- Export des données filtrées uniquement
- Mise en forme automatique des fichiers Excel
- Gestion des états de chargement
- Messages d'erreur appropriés
- Noms de fichiers avec date automatique

### Backend (Spring Boot)

#### Endpoint d'Export
```
GET /api/frais-transaction/export
```

#### Réponse
```json
{
  "success": true,
  "data": [
    {
      "Service": "CASHIN",
      "Agence": "AGENCE_DAKAR",
      "Type de Calcul": "Frais fixe",
      "Valeur Paramétrée": "100.0 FCFA",
      "Description": "Frais de transaction Cash-in - Agence Dakar",
      "Statut": "Actif",
      "Date Création": "2025-01-15T10:30:00",
      "Date Modification": "2025-01-15T10:30:00"
    }
  ],
  "totalCount": 1,
  "exportDate": "2025-01-15T14:30:00"
}
```

## Structure des Données Exportées

### Colonnes CSV/Excel
1. **Service** : Nom du service (ex: CASHIN, PAIEMENT, TRANSFERT)
2. **Agence** : Nom de l'agence
3. **Type de Calcul** : "Frais fixe" ou "Frais en pourcentage"
4. **Valeur Paramétrée** : Montant en FCFA ou pourcentage selon le type
5. **Description** : Description du frais
6. **Statut** : "Actif" ou "Inactif"
7. **Date Création** : Date de création du frais
8. **Date Modification** : Date de dernière modification

> **Note** : L'ID n'est pas affiché dans les exports pour une meilleure lisibilité des données métier.

## Utilisation

### Via l'Interface Utilisateur
1. Aller dans la section "Gestion des Frais de Transaction"
2. Appliquer les filtres souhaités (optionnel)
3. Cliquer sur le bouton d'export désiré :
   - 📄 **Exporter CSV** : Pour un fichier CSV simple
   - 📊 **Exporter Excel** : Pour un fichier Excel formaté
   - 📥 **Export API** : Pour un export via l'API backend

### Via l'API
```bash
curl -X GET "http://localhost:8080/api/frais-transaction/export" \
  -H "Content-Type: application/json"
```

## Tests

### Script de Test PowerShell
Exécuter le script `test-export-frais.ps1` pour tester :
- Récupération de tous les frais
- Test de l'endpoint d'export
- Récupération des frais actifs
- Récupération des services disponibles
- Récupération des agences disponibles

```powershell
.\test-export-frais.ps1
```

## Fichiers Générés

### Noms de Fichiers
- CSV : `frais_transaction_YYYY-MM-DD.csv`
- Excel : `frais_transaction_YYYY-MM-DD.xlsx`
- API : `frais_transaction_api_YYYY-MM-DD.csv`

### Format des Dates
- Format ISO : `YYYY-MM-DD`
- Exemple : `frais_transaction_2025-01-15.csv`

## Gestion des Erreurs

### Frontend
- Vérification de la présence de données avant export
- Messages d'erreur utilisateur appropriés
- Gestion des états de chargement
- Logs d'erreur dans la console

### Backend
- Gestion des exceptions avec messages d'erreur
- Réponse JSON structurée avec statut de succès/échec
- Logs d'erreur détaillés

## Dépendances

### Frontend
- `xlsx` : Bibliothèque pour la génération de fichiers Excel
- `@angular/common/http` : Pour les appels API

### Backend
- `Spring Boot Web` : Pour les endpoints REST
- `Jackson` : Pour la sérialisation JSON

## Améliorations Futures

1. **Export avec filtres** : Permettre l'export avec les filtres appliqués
2. **Export par lot** : Export de grandes quantités de données
3. **Formats additionnels** : PDF, JSON, XML
4. **Planification d'export** : Exports automatiques programmés
5. **Notifications** : Notifications par email lors d'export terminé
6. **Historique d'export** : Suivi des exports effectués 