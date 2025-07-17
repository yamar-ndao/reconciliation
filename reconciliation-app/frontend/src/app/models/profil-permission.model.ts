import { Profil } from './profil.model';
import { ModuleMenu } from './module.model';
import { Permission } from './permission.model';

export interface ProfilPermission {
  id?: number;
  profil: Profil;
  module: ModuleMenu;
  permission: Permission;
} 