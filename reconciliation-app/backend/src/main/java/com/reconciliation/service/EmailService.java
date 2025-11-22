package com.reconciliation.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;
    
    @Value("${spring.mail.host:}")
    private String mailHost;
    
    @Value("${app.url:http://localhost:4200}")
    private String appUrl;
    
    private static final String LOGIN_URL = "https://reconciliation.intouchgroup.net:4200/login?returnUrl=%2Freconciliation-launcher";

    /**
     * Envoie un email avec le mot de passe généré lors de la création d'un utilisateur
     */
    public void sendPasswordEmail(String to, String username, String password) {
        try {
            if (fromEmail == null || fromEmail.trim().isEmpty()) {
                throw new RuntimeException("La configuration email n'est pas correcte. spring.mail.username est vide.");
            }
            
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            helper.setFrom(fromEmail, "Équipe de Réconciliation");
            helper.setTo(to);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Bienvenue - Votre compte a été créé");
            helper.setText(String.format(
                "Bonjour %s,\n\n" +
                "Votre compte a été créé avec succès.\n\n" +
                "Voici vos identifiants de connexion :\n" +
                "Nom d'utilisateur : %s\n" +
                "Mot de passe : %s\n\n" +
                "Vous pouvez vous connecter à l'application en suivant ce lien :\n" +
                "%s\n\n" +
                "Nous vous recommandons de changer votre mot de passe après votre première connexion.\n\n" +
                "Cordialement,\n" +
                "L'équipe de réconciliation",
                username, username, password, LOGIN_URL
            ), false);
            
            // Ajouter des en-têtes pour améliorer la délivrabilité
            mimeMessage.setHeader("X-Mailer", "Reconciliation App");
            mimeMessage.setHeader("X-Priority", "1");
            mimeMessage.setHeader("Importance", "high");
            
            System.out.println("📧 Tentative d'envoi d'email:");
            System.out.println("   De: " + fromEmail);
            System.out.println("   À: " + to);
            System.out.println("   Serveur SMTP: " + mailHost);
            System.out.println("   Sujet: Bienvenue - Votre compte a été créé");
            
            mailSender.send(mimeMessage);
            System.out.println("✅ Email envoyé avec succès à : " + to);
            System.out.println("   Note: Si l'email n'est pas reçu, vérifiez le dossier SPAM/Courrier indésirable");
            System.out.println("   L'email apparaît dans les messages envoyés du compte " + fromEmail);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email à " + to + " : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de l'envoi de l'email : " + e.getMessage(), e);
        }
    }

    /**
     * Envoie un email avec le nouveau mot de passe lors de la réinitialisation
     */
    public void sendPasswordResetEmail(String to, String username, String newPassword) {
        try {
            if (fromEmail == null || fromEmail.trim().isEmpty()) {
                throw new RuntimeException("La configuration email n'est pas correcte. spring.mail.username est vide.");
            }
            
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            helper.setFrom(fromEmail, "Équipe de Réconciliation");
            helper.setTo(to);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Réinitialisation de votre mot de passe");
            helper.setText(String.format(
                "Bonjour %s,\n\n" +
                "Votre mot de passe a été réinitialisé.\n\n" +
                "Voici vos nouveaux identifiants de connexion :\n" +
                "Nom d'utilisateur : %s\n" +
                "Nouveau mot de passe : %s\n\n" +
                "Vous pouvez vous connecter à l'application en suivant ce lien :\n" +
                "%s\n\n" +
                "Nous vous recommandons de changer votre mot de passe après votre prochaine connexion.\n\n" +
                "Cordialement,\n" +
                "L'équipe de réconciliation",
                username, username, newPassword, LOGIN_URL
            ), false);
            
            // Ajouter des en-têtes pour améliorer la délivrabilité
            mimeMessage.setHeader("X-Mailer", "Reconciliation App");
            mimeMessage.setHeader("X-Priority", "1");
            mimeMessage.setHeader("Importance", "high");
            
            System.out.println("📧 Tentative d'envoi d'email de réinitialisation:");
            System.out.println("   De: " + fromEmail);
            System.out.println("   À: " + to);
            System.out.println("   Serveur SMTP: " + mailHost);
            System.out.println("   Sujet: Réinitialisation de votre mot de passe");
            
            mailSender.send(mimeMessage);
            System.out.println("✅ Email de réinitialisation envoyé avec succès à : " + to);
            System.out.println("   Note: Si l'email n'est pas reçu, vérifiez le dossier SPAM/Courrier indésirable");
            System.out.println("   L'email apparaît dans les messages envoyés du compte " + fromEmail);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email de réinitialisation à " + to + " : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de l'envoi de l'email de réinitialisation : " + e.getMessage(), e);
        }
    }
}

