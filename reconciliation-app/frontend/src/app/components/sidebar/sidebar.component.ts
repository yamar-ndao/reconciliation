import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  showParamSubmenu = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private appState: AppStateService
  ) { }

  ngOnInit(): void {
  }

  toggleParamSubmenu() {
    this.showParamSubmenu = !this.showParamSubmenu;
  }

  logout() {
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        // Même en cas d'erreur, on redirige vers login
        this.router.navigate(['/login']);
      }
    });
  }

  isMenuAllowed(menu: string): boolean {
    if (this.appState.isAdmin()) return true;
    return this.appState.isModuleAllowed(menu);
  }
} 