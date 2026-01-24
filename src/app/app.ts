import { Component, signal } from '@angular/core';
import { CanvasComponent } from './components/canvas/canvas.component';

@Component({
  selector: 'app-root',
  imports: [CanvasComponent],
  template: ` <app-canvas></app-canvas> `,
})
export class App {
  protected readonly title = signal('canvas');
}
