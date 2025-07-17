package com.reconciliation.service;

import com.reconciliation.entity.*;
import com.reconciliation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ProfilService {
    @Autowired
    private ProfilRepository profilRepository;
    @Autowired
    private ModuleRepository moduleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private ProfilPermissionRepository profilPermissionRepository;
    @Autowired
    private ModulePermissionRepository modulePermissionRepository;

    // CRUD Profil
    public List<ProfilEntity> getAllProfils() { return profilRepository.findAll(); }
    public Optional<ProfilEntity> getProfil(Long id) { return profilRepository.findById(id); }
    public ProfilEntity createProfil(ProfilEntity profil) { return profilRepository.save(profil); }
    public void deleteProfil(Long id) { profilRepository.deleteById(id); }

    // Modules
    public List<ModuleEntity> getAllModules() { return moduleRepository.findAll(); }
    public ModuleEntity createModule(ModuleEntity module) { return moduleRepository.save(module); }

    // Permissions
    public List<PermissionEntity> getAllPermissions() { return permissionRepository.findAll(); }
    public PermissionEntity createPermission(PermissionEntity permission) { return permissionRepository.save(permission); }

    // Attribution de permissions à un profil
    public ProfilPermissionEntity addPermissionToProfil(Long profilId, Long moduleId, Long permissionId) {
        ProfilEntity profil = profilRepository.findById(profilId).orElseThrow();
        ModuleEntity module = moduleRepository.findById(moduleId).orElseThrow();
        PermissionEntity permission = permissionRepository.findById(permissionId).orElseThrow();
        ProfilPermissionEntity pp = new ProfilPermissionEntity();
        pp.setProfil(profil);
        pp.setModule(module);
        pp.setPermission(permission);
        return profilPermissionRepository.save(pp);
    }

    public void removePermissionFromProfil(Long profilPermissionId) {
        profilPermissionRepository.deleteById(profilPermissionId);
    }

    public List<ProfilPermissionEntity> getPermissionsForProfil(Long profilId) {
        return profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getProfil().getId().equals(profilId))
            .toList();
    }

    // Actions disponibles pour un module
    public List<PermissionEntity> getPermissionsForModule(Long moduleId) {
        List<ModulePermissionEntity> modulePermissions = modulePermissionRepository.findByModuleId(moduleId);
        
        // Si des permissions spécifiques sont définies pour ce module, les retourner
        if (!modulePermissions.isEmpty()) {
            return modulePermissions.stream()
                .map(ModulePermissionEntity::getPermission)
                .toList();
        }
        
        // Sinon, retourner toutes les permissions disponibles
        return permissionRepository.findAll();
    }
} 