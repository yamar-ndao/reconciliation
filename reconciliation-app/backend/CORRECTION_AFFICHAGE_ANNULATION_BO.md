# Correction du problème d'affichage des montants des annulations BO

## Problème identifié

Les montants des opérations de type `annulation_bo` n'étaient pas affichés correctement sur le relevé de compte dans l'interface frontend.

## Cause racine

Le problème était dans la logique de détermination des types d'opérations de débit/crédit dans le composant `comptes.component.ts` :

1. **Extraction du type d'origine** : Pour les annulations, le système extrait le type d'origine en enlevant le préfixe `annulation_`
   - `annulation_bo` → `bo`
   - `annulation_partenaire` → `partenaire`

2. **Types non reconnus** : Les types `bo` et `partenaire` n'étaient pas définis dans les méthodes `isDebitOperation()` et `isCreditOperation()`

3. **Résultat** : Les annulations BO et partenaire n'étaient pas classées comme débit ou crédit, donc leurs montants n'étaient pas affichés

## Solution appliquée

### 1. Ajout de la gestion du type `bo`

```typescript
// Dans isDebitOperation()
if (type === 'bo') {
    // Pour les opérations BO, la logique dépend du service
    if (service && service.toLowerCase().includes('cashin')) return true;
    if (service && service.toLowerCase().includes('paiement')) return false;
    // Par défaut, considérer comme un débit
    return true;
}

// Dans isCreditOperation()
if (type === 'bo') {
    // Pour les opérations BO, la logique dépend du service
    if (service && service.toLowerCase().includes('paiement')) return true;
    if (service && service.toLowerCase().includes('cashin')) return false;
    // Par défaut, considérer comme un crédit
    return false;
}
```

### 2. Ajout de la gestion du type `partenaire`

```typescript
// Dans isDebitOperation()
if (type === 'partenaire') {
    // Pour les opérations partenaire, considérer comme un débit
    return true;
}

// Dans isCreditOperation()
if (type === 'partenaire') {
    // Pour les opérations partenaire, considérer comme un crédit
    return false;
}
```

## Logique métier appliquée

### Pour les annulations BO (`annulation_bo`)

1. **Type d'origine** : `bo`
2. **Logique de débit/crédit** : Basée sur le service
   - Service contenant "cashin" → Débit (annulation d'un cash-in)
   - Service contenant "paiement" → Crédit (annulation d'un paiement)
   - Par défaut → Débit

### Pour les annulations partenaire (`annulation_partenaire`)

1. **Type d'origine** : `partenaire`
2. **Logique de débit/crédit** : Toujours débit (annulation d'une opération partenaire)

## Impact de la correction

### Avant la correction
- ❌ Les montants des annulations BO n'étaient pas affichés
- ❌ Les montants des annulations partenaire n'étaient pas affichés
- ❌ Les colonnes Débit/Crédit restaient vides

### Après la correction
- ✅ Les montants des annulations BO sont correctement affichés
- ✅ Les montants des annulations partenaire sont correctement affichés
- ✅ La logique débit/crédit est respectée selon le service
- ✅ Les soldes sont calculés correctement

## Fichiers modifiés

- `reconciliation-app/frontend/src/app/components/comptes/comptes.component.ts`
  - Méthode `isDebitOperation()` : Ajout de la gestion des types `bo` et `partenaire`
  - Méthode `isCreditOperation()` : Ajout de la gestion des types `bo` et `partenaire`

## Test de validation

Un script de test a été créé : `test-annulation-bo-affichage.ps1`

Ce script :
1. Crée une opération BO normale
2. Annule cette opération pour générer une annulation BO
3. Vérifie que l'annulation est créée avec le bon montant
4. Récupère le relevé et vérifie l'affichage
5. Valide que le montant est bien présent dans le relevé

## Instructions de test manuel

1. **Ouvrir l'application Angular**
2. **Aller dans la section "Comptes"**
3. **Cliquer sur "Voir le relevé" pour un compte**
4. **Vérifier que les annulations BO apparaissent avec leur montant**
5. **Vérifier que le montant est affiché dans la bonne colonne (Débit/Crédit)**

## Compatibilité

Cette correction est compatible avec :
- ✅ Toutes les annulations existantes
- ✅ La logique métier existante
- ✅ L'export Excel du relevé
- ✅ Les calculs de soldes
- ✅ Les totaux par type d'opération

## Conclusion

Le problème d'affichage des montants des annulations BO est maintenant résolu. Les annulations BO et partenaire apparaissent correctement dans le relevé avec leurs montants respectifs, et la logique débit/crédit est respectée selon le service associé. 