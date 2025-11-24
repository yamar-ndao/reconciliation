import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SessionTimeoutService } from './services/session-timeout.service';
import { AppStateService } from './services/app-state.service';

@Component({
    selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  showSidebar = true;
  isLoginPage = false;
  title = 'reconciliation-app';

  constructor(
    private router: Router,
    private sessionTimeout: SessionTimeoutService,
    private appState: AppStateService
  ) {}

    ngOnInit() {
    // Vérifier l'URL initiale pour masquer le sidebar si on est sur la page de login
    this.updateSidebarVisibility(this.router.url);
    
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.updateSidebarVisibility(event.urlAfterRedirects);
      // Gérer le timeout de session selon la page
      this.manageSessionTimeout();
      // Forcer le recalcul du layout après navigation (corrige le bug d'affichage trop large)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    });
    // S'assurer que le scroll fonctionne
    this.enableMouseScroll();
    // Gérer le timeout de session au démarrage
    this.manageSessionTimeout();
  }

  ngOnDestroy(): void {
    // Arrêter le timeout lors de la destruction du composant
    this.sessionTimeout.stop();
  }

  private updateSidebarVisibility(url: string): void {
    this.isLoginPage = url === '/login' || url.startsWith('/login');
    this.showSidebar = !this.isLoginPage;
  }

  /**
   * Gère le démarrage/arrêt du timeout de session
   */
  private manageSessionTimeout(): void {
    if (this.isLoginPage) {
      // Arrêter le timeout sur la page de login
      this.sessionTimeout.stop();
    } else if (this.appState.isAuthenticated()) {
      // Démarrer le timeout si l'utilisateur est authentifié
      this.sessionTimeout.start();
    } else {
      // Arrêter le timeout si l'utilisateur n'est pas authentifié
      this.sessionTimeout.stop();
    }
  }

  private enableMouseScroll() {
    // Détecter Chrome
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    // Styles de base pour tous les navigateurs
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    
    // Spécifique Chrome
    if (isChrome) {
      document.documentElement.style.overflowY = 'auto';
      
      // Correction après un délai pour Chrome
      setTimeout(() => {
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        
        // S'assurer que tous les éléments sont scrollables
        const allElements = document.querySelectorAll('*');
        allElements.forEach((element: any) => {
          if (element && element.style && element.style.overflowY === 'hidden') {
            element.style.overflowY = 'auto';
          }
        });
      }, 1000);
    }
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
    // Forcer le recalcul du layout après toggle
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  // Les méthodes de navigation ne sont plus nécessaires ici
  // car elles sont gérées par les routerLink dans la sidebar.
} 