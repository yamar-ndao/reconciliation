import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from './app-state.service';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private timeoutDuration = 10 * 60 * 1000; // 5 minutes en millisecondes
  private timeoutId: any = null;
  private lastActivityTime: number = Date.now();

  // Événements à surveiller pour détecter l'activité utilisateur
  private activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  constructor(
    private appState: AppStateService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  /**
   * Démarre la surveillance de l'activité utilisateur
   */
  start(): void {
    // Ne démarrer que si l'utilisateur est authentifié
    if (!this.appState.isAuthenticated()) {
      return;
    }

    // Réinitialiser le timer
    this.resetTimer();

    // Écouter les événements d'activité
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.onActivity.bind(this), true);
    });

    // Écouter les changements de visibilité de l'onglet
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  /**
   * Arrête la surveillance de l'activité utilisateur
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Retirer les écouteurs d'événements
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.onActivity.bind(this), true);
    });

    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  /**
   * Réinitialise le timer de timeout
   */
  private resetTimer(): void {
    // Annuler le timer existant
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Mettre à jour le temps de dernière activité
    this.lastActivityTime = Date.now();

    // Créer un nouveau timer
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          this.handleTimeout();
        });
      }, this.timeoutDuration);
    });
  }

  /**
   * Gère l'activité utilisateur
   */
  private onActivity(): void {
    // Vérifier que l'utilisateur est toujours authentifié
    if (!this.appState.isAuthenticated()) {
      this.stop();
      return;
    }

    // Réinitialiser le timer seulement si l'onglet est visible
    if (!document.hidden) {
      this.resetTimer();
    }
  }

  /**
   * Gère les changements de visibilité de l'onglet
   */
  private onVisibilityChange(): void {
    if (!this.appState.isAuthenticated()) {
      this.stop();
      return;
    }

    if (document.hidden) {
      // L'onglet est caché, ne pas réinitialiser le timer
      // Le timer continue de tourner
    } else {
      // L'onglet est visible, vérifier si le timeout est dépassé
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      if (timeSinceLastActivity >= this.timeoutDuration) {
        // Le timeout est dépassé, déconnecter immédiatement
        this.handleTimeout();
      } else {
        // Réinitialiser le timer avec le temps restant
        const remainingTime = this.timeoutDuration - timeSinceLastActivity;
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }
        this.ngZone.runOutsideAngular(() => {
          this.timeoutId = setTimeout(() => {
            this.ngZone.run(() => {
              this.handleTimeout();
            });
          }, remainingTime);
        });
      }
    }
  }

  /**
   * Gère le timeout et déconnecte l'utilisateur
   */
  private handleTimeout(): void {
    // Vérifier une dernière fois si l'utilisateur est toujours authentifié
    // (au cas où il se serait déconnecté entre-temps)
    if (!this.appState.isAuthenticated()) {
      this.stop();
      return;
    }

    console.warn('Session expirée après 5 minutes d\'inactivité. Déconnexion automatique...');
    
    // Arrêter la surveillance
    this.stop();

    // Déconnecter l'utilisateur
    this.appState.logout();

    // Rediriger vers la page de login
    this.router.navigate(['/login'], {
      queryParams: { timeout: 'true' }
    });
  }

  /**
   * Vérifie si le service est actif
   */
  isActive(): boolean {
    return this.timeoutId !== null;
  }
}

