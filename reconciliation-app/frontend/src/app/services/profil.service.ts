import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profil } from '../models/profil.model';
import { ModuleMenu } from '../models/module.model';
import { Permission } from '../models/permission.model';
import { ProfilPermission } from '../models/profil-permission.model';

@Injectable({ providedIn: 'root' })
export class ProfilService {
  private apiUrl = '/api/profils';

  constructor(private http: HttpClient) {}

  // Profils
  getProfils(): Observable<Profil[]> {
    return this.http.get<Profil[]>(this.apiUrl);
  }
  createProfil(profil: Profil): Observable<Profil> {
    return this.http.post<Profil>(this.apiUrl, profil);
  }
  deleteProfil(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Modules
  getModules(): Observable<ModuleMenu[]> {
    return this.http.get<ModuleMenu[]>(`${this.apiUrl}/modules`);
  }
  createModule(module: ModuleMenu): Observable<ModuleMenu> {
    return this.http.post<ModuleMenu>(`${this.apiUrl}/modules`, module);
  }

  // Permissions
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`);
  }
  createPermission(permission: Permission): Observable<Permission> {
    return this.http.post<Permission>(`${this.apiUrl}/permissions`, permission);
  }

  getPermissionsForModule(moduleId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/modules/${moduleId}/permissions`);
  }

  // Droits d’un profil
  getProfilPermissions(profilId: number): Observable<ProfilPermission[]> {
    return this.http.get<ProfilPermission[]>(`${this.apiUrl}/${profilId}/droits`);
  }
  addPermissionToProfil(profilId: number, moduleId: number, permissionId: number): Observable<ProfilPermission> {
    return this.http.post<ProfilPermission>(`${this.apiUrl}/${profilId}/droits?moduleId=${moduleId}&permissionId=${permissionId}`, {});
  }
  removePermissionFromProfil(profilPermissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/droits/${profilPermissionId}`);
  }
} 