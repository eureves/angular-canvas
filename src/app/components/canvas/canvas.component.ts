// canvas/canvas.component.ts
import {Component, ViewChild, ElementRef, AfterViewInit, HostListener} from '@angular/core';
import {Rectangle} from '../rectangle/rectangle.model';
import {CanvasService} from '../../services/canvas.service';
import {TextEditorService} from '../../services/text-editor.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvas', {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper', {static: true}) wrapperRef!: ElementRef<HTMLDivElement>;

  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  cursorStyle = 'default';

  // Interaction state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private isDragging = false;
  private isEditingText = false;
  private currentHandle: { type: string; rect: Rectangle } | null = null;

  constructor(
    public canvasService: CanvasService,
    public textEditor: TextEditorService
  ) {
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    this.canvasService.init(canvas, ctx);
    this.textEditor.init();

    this.updateCanvasSize();
    this.canvasService.addDemoRectangles();
    this.canvasService.draw();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateCanvasSize();
    this.canvasService.draw();
  }

  private updateCanvasSize() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
  }

  // ===== EVENT HANDLERS =====
  onMouseDown(event: MouseEvent) {
    if (event.buttons === 1 && event.altKey) {
      this.startPanning(event);
      return;
    }

    const world = this.getWorldPos(event);
    if (this.canvasService.spawnMode) {
      this.canvasService.spawnRectangle(world.x, world.y);
      this.canvasService.draw();
      return;
    }

    // Check for resize handle click
    if (this.checkResizeHandleClick(world)) {
      return;
    }

    // Select rectangle or deselect
    this.selectRectangleOrDeselect(world.x, world.y);
  }

  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.pan(event);
      return;
    }

    if (!this.canvasService.spawnMode && !this.isDragging && !this.isEditingText) {
      this.updateCursor(event);
    }

    if (this.isDragging && this.currentHandle) {
      this.resizeRectangle(event);
    }
  }

  onMouseUp() {
    this.isPanning = false;
    this.isDragging = false;
    this.currentHandle = null;
    this.cursorStyle = 'default';
  }

  onMouseLeave() {
    this.isPanning = false;
    this.isDragging = false;
    this.currentHandle = null;
    this.cursorStyle = 'default';
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
  }

  onDoubleClick(event: MouseEvent) {
    if (this.canvasService.spawnMode || this.isEditingText) return;

    const world = this.getWorldPos(event);
    const rect = this.getRectAt(world.x, world.y);
    if (rect) {
      this.startTextEditing(rect);
    }
  }

  // ===== PRIVATE HELPERS =====
  private getWorldPos(event: MouseEvent) {
    const canvasRect = this.canvasService.getCanvasRect();
    return this.canvasService.screenToWorld(
      event.clientX,
      event.clientY,
      canvasRect
    );
  }

  private startPanning(event: MouseEvent) {
    this.isPanning = true;
    this.lastPanX = event.clientX;
    this.lastPanY = event.clientY;
    this.cursorStyle = 'grabbing';
  }

  private pan(event: MouseEvent) {
    const dx = event.clientX - this.lastPanX;
    const dy = event.clientY - this.lastPanY;
    this.canvasService.offsetX += dx;
    this.canvasService.offsetY += dy;
    this.lastPanX = event.clientX;
    this.lastPanY = event.clientY;
    this.canvasService.draw();
  }

  private checkResizeHandleClick(world: { x: number; y: number }): boolean {
    for (const rect of this.canvasService.rectangles) {
      if (rect.selected) {
        const handleType = this.getHandleAt(world.x, world.y, rect);
        if (handleType) {
          this.currentHandle = {type: handleType, rect};
          this.isDragging = true;
          this.cursorStyle = this.getResizeCursor(handleType);
          return true;
        }
      }
    }
    return false;
  }

  private resizeRectangle(event: MouseEvent) {
    if (!this.currentHandle) return;

    const world = this.getWorldPos(event);
    this.canvasService.resizeRectangle(
      this.currentHandle.rect,
      this.currentHandle.type,
      world.x,
      world.y
    );
    this.canvasService.draw();
  }

  private selectRectangleOrDeselect(x: number, y: number) {
    const clickedRect = this.getRectAt(x, y);

    this.canvasService.rectangles.forEach(r => r.selected = false);

    if (clickedRect) {
      clickedRect.selected = true;
    }

    this.canvasService.draw();
  }

  private getRectAt(x: number, y: number): Rectangle | null {
    for (let i = this.canvasService.rectangles.length - 1; i >= 0; i--) {
      const r = this.canvasService.rectangles[i];
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return r;
      }
    }
    return null;
  }

  private startTextEditing(rect: Rectangle) {
    this.isEditingText = true;
    const canvasRect = this.canvasService.getCanvasRect();

    this.textEditor.startEdit(
      rect.text,
      rect.x + this.canvasService.offsetX + canvasRect.left,
      rect.y + this.canvasService.offsetY + canvasRect.top,
      rect.width,
      rect.height,
      (newText: string) => {
        rect.text = newText;
        this.isEditingText = false;
        this.canvasService.draw();
      }
    );
  }

  // 👇 ADDED MISSING METHOD
  private updateCursor(event: MouseEvent) {
    const world = this.getWorldPos(event);
    let cursor = 'default';

    // Check for resize handles on selected rectangles
    for (const rect of this.canvasService.rectangles) {
      if (rect.selected) {
        const handle = this.getHandleAt(world.x, world.y, rect);
        if (handle) {
          cursor = this.getResizeCursor(handle);
          break;
        }
      }
    }

    this.cursorStyle = cursor;
  }

  // Handle detection helpers
  private getHandleAt(x: number, y: number, rect: Rectangle): string | null {
    const hs = 8;
    const corners = [
      {type: 'nw', x: rect.x, y: rect.y},
      {type: 'ne', x: rect.x + rect.width, y: rect.y},
      {type: 'sw', x: rect.x, y: rect.y + rect.height},
      {type: 'se', x: rect.x + rect.width, y: rect.y + rect.height}
    ];

    for (const corner of corners) {
      if (x >= corner.x - hs / 2 && x <= corner.x + hs / 2 &&
        y >= corner.y - hs / 2 && y <= corner.y + hs / 2) {
        return corner.type;
      }
    }
    return null;
  }

  private getResizeCursor(handleType: string): string {
    const cursors: Record<string, string> = {
      'nw': 'nw-resize', 'ne': 'ne-resize',
      'sw': 'sw-resize', 'se': 'se-resize'
    };
    return cursors[handleType] || 'default';
  }
}
