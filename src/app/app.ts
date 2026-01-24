import {Component, signal} from '@angular/core';
import {RectanglesComponent} from './components/canvas/canvas.component';

@Component({
  selector: 'app-root',
  imports: [
    RectanglesComponent
  ],
  template: `
    <app-rectangles></app-rectangles>
  `
})
export class App {
  protected readonly title = signal('canvas');
}
