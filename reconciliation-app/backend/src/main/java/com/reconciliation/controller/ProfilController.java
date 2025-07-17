package com.reconciliation.controller;

import com.reconciliation.entity.*;
import com.reconciliation.service.ProfilService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/profils")
@CrossOrigin(origins = "http://localhost:4200")
public class ProfilController {
    @Autowired
    private ProfilService profilService;

    // Profils
    @GetMapping
    public List<ProfilEntity> getAllProfils() {
        return profilService.getAllProfils();
    }

    @PostMapping
    public ProfilEntity createProfil(@RequestBody ProfilEntity profil) {
        return profilService.createProfil(profil);
    }

    @DeleteMapping("/{id}")
    public void deleteProfil(@PathVariable Long id) {
        profilService.deleteProfil(id);
    }

    // Modules
    @GetMapping("/modules")
    public List<ModuleEntity> getAllModules() {
        return profilService.getAllModules();
    }

    @PostMapping("/modules")
    public ModuleEntity createModule(@RequestBody ModuleEntity module) {
        return profilService.createModule(module);
    }

    // Permissions
    @GetMapping("/permissions")
    public List<PermissionEntity> getAllPermissions() {
        return profilService.getAllPermissions();
    }

    @PostMapping("/permissions")
    public PermissionEntity createPermission(@RequestBody PermissionEntity permission) {
        return profilService.createPermission(permission);
    }

    // Attribution de droits à un profil
    @PostMapping("/{profilId}/droits")
    public ProfilPermissionEntity addPermissionToProfil(
            @PathVariable Long profilId,
            @RequestParam Long moduleId,
            @RequestParam Long permissionId) {
        return profilService.addPermissionToProfil(profilId, moduleId, permissionId);
    }

    @DeleteMapping("/droits/{profilPermissionId}")
    public void removePermissionFromProfil(@PathVariable Long profilPermissionId) {
        profilService.removePermissionFromProfil(profilPermissionId);
    }

    @GetMapping("/{profilId}/droits")
    public List<ProfilPermissionEntity> getPermissionsForProfil(@PathVariable Long profilId) {
        return profilService.getPermissionsForProfil(profilId);
    }

    @GetMapping("/modules/{moduleId}/permissions")
    public List<PermissionEntity> getPermissionsForModule(@PathVariable Long moduleId) {
        return profilService.getPermissionsForModule(moduleId);
    }

    @GetMapping("/diagnostic")
    public Map<String, Object> diagnostic() {
        Map<String, Object> diagnostic = new HashMap<>();
        
        // Compter les modules
        List<ModuleEntity> modules = profilService.getAllModules();
        diagnostic.put("modulesCount", modules.size());
        diagnostic.put("modules", modules.stream().map(m -> Map.of("id", m.getId(), "nom", m.getNom())).toList());
        
        // Compter les permissions
        List<PermissionEntity> permissions = profilService.getAllPermissions();
        diagnostic.put("permissionsCount", permissions.size());
        diagnostic.put("permissions", permissions.stream().map(p -> Map.of("id", p.getId(), "nom", p.getNom())).toList());
        
        // Compter les associations module-permission
        long modulePermissionCount = 0;
        for (ModuleEntity module : modules) {
            List<PermissionEntity> modulePermissions = profilService.getPermissionsForModule(module.getId());
            modulePermissionCount += modulePermissions.size();
        }
        diagnostic.put("modulePermissionAssociations", modulePermissionCount);
        
        return diagnostic;
    }
} 