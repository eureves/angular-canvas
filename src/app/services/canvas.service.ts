import {Injectable} from '@angular/core';
import {Rectangle} from '../components/rectangle/rectangle.model';
import {RectangleManager} from './rectangle-manager.service';

@Injectable({providedIn: 'root'})
export class CanvasService {
  rectangles: Rectangle[] = [];
  offsetX = 0;
  offsetY = 0;
  spawnMode = true;

  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;

  constructor(private rectManager: RectangleManager) {
  }

  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.rectManager.setContext(ctx);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);

    // this.drawGrid();

    this.rectangles.forEach(rect =>
      this.rectManager.draw(rect, rect.selected)
    );

    this.ctx.restore();
  }

  resizeRectangle(rect: Rectangle, handleType: string, worldX: number, worldY: number) {
    this.rectManager.resizeRectangle(rect, handleType, worldX, worldY);
  }

  addDemoRectangles() {
    this.rectangles.push(
      {x: 100, y: 100, width: 120, height: 80, color: '#4CAF50', selected: false, text: 'Hello'},
      {x: 300, y: 200, width: 100, height: 100, color: '#2196F3', selected: false, text: 'World'}
    );
  }

  spawnRectangle(x: number, y: number) {
    this.rectangles.push(this.rectManager.createRandom(x, y));
  }

  screenToWorld(clientX: number, clientY: number, canvasRect: DOMRect) {
    return {
      x: clientX - canvasRect.left - this.offsetX,
      y: clientY - canvasRect.top - this.offsetY
    };
  }

  getCanvasRect() {
    return this.canvas.getBoundingClientRect();
  }
}
