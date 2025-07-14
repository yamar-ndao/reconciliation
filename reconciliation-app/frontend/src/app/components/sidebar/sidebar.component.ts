import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  showParamSubmenu = false;

  constructor(
    private http: HttpClient,
    private router: Router
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
} 