import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-popup',
  templateUrl: './progress-popup.component.html',
  styleUrls: ['./progress-popup.component.scss']
})
export class ProgressPopupComponent {
  @Input() title: string = 'Traitement en cours...';
  @Input() progress: number = 0; // 0-100
  @Input() step: string = '';
  @Input() currentFile: number = 0;
  @Input() totalFiles: number = 0;
  @Input() message: string = 'Veuillez patienter, le traitement peut prendre quelques minutes...';
} 