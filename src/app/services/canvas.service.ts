import {Injectable} from '@angular/core';
import {Connector, Rectangle} from '../components/rectangle/rectangle.model';
import {RectangleManager} from './rectangle-manager.service';
import {v4} from 'uuid'

@Injectable({ providedIn: 'root' })
export class CanvasService {
  rectangles: Rectangle[] = [];
  connectors: Connector[] = [];
  offsetX = 0;
  offsetY = 0;
  spawnMode = true;

  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;

  constructor(private rectManager: RectangleManager) {}

  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.rectManager.setContext(ctx);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);

    // Draw connectors FIRST (so they appear behind rectangles)
    this.connectors.forEach(connector => {
      this.drawConnector(connector);
    });

    // Draw rectangles
    this.rectangles.forEach(rect =>
      this.rectManager.draw(rect, rect.selected)
    );

    this.ctx.restore();
  }

  private drawConnector(connector: Connector) {
    const start = connector.fromPoint;
    const end = connector.toPoint;

    // Calculate control points for curve
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const cx1 = start.x + dx * 0.3;
    const cy1 = start.y;
    const cx2 = start.x + dx * 0.7;
    const cy2 = end.y;

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.bezierCurveTo(cx1, cy1, cx2, cy2, end.x, end.y);

    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw arrowhead at end
    this.drawArrowhead(end.x, end.y, cx2, cy2);
  }

  private drawArrowhead(x: number, y: number, prevX: number, prevY: number) {
    const angle = Math.atan2(y - prevY, x - prevX);
    const headLength = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(
      x - headLength * Math.cos(angle - Math.PI / 6),
      y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(
      x - headLength * Math.cos(angle + Math.PI / 6),
      y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  // 👇 NEW METHOD: Create connector between rectangles
  createConnector(fromRectId: string, toRectId: string) {
    const fromRect = this.rectangles.find(r => r.id === fromRectId);
    const toRect = this.rectangles.find(r => r.id === toRectId);

    if (!fromRect || !toRect || fromRectId === toRectId) return;

    // Calculate connection points (center right → center left)
    const fromPoint = {
      x: fromRect.x + fromRect.width,
      y: fromRect.y + fromRect.height / 2
    };
    const toPoint = {
      x: toRect.x,
      y: toRect.y + toRect.height / 2
    };

    this.connectors.push({
      id: v4(),
      fromRectId,
      toRectId,
      fromPoint,
      toPoint
    });
  }

  resizeRectangle(rect: Rectangle, handleType: string, worldX: number, worldY: number) {
    this.rectManager.resizeRectangle(rect, handleType, worldX, worldY);
  }

  addDemoRectangles() {
    this.rectangles.push(
      {
        id: v4(),
        x: 100, y: 100, width: 120, height: 80,
        color: '#4CAF50', selected: false, text: 'Start'
      },
      {
        id: v4(),
        x: 300, y: 200, width: 100, height: 100,
        color: '#2196F3', selected: false, text: 'Process'
      }
    );

    // Add demo connector
    this.createConnector(this.rectangles[0].id, this.rectangles[1].id);
  }

  spawnRectangle(x: number, y: number) {
    const newRect = this.rectManager.createRandom(x, y);
    newRect.id = v4(); // 👈 Add ID
    this.rectangles.push(newRect);
  }

  screenToWorld(clientX: number, clientY: number, canvasRect: DOMRect) {
    return {
      x: clientX - canvasRect.left - this.offsetX,
      y: clientY - canvasRect.top - this.offsetY,
    };
  }

  getCanvasRect() {
    return this.canvas.getBoundingClientRect();
  }
}
