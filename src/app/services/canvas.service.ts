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

    this.connectors.forEach(connector => {
      const fromRect = this.rectangles.find(r => r.id === connector.fromRectId);
      const toRect = this.rectangles.find(r => r.id === connector.toRectId);

      if (fromRect && toRect) {
        const fromPoint = this.getConnectionPoint(fromRect, toRect);
        const toPoint = this.getConnectionPoint(toRect, fromRect, true);
        this.drawConnector(fromPoint, toPoint);
      }
    });

    this.rectangles.forEach(rect =>
      this.rectManager.draw(rect, rect.selected)
    );

    this.ctx.restore();
  }

  private getConnectionPoint(
    rect: Rectangle,
    targetRect: Rectangle,
    isTarget = false
  ): { x: number; y: number } {
    const sides = {
      left: { x: rect.x, y: rect.y + rect.height / 2 },
      right: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      top: { x: rect.x + rect.width / 2, y: rect.y },
      bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height }
    };

    const targetCenter = {
      x: targetRect.x + targetRect.width / 2,
      y: targetRect.y + targetRect.height / 2
    };

    let minDistance = Infinity;
    let bestSide = sides.right;

    for (const side of Object.values(sides)) {
      const dx = side.x - targetCenter.x;
      const dy = side.y - targetCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        bestSide = side;
      }
    }

    return bestSide;
  }

  private drawConnector(fromPoint: { x: number; y: number }, toPoint: { x: number; y: number }) {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const cx1 = fromPoint.x + dx * 0.3;
    const cy1 = fromPoint.y;
    const cx2 = fromPoint.x + dx * 0.7;
    const cy2 = toPoint.y;

    this.ctx.beginPath();
    this.ctx.moveTo(fromPoint.x, fromPoint.y);
    this.ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toPoint.x, toPoint.y);

    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.drawArrowhead(toPoint.x, toPoint.y, cx2, cy2);
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

  createConnector(fromRectId: string, toRectId: string) {
    if (fromRectId === toRectId) return;

    const exists = this.connectors.some(
      c => (c.fromRectId === fromRectId && c.toRectId === toRectId) ||
        (c.fromRectId === toRectId && c.toRectId === fromRectId)
    );

    if (!exists) {
      this.connectors.push({
        id: v4(),
        fromRectId,
        toRectId
      });
    }
  }

  resizeRectangle(rect: Rectangle, handleType: string, worldX: number, worldY: number) {
    this.rectManager.resizeRectangle(rect, handleType, worldX, worldY);
  }

  addDemoRectangles() {
    const rect1 = {
      id: v4(),
      x: 100, y: 100, width: 120, height: 80,
      color: '#4CAF50', selected: false, text: 'Start'
    };
    const rect2 = {
      id: v4(),
      x: 300, y: 200, width: 100, height: 100,
      color: '#2196F3', selected: false, text: 'Process'
    };

    this.rectangles.push(rect1, rect2);

    this.createConnector(rect1.id, rect2.id);
  }

  spawnRectangle(x: number, y: number) {
    const newRect = this.rectManager.createRandom(x, y);
    newRect.id = v4();
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
