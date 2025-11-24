import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

export interface PopupConfig {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  showCancelButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  linesSaved?: number;
}

@Component({
  selector: 'app-modern-popup',
  templateUrl: './modern-popup.component.html',
  styleUrls: ['./modern-popup.component.scss']
})
export class ModernPopupComponent implements OnInit, OnDestroy {
  @Input() config: PopupConfig;
  @Input() isVisible: boolean = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
    // Empêcher le scroll du body quand le popup est ouvert
    if (this.isVisible) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    // Restaurer le scroll du body
    document.body.style.overflow = 'auto';
  }

  onConfirm(): void {
    this.confirm.emit();
    this.closePopup();
  }

  onCancel(): void {
    this.cancel.emit();
    this.closePopup();
  }

  onClose(): void {
    this.close.emit();
    this.closePopup();
  }

  private closePopup(): void {
    this.isVisible = false;
    document.body.style.overflow = 'auto';
  }

  // Méthode pour obtenir l'icône selon le type
  getIcon(type?: string): string {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'confirm': return '❓';
      case 'info':
      default: return 'ℹ️';
    }
  }

  // Méthode statique pour afficher un popup d'information
  static showInfo(message: string, title: string = 'Information'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'info'
    });
  }

  // Méthode statique pour afficher un popup de succès
  static showSuccess(message: string, title: string = 'Succès'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'success'
    });
  }

  // Méthode statique pour afficher un popup d'avertissement
  static showWarning(message: string, title: string = 'Avertissement'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'warning'
    });
  }

  // Méthode statique pour afficher un popup d'erreur
  static showError(message: string, title: string = 'Erreur'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'error'
    });
  }

  // Méthode statique pour afficher un popup de confirmation
  static showConfirm(message: string, title: string = 'Confirmation'): Promise<boolean> {
    return this.showPopup({
      title,
      message,
      type: 'confirm',
      showCancelButton: true,
      cancelText: 'Annuler',
      confirmText: 'Confirmer'
    });
  }

  // Méthode statique pour afficher un popup de sauvegarde
  static showSaveSuccess(linesSaved: number = 1): Promise<void> {
    return this.showPopup({
      title: 'Sauvegarde',
      message: 'Toutes les sélections ont été sauvegardées.',
      type: 'success',
      linesSaved
    });
  }

  public static showPopup(config: PopupConfig): Promise<any> {
    return new Promise((resolve) => {
      // Créer un élément popup dynamiquement
      const popupElement = document.createElement('div');
      popupElement.className = 'modern-popup-overlay';
      // Déterminer l'icône selon le type
      const getIcon = (type: string) => {
        switch(type) {
          case 'success': return '✅';
          case 'error': return '❌';
          case 'warning': return '⚠️';
          case 'confirm': return '❓';
          case 'info':
          default: return 'ℹ️';
        }
      };
      
      const icon = getIcon(config.type || 'info');
      
      popupElement.innerHTML = `
        <div class="modern-popup popup-type-${config.type || 'info'}">
          <div class="popup-header">
            <div class="popup-title-wrapper">
              <span class="popup-icon">${icon}</span>
              <h3 class="popup-title">${config.title || 'Notification'}</h3>
            </div>
            <button class="popup-close" aria-label="Fermer">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${config.message}</p>
            ${config.linesSaved ? `<p class="popup-lines-saved">📊 Lignes sauvegardées: <strong>${config.linesSaved}</strong></p>` : ''}
          </div>
          <div class="popup-actions">
            ${config.showCancelButton ? `<button class="popup-btn popup-btn-cancel">${config.cancelText || 'Annuler'}</button>` : ''}
            <button class="popup-btn popup-btn-confirm popup-btn-${config.type || 'info'}">${config.confirmText || 'OK'}</button>
          </div>
        </div>
      `;

      // Ajouter les styles CSS
      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modern-popup {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
          max-width: 450px;
          width: 90%;
          animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .popup-type-info {
          border-top: 4px solid #007bff;
        }

        .popup-type-success {
          border-top: 4px solid #28a745;
        }

        .popup-type-warning {
          border-top: 4px solid #ffc107;
        }

        .popup-type-error {
          border-top: 4px solid #dc3545;
        }

        .popup-type-confirm {
          border-top: 4px solid #6c757d;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 16px 24px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        }

        .popup-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .popup-icon {
          font-size: 24px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .popup-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #212529;
          letter-spacing: -0.02em;
        }

        .popup-close {
          background: rgba(0, 0, 0, 0.05);
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: #6c757d;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 300;
          line-height: 1;
        }

        .popup-close:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #212529;
          transform: rotate(90deg);
        }

        .popup-close:active {
          transform: rotate(90deg) scale(0.95);
        }

        .popup-content {
          padding: 20px 24px;
        }

        .popup-message {
          margin: 0 0 12px 0;
          color: #495057;
          line-height: 1.6;
          font-size: 15px;
        }

        .popup-lines-saved {
          margin: 16px 0 0 0;
          padding: 12px;
          background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
          border-radius: 8px;
          color: #2e7d32;
          font-size: 14px;
          border-left: 3px solid #4caf50;
        }

        .popup-lines-saved strong {
          font-weight: 700;
          font-size: 16px;
        }

        .popup-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 24px 24px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .popup-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 100px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .popup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .popup-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .popup-btn-cancel {
          background: white;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .popup-btn-cancel:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
          color: #495057;
        }

        .popup-btn-confirm {
          color: white;
        }

        .popup-btn-info {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        }

        .popup-btn-info:hover {
          background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
        }

        .popup-btn-success {
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%) !important;
        }

        .popup-btn-success:hover {
          background: linear-gradient(135deg, #1e7e34 0%, #155724 100%) !important;
        }

        .popup-btn-warning {
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
          color: #212529;
        }

        .popup-btn-warning:hover {
          background: linear-gradient(135deg, #e0a800 0%, #d39e00 100%);
        }

        .popup-btn-error {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
        }

        .popup-btn-error:hover {
          background: linear-gradient(135deg, #c82333 0%, #bd2130 100%) !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(popupElement);

      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';

      // Nettoyer les styles après fermeture
      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };

      // Ajouter les event listeners pour la fermeture
      popupElement.addEventListener('click', (e) => {
        if (e.target === popupElement) {
          popupElement.remove();
          cleanup();
          resolve(false);
        }
      });

      // Ajouter les event listeners pour les boutons
      const closeButton = popupElement.querySelector('.popup-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        });
      }

      const cancelButton = popupElement.querySelector('.popup-btn-cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        });
      }

      const confirmButton = popupElement.querySelector('.popup-btn-confirm');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(true);
        });
      }

      // Gérer la fermeture avec Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  // Popup avec champ texte (input)
  static showTextInput(message: string, title: string = 'Saisie', defaultValue: string = '', placeholder: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <input type="text" class="popup-input" placeholder="${placeholder || ''}" value="${defaultValue || ''}" />
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .popup-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const input = overlay.querySelector('.popup-input') as HTMLInputElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (input) setTimeout(() => input.focus(), 0);
      if (okBtn) okBtn.addEventListener('click', () => close(input ? input.value : ''));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (input) input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close(input!.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  static showDateInput(message: string, title: string = 'Sélectionner une date', defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const effectiveDefault = (() => {
        const candidate = (defaultValue || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
          return candidate;
        }
        const parsed = new Date(candidate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
      })();

      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <input type="date" class="popup-input" value="${effectiveDefault}" />
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .popup-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const input = overlay.querySelector('.popup-input') as HTMLInputElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (input) setTimeout(() => input.focus(), 0);
      if (okBtn) okBtn.addEventListener('click', () => close(input ? (input.value || '').trim() || effectiveDefault : effectiveDefault));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (input) input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close((input.value || '').trim() || effectiveDefault); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  // Popup avec sélection (select)
  static showSelectInput(message: string, title: string = 'Sélection', options: string[] = [], defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      
      const optionsHtml = options.map(option => 
        `<option value="${option}" ${option === defaultValue ? 'selected' : ''}>${option}</option>`
      ).join('');
      
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <select class="popup-select">
              ${optionsHtml}
            </select>
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: white; }
        .popup-select:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const select = overlay.querySelector('.popup-select') as HTMLSelectElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (okBtn) okBtn.addEventListener('click', () => close(select ? select.value : ''));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (select) select.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close(select!.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  // Popup avec autocomplétion (input + datalist)
  static showAutocompleteInput(message: string, title: string = 'Sélection', options: string[] = [], defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      
      const datalistId = `autocomplete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optionsHtml = options.map(option => 
        `<option value="${option}">${option}</option>`
      ).join('');
      
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <input type="text" class="popup-autocomplete-input" list="${datalistId}" value="${defaultValue}" placeholder="Rechercher ou sélectionner..." autocomplete="off" />
            <datalist id="${datalistId}">
              ${optionsHtml}
            </datalist>
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-autocomplete-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: white; }
        .popup-autocomplete-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const input = overlay.querySelector('.popup-autocomplete-input') as HTMLInputElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (input) {
        setTimeout(() => {
          input.focus();
          // Sélectionner tout le texte pour faciliter la modification
          input.select();
        }, 0);
      }
      if (okBtn) okBtn.addEventListener('click', () => close(input ? (input.value || '').trim() || defaultValue : defaultValue));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (input) input.addEventListener('keydown', (e) => { 
        if ((e as KeyboardEvent).key === 'Enter') {
          close((input.value || '').trim() || defaultValue);
        }
      });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }
}
