import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  newUser: User = { username: '', password: '' };
  editingUser: User | null = null;
  isCreating = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des utilisateurs';
        console.error('Error loading users:', error);
      }
    });
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isCreating = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (user) => {
        this.users.push(user);
        this.newUser = { username: '', password: '' };
        this.isCreating = false;
        this.successMessage = 'Utilisateur créé avec succès';
        this.clearMessages();
      },
      error: (error) => {
        this.isCreating = false;
        this.errorMessage = 'Erreur lors de la création de l\'utilisateur';
        console.error('Error creating user:', error);
        this.clearMessages();
      }
    });
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.isEditing = true;
  }

  updateUser(): void {
    if (!this.editingUser || !this.editingUser.username) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.userService.updateUser(this.editingUser.id!, this.editingUser).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.cancelEdit();
        this.successMessage = 'Utilisateur mis à jour avec succès';
        this.clearMessages();
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la mise à jour de l\'utilisateur';
        console.error('Error updating user:', error);
        this.clearMessages();
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.username}" ?`)) {
      this.userService.deleteUser(user.id!).subscribe({
        next: (success) => {
          if (success) {
            this.users = this.users.filter(u => u.id !== user.id);
            this.successMessage = 'Utilisateur supprimé avec succès';
            this.clearMessages();
          } else {
            this.errorMessage = 'Impossible de supprimer cet utilisateur';
            this.clearMessages();
          }
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression de l\'utilisateur';
          console.error('Error deleting user:', error);
          this.clearMessages();
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.isEditing = false;
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 3000);
  }
} 