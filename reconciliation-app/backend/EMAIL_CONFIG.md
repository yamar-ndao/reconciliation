# Configuration Email - Guide de Configuration

Ce document explique comment configurer l'envoi d'emails dans l'application de réconciliation.

## Variables d'environnement requises

Pour que l'envoi d'emails fonctionne, vous devez configurer les variables d'environnement suivantes :

### Windows (PowerShell ou Invite de commandes)

```powershell
set MAIL_HOST=smtp.gmail.com
set MAIL_PORT=587
set MAIL_USERNAME=votre_email@gmail.com
set MAIL_PASSWORD=votre_mot_de_passe_application
```

### Windows (PowerShell - Permanent pour la session)

```powershell
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="votre_email@gmail.com"
$env:MAIL_PASSWORD="votre_mot_de_passe_application"
```

### Linux/Mac (Terminal)

```bash
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=votre_email@gmail.com
export MAIL_PASSWORD=votre_mot_de_passe_application
```

### Linux/Mac (Permanent - ajouter au fichier ~/.bashrc ou ~/.zshrc)

```bash
echo 'export MAIL_HOST=smtp.gmail.com' >> ~/.bashrc
echo 'export MAIL_PORT=587' >> ~/.bashrc
echo 'export MAIL_USERNAME=votre_email@gmail.com' >> ~/.bashrc
echo 'export MAIL_PASSWORD=votre_mot_de_passe_application' >> ~/.bashrc
source ~/.bashrc
```

## Configuration Gmail - Créer un mot de passe d'application

**IMPORTANT**: Pour Gmail, vous DEVEZ utiliser un "Mot de passe d'application" et NON votre mot de passe principal.

### Étapes pour créer un mot de passe d'application Gmail :

1. **Accédez à votre compte Google**
   - Allez sur https://myaccount.google.com/security

2. **Activez la vérification en deux étapes** (si ce n'est pas déjà fait)
   - C'est obligatoire pour utiliser les mots de passe d'application
   - Allez dans "Validation en deux étapes" et suivez les instructions

3. **Créez un mot de passe d'application**
   - Dans la section "Validation en deux étapes", trouvez "Mots de passe des applications"
   - Cliquez sur "Mots de passe des applications"
   - Sélectionnez "Autre (nom personnalisé)" dans le menu déroulant
   - Entrez un nom comme "Reconciliation App" ou "Application Réconciliation"
   - Cliquez sur "Générer"

4. **Copiez le mot de passe généré**
   - Google générera un mot de passe de 16 caractères
   - **Copiez ce mot de passe immédiatement** car vous ne pourrez plus le voir ensuite
   - Utilisez ce mot de passe de 16 caractères pour la variable `MAIL_PASSWORD`

## Configuration pour d'autres fournisseurs email

### Outlook/Hotmail
```
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USERNAME=votre_email@outlook.com
MAIL_PASSWORD=votre_mot_de_passe
```

**Important pour Outlook :**
- Pour les comptes **Outlook.com** (pas Office365), utilisez votre mot de passe normal
- Pour les comptes **Office365** (@intouchgroup.net), vous devrez peut-être :
  1. Activer l'authentification par application dans le portail Azure AD
  2. Ou utiliser un mot de passe d'application si disponible
  3. Ou configurer OAuth2 (plus complexe)

**Si les emails sont envoyés mais non reçus :**
1. **Vérifiez le dossier SPAM/Courrier indésirable** - C'est la cause la plus fréquente
2. **Vérifiez les règles de boîte de réception** dans Outlook qui pourraient filtrer les emails
3. **Vérifiez que l'adresse d'expéditeur** (`touch@intouchgroup.net`) est autorisée dans votre organisation
4. **Pour Office365**, vérifiez les paramètres de sécurité du compte dans le portail Microsoft 365

### Yahoo Mail
```
MAIL_HOST=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_USERNAME=votre_email@yahoo.com
MAIL_PASSWORD=votre_mot_de_passe_application
```

### Serveur SMTP personnalisé
```
MAIL_HOST=votre_serveur_smtp.com
MAIL_PORT=587 (ou 465 pour SSL)
MAIL_USERNAME=votre_utilisateur
MAIL_PASSWORD=votre_mot_de_passe
```

## Vérification de la configuration

Après avoir configuré les variables d'environnement :

1. **Redémarrez l'application** pour que les nouvelles variables soient prises en compte

2. **Créez un utilisateur de test** avec une adresse email valide

3. **Vérifiez les logs** de l'application pour voir si l'email a été envoyé avec succès :
   ```
   ✅ Email envoyé avec succès à : email@exemple.com
   ```

4. **Vérifiez la boîte de réception** de l'email spécifié lors de la création de l'utilisateur

## Dépannage

### L'email n'est pas envoyé

1. **Vérifiez que les variables d'environnement sont définies**
   - Windows: `echo %MAIL_USERNAME%`
   - Linux/Mac: `echo $MAIL_USERNAME`

2. **Vérifiez les logs de l'application** pour les erreurs

3. **Vérifiez que vous utilisez un mot de passe d'application Gmail** (pas votre mot de passe principal)

4. **Vérifiez que la vérification en deux étapes est activée** sur votre compte Gmail

### Erreur d'authentification

- Assurez-vous d'utiliser un mot de passe d'application Gmail (16 caractères)
- Vérifiez que `MAIL_USERNAME` correspond exactement à votre adresse email
- Vérifiez que `MAIL_PASSWORD` ne contient pas d'espaces avant/après

### Timeout de connexion

- Vérifiez votre connexion internet
- Vérifiez que le pare-feu autorise les connexions sortantes sur le port 587
- Essayez d'augmenter les timeouts dans `application.properties`

### L'email apparaît dans "Messages envoyés" mais le destinataire ne le reçoit pas

**Symptôme :** L'email est visible dans les "Messages envoyés" du compte Outlook configuré, mais le destinataire ne le reçoit pas.

**Causes possibles :**

1. **Filtres anti-spam côté serveur de réception**
   - L'email est bloqué par les filtres anti-spam du serveur de destination
   - **Solution :** Demander au destinataire de vérifier son dossier SPAM et d'ajouter l'expéditeur à sa liste blanche

2. **Problème de réputation de l'expéditeur (Office365)**
   - Le compte expéditeur peut avoir une mauvaise réputation
   - **Solution :** Contacter l'administrateur IT pour vérifier la réputation du compte dans Microsoft 365

3. **Configuration SPF/DKIM/DMARC manquante**
   - Les enregistrements DNS pour l'authentification email ne sont pas configurés
   - **Solution :** Demander à l'administrateur IT de configurer les enregistrements SPF, DKIM et DMARC pour le domaine `intouchgroup.net`

4. **Politiques de sécurité Office365**
   - Les politiques de sécurité peuvent bloquer les emails sortants
   - **Solution :** Vérifier dans le portail Microsoft 365 Admin Center :
     - Exchange Admin Center > Protection > Anti-spam
     - Vérifier les règles de transport qui pourraient bloquer les emails

5. **Quota ou limitation de taux**
   - Le compte peut avoir atteint une limite d'envoi
   - **Solution :** Vérifier les limites d'envoi dans Office365 (généralement 10 000 emails/jour pour les comptes standard)

**Actions à prendre :**

1. Vérifier les logs du serveur de réception (si accessible)
2. Demander au destinataire de vérifier :
   - Le dossier SPAM/Courrier indésirable
   - Les règles de boîte de réception
   - Les filtres anti-spam
3. Contacter l'administrateur IT pour :
   - Vérifier les logs Exchange/Office365
   - Vérifier la configuration SPF/DKIM/DMARC
   - Vérifier les politiques de sécurité
4. Tester avec un autre compte email pour isoler le problème

## Notes de sécurité

- **NE JAMAIS** commiter les mots de passe dans le code source
- **TOUJOURS** utiliser des variables d'environnement pour les informations sensibles
- Utilisez des mots de passe d'application spécifiques pour chaque application
- Régénérez les mots de passe d'application si vous pensez qu'ils ont été compromis

