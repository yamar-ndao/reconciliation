import { Component, OnInit } from '@angular/core';
import { ProfilService } from '../../services/profil.service';
import { Profil } from '../../models/profil.model';
import { ModuleMenu } from '../../models/module.model';
import { Permission } from '../../models/permission.model';
import { ProfilPermission } from '../../models/profil-permission.model';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  profils: Profil[] = [];
  modules: ModuleMenu[] = [];
  permissions: Permission[] = [];
  profilPermissions: ProfilPermission[] = [];
  selectedProfil: Profil | null = null;
  newProfilName = '';
  newModuleName = '';
  newPermissionName = '';
  selectedPermissionName = '';
  selectedModuleId: number | '' = '';
  availableModulePermissions: Permission[] = [];
  loadingModulePermissions = false;

  // Liste statique des menus principaux de l'application
  appMenus = [
    'Dashboard',
    'Traitement',
    'Réconciliation',
    'Résultats',
    'Statistiques',
    'Classements',
    'Comptes',
    'Opérations',
    'Frais',
    'Utilisateur',
    'Profil',
    'Log utilisateur'
  ];
  selectedMenuName = '';

  constructor(private profilService: ProfilService) {}

  ngOnInit(): void {
    this.loadProfils();
    this.loadModules();
    this.loadPermissions();
  }

  loadProfils() {
    this.profilService.getProfils().subscribe(p => this.profils = p);
  }
  loadModules() {
    this.profilService.getModules().subscribe(m => this.modules = m);
  }
  loadPermissions() {
    this.profilService.getPermissions().subscribe(a => this.permissions = a);
  }

  selectProfil(profil: Profil) {
    this.selectedProfil = profil;
    this.profilService.getProfilPermissions(profil.id!).subscribe(pp => this.profilPermissions = pp);
  }

  createProfil() {
    if (this.newProfilName.trim()) {
      this.profilService.createProfil({ nom: this.newProfilName }).subscribe(() => {
        this.newProfilName = '';
        this.loadProfils();
      });
    }
  }

  deleteProfil(profil: Profil) {
    if (profil.id && confirm('Supprimer ce profil ?')) {
      this.profilService.deleteProfil(profil.id).subscribe(() => {
        this.selectedProfil = null;
        this.loadProfils();
      });
    }
  }

  createModule() {
    if (this.selectedMenuName && !this.modules.some(m => m.nom === this.selectedMenuName) && this.selectedProfil) {
      this.profilService.createModule({ nom: this.selectedMenuName }).subscribe(module => {
        this.selectedMenuName = '';
        this.loadModules();
        // Associer toutes les permissions existantes à ce profil pour ce module
        this.permissions.forEach(permission => {
          this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
            this.profilPermissions.push(pp);
          });
        });
      });
    }
  }

  deleteModule(module: ModuleMenu) {
    // À implémenter côté backend si besoin, ici on retire juste du tableau pour la démo
    if (confirm('Supprimer ce menu ?')) {
      // Si un endpoint delete existe côté backend, décommentez la ligne suivante :
      // this.profilService.deleteModule(module.id!).subscribe(() => this.loadModules());
      this.modules = this.modules.filter(m => m.id !== module.id);
    }
  }

  createPermission() {
    if (this.newPermissionName.trim()) {
      this.profilService.createPermission({ nom: this.newPermissionName }).subscribe(() => {
        this.newPermissionName = '';
        this.loadPermissions();
      });
    }
  }

  permissionExists(name: string): boolean {
    return this.permissions.some(p => p.nom.toLowerCase() === name.toLowerCase());
  }

  addExistingPermission() {
    if (this.selectedPermissionName && !this.permissionExists(this.selectedPermissionName)) {
      this.profilService.createPermission({ nom: this.selectedPermissionName }).subscribe(() => {
        this.selectedPermissionName = '';
        this.loadPermissions();
      });
    }
  }

  permissionExistsForModule(name: string): boolean {
    if (!this.selectedModuleId) return false;
    const module = this.modules.find(m => m.id === +this.selectedModuleId);
    const permission = this.availableModulePermissions.find(p => p.nom.toLowerCase() === name.toLowerCase());
    if (!module || !permission) return false;
    return this.profilPermissions.some(pp => pp.module.id === module.id && pp.permission.id === permission.id);
  }

  addExistingPermissionToModule() {
    if (this.selectedProfil && this.selectedModuleId && this.selectedPermissionName) {
      const profilId = this.selectedProfil.id!;
      const module = this.modules.find(m => m.id === +this.selectedModuleId);
      const permission = this.availableModulePermissions.find(p => p.nom === this.selectedPermissionName);
      if (module && permission && !this.permissionExistsForModule(permission.nom)) {
        this.profilService.addPermissionToProfil(profilId, module.id!, permission.id!).subscribe(pp => {
          this.profilPermissions.push(pp);
          // Rafraîchir la liste des permissions du profil
          this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
        });
      }
      this.selectedPermissionName = '';
    }
  }

  createPermissionForModule() {
    if (this.selectedProfil && this.selectedModuleId && this.newPermissionName) {
      const profilId = this.selectedProfil.id!;
      this.profilService.createPermission({ nom: this.newPermissionName }).subscribe(permission => {
        const module = this.modules.find(m => m.id === +this.selectedModuleId);
        if (module && permission) {
          this.profilService.addPermissionToProfil(profilId, module.id!, permission.id!).subscribe(pp => {
            this.profilPermissions.push(pp);
            // Rafraîchir les listes
            this.loadPermissions();
            this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
            // Recharger les permissions du module
            this.onModuleChange();
          });
        }
        this.newPermissionName = '';
      });
    }
  }

  hasPermission(module: ModuleMenu, permission: Permission): boolean {
    return this.profilPermissions.some(pp =>
      pp.module.id === module.id && pp.permission.id === permission.id
    );
  }

  togglePermission(module: ModuleMenu, permission: Permission, event: Event) {
    if (!this.selectedProfil) return;
    const checked = (event.target as HTMLInputElement).checked;
    const existing = this.profilPermissions.find(pp =>
      pp.module.id === module.id && pp.permission.id === permission.id
    );
    if (checked && !existing) {
      this.profilService.addPermissionToProfil(this.selectedProfil.id!, module.id!, permission.id!).subscribe(pp => {
        this.profilPermissions.push(pp);
      });
    } else if (!checked && existing && existing.id) {
      this.profilService.removePermissionFromProfil(existing.id).subscribe(() => {
        this.profilPermissions = this.profilPermissions.filter(pp => pp.id !== existing.id);
      });
    }
  }

  menuExists(menu: string): boolean {
    return this.modules.some(m => m.nom === menu);
  }

  getAssociatedModules(): ModuleMenu[] {
    const moduleIds = new Set(this.profilPermissions.map(pp => pp.module.id));
    return this.modules.filter(m => moduleIds.has(m.id));
  }

  onModuleChange() {
    // Réinitialiser la sélection de permission
    this.selectedPermissionName = '';
    
    if (this.selectedModuleId) {
      console.log('Chargement des permissions pour le module:', this.selectedModuleId);
      this.loadingModulePermissions = true;
      this.profilService.getPermissionsForModule(+this.selectedModuleId).subscribe({
        next: (perms) => {
          console.log('Permissions chargées:', perms);
          this.availableModulePermissions = perms;
          this.loadingModulePermissions = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des permissions:', error);
          // En cas d'erreur, utiliser toutes les permissions disponibles
          this.availableModulePermissions = this.permissions;
          this.loadingModulePermissions = false;
        }
      });
    } else {
      this.availableModulePermissions = [];
      this.loadingModulePermissions = false;
    }
  }
} 