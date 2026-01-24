// rectangles.component.ts
import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  selected: boolean;
}

@Component({
  selector: 'app-rectangles',
  template: `
    <div #canvasWrapper style="width: 100vw; height: 100vh; position: relative;">
      <canvas
        #canvas
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (mouseleave)="onMouseLeave($event)"
        (wheel)="onWheel($event)"
        [attr.width]="canvasWidth"
        [attr.height]="canvasHeight"
        [style.cursor]="cursorStyle"
        style="display: block; background: #f9f9f9; border: none;">
      </canvas>
    </div>

    <!-- Keep your UI controls outside the canvas area -->
    <div style="position: absolute; top: 10px; left: 10px; z-index: 10;">
      <button (click)="spawnMode = true" [class.active]="spawnMode">Spawn Mode</button>
      <button (click)="spawnMode = false" [class.active]="!spawnMode">Pan/Select Mode</button>
      <p *ngIf="spawnMode" style="color: white; margin-top: 5px;">Click to spawn rectangles</p>
      <p *ngIf="!spawnMode" style="color: white; margin-top: 5px;">
        • Hold SPACE + drag to pan<br>• Click rectangles to select<br>• Drag white handles to resize
      </p>
    </div>
  `,
  styles: [`
    button {
      margin: 0 5px;
      padding: 6px 12px;
      background: #e0e0e0;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
    }
    button.active {
      background: #2196F3;
      color: white;
    }
    button:hover:not(.active) {
      background: #d0d0d0;
    }
  `]
})
export class RectanglesComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private rectangles: Rectangle[] = [];

  // Add these properties
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  // Panning state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private offsetX = 0;
  private offsetY = 0;

  // Interaction state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private selectedRect: Rectangle | null = null;
  private resizeHandle: { type: string; rect: Rectangle } | null = null;

  // Resize handle size
  private readonly HANDLE_SIZE = 8;

  // Modes
  spawnMode = true;
  cursorStyle = 'default';

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.updateCanvasSize(); // Initialize size
    this.draw();
    this.addDemoRectangles();
  }

  // Add window resize handler
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateCanvasSize();
    this.draw();
  }

  private updateCanvasSize() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
  }

  private addDemoRectangles() {
    this.rectangles.push(
      { x: 100, y: 100, width: 120, height: 80, color: '#4CAF50', selected: false },
      { x: 300, y: 200, width: 100, height: 100, color: '#2196F3', selected: false },
      { x: 500, y: 150, width: 150, height: 60, color: '#FF9800', selected: false }
    );
    this.draw();
  }

  onMouseDown(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to world coordinates
    const worldX = x - this.offsetX;
    const worldY = y - this.offsetY;

    // Handle panning (space + drag)
    console.log(event.buttons, event.getModifierState('Space'));

    if (event.buttons === 1 && event.getModifierState('Alt')) {
      this.isPanning = true;
      this.lastPanX = x;
      this.lastPanY = y;
      this.cursorStyle = 'grabbing';
      return;
    }

    // Spawn mode
    if (this.spawnMode) {
      this.spawnRectangle(worldX, worldY);
      return;
    }

    // Check if clicked on a resize handle
    for (const rect of this.rectangles) {
      if (rect.selected) {
        const handle = this.getHandleAt(worldX, worldY, rect);
        if (handle) {
          this.resizeHandle = { type: handle, rect };
          this.isDragging = true;
          this.dragStartX = worldX;
          this.dragStartY = worldY;
          this.cursorStyle = this.getResizeCursor(handle);
          return;
        }
      }
    }

    // Check if clicked inside any rectangle
    let clickedRect: Rectangle | null = null;
    for (let i = this.rectangles.length - 1; i >= 0; i--) {
      const r = this.rectangles[i];
      if (worldX >= r.x && worldX <= r.x + r.width &&
        worldY >= r.y && worldY <= r.y + r.height) {
        clickedRect = r;
        break;
      }
    }

    // Update selection state
    this.rectangles.forEach(r => r.selected = (r === clickedRect));
    this.selectedRect = clickedRect;
    this.draw();
  }

  onMouseMove(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to world coordinates
    const worldX = x - this.offsetX;
    const worldY = y - this.offsetY;

    // Panning
    if (this.isPanning) {
      const dx = x - this.lastPanX;
      const dy = y - this.lastPanY;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastPanX = x;
      this.lastPanY = y;
      this.draw();
      return;
    }

    // Update cursor during hover (in select mode)
    if (!this.spawnMode && !this.isDragging) {
      let cursor = 'default';
      for (const rect of this.rectangles) {
        if (rect.selected) {
          const handle = this.getHandleAt(worldX, worldY, rect);
          if (handle) {
            cursor = this.getResizeCursor(handle);
            break;
          }
        }
      }
      this.cursorStyle = cursor;
    }

    // Resizing
    if (this.isDragging && this.resizeHandle) {
      this.resizeRectangle(this.resizeHandle.rect, this.resizeHandle.type, worldX, worldY);
      this.draw();
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isPanning = false;
    this.isDragging = false;
    this.resizeHandle = null;
    this.cursorStyle = 'default';
  }

  onMouseLeave(event: MouseEvent) {
    this.isPanning = false;
    this.isDragging = false;
    this.resizeHandle = null;
    this.cursorStyle = 'default';
  }

  onWheel(event: WheelEvent) {
    // Optional: Add zoom functionality here in the future
    event.preventDefault();
  }

  private getHandleAt(x: number, y: number, rect: Rectangle): string | null {
    const hs = this.HANDLE_SIZE;
    const corners = [
      { type: 'nw', x: rect.x, y: rect.y },
      { type: 'ne', x: rect.x + rect.width, y: rect.y },
      { type: 'sw', x: rect.x, y: rect.y + rect.height },
      { type: 'se', x: rect.x + rect.width, y: rect.y + rect.height }
    ];

    for (const corner of corners) {
      if (x >= corner.x - hs/2 && x <= corner.x + hs/2 &&
        y >= corner.y - hs/2 && y <= corner.y + hs/2) {
        return corner.type;
      }
    }
    return null;
  }

  private getResizeCursor(handleType: string): string {
    const cursors: Record<string, string> = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize'
    };
    return cursors[handleType] || 'default';
  }

  private resizeRectangle(rect: Rectangle, handleType: string, mouseX: number, mouseY: number) {
    const minWidth = 20;
    const minHeight = 20;

    switch(handleType) {
      case 'se':
        rect.width = Math.max(minWidth, mouseX - rect.x);
        rect.height = Math.max(minHeight, mouseY - rect.y);
        break;

      case 'sw':
        const newWidth = rect.x + rect.width - mouseX;
        if (newWidth >= minWidth) {
          rect.x = mouseX;
          rect.width = newWidth;
        }
        rect.height = Math.max(minHeight, mouseY - rect.y);
        break;

      case 'ne':
        rect.width = Math.max(minWidth, mouseX - rect.x);
        const newHeight = rect.y + rect.height - mouseY;
        if (newHeight >= minHeight) {
          rect.y = mouseY;
          rect.height = newHeight;
        }
        break;

      case 'nw':
        const newW = rect.x + rect.width - mouseX;
        const newH = rect.y + rect.height - mouseY;
        if (newW >= minWidth) {
          rect.x = mouseX;
          rect.width = newW;
        }
        if (newH >= minHeight) {
          rect.y = mouseY;
          rect.height = newH;
        }
        break;
    }
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pan offset
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);

    // Draw grid (optional visual aid)
    this.drawGrid();

    // Draw all rectangles
    this.rectangles.forEach(rect => {
      // Fill
      this.ctx.fillStyle = rect.color;
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      // Border
      this.ctx.strokeStyle = rect.selected ? '#FF5722' : '#000';
      this.ctx.lineWidth = rect.selected ? 2 : 1;
      this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      // Draw resize handles if selected
      if (rect.selected) {
        this.drawResizeHandles(rect);
      }
    });

    this.ctx.restore();
  }

  private drawGrid() {
    const canvas = this.canvasRef.nativeElement;
    const gridSize = 50;
    this.ctx.strokeStyle = '#eee';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = -this.offsetX % gridSize; x < canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = -this.offsetY % gridSize; y < canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawResizeHandles(rect: Rectangle) {
    const hs = this.HANDLE_SIZE;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x, y: rect.y + rect.height },
      { x: rect.x + rect.width, y: rect.y + rect.height }
    ];

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;

    corners.forEach(corner => {
      this.ctx.fillRect(corner.x - hs/2, corner.y - hs/2, hs, hs);
      this.ctx.strokeRect(corner.x - hs/2, corner.y - hs/2, hs, hs);
    });
  }

  spawnRectangle(x: number, y: number) {
    const width = Math.floor(Math.random() * 80) + 40;
    const height = Math.floor(Math.random() * 80) + 40;
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 70%, 60%)`;

    this.rectangles.push({
      x, y, width, height, color, selected: false
    });
    this.draw();
  }


}
