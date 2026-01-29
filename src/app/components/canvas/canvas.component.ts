import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {Rectangle} from '../rectangle/rectangle.model';
import {CanvasService} from '../../services/canvas.service';
import {TextEditorService} from '../../services/text-editor.service';

type Point = { x: number; y: number };

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvas', {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper', {static: true}) wrapperRef!: ElementRef<HTMLDivElement>;

  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  cursorStyle = 'default';

  connectionMode = false;

  private isDraggingRect = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private isConnecting = false;
  private connectionStartRect: Rectangle | null = null;
  private tempConnection: { from: Point; to: Point } | null = null;
  private potentialTarget: Rectangle | null = null;

  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private isDragging = false;
  private isEditingText = false;
  private currentHandle: { type: string; rect: Rectangle } | null = null;

  constructor(
    public canvasService: CanvasService,
    public textEditor: TextEditorService,
  ) {
  }

  toggleConnectionMode() {
    this.connectionMode = !this.connectionMode;
    this.canvasService.spawnMode = false;
  }

  private drawTempConnection() {
    if (!this.tempConnection) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    ctx.save();
    ctx.translate(this.canvasService.offsetX, this.canvasService.offsetY);

    const { from, to } = this.tempConnection;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx1 = from.x + dx * 0.3;
    const cy1 = from.y;
    const cx2 = from.x + dx * 0.7;
    const cy2 = to.y;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, to.x, to.y);

    const strokeColor = this.potentialTarget ? '#4CAF50' : '#FF5722';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.potentialTarget) {
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.potentialTarget.x,
        this.potentialTarget.y,
        this.potentialTarget.width,
        this.potentialTarget.height
      );
    }

    ctx.restore();
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

    setTimeout(() => {
      this.canvasService.draw();
    })
  }

  private updateCanvasSize() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
  }

  onMouseDown(event: MouseEvent) {
    if (this.isPanning) {
      this.pan(event);
      return;
    }

    const world = this.getWorldPos(event);

    if (this.connectionMode) {
      const clickedRect = this.getRectAt(world.x, world.y);
      if (clickedRect) {
        this.isConnecting = true;
        this.connectionStartRect = clickedRect;
        this.tempConnection = {
          from: {
            x: clickedRect.x + clickedRect.width,
            y: clickedRect.y + clickedRect.height / 2
          },
          to: {x: world.x, y: world.y}
        };

        this.canvasService.draw();
        this.drawTempConnection();
      }
      return;
    }

    if (this.connectionMode) {
      const world = this.getWorldPos(event);
      const clickedRect = this.getRectAt(world.x, world.y);

      if (clickedRect) {
        if (!this.connectionStartRect) {
          this.connectionStartRect = clickedRect;
          this.tempConnection = {
            from: {
              x: clickedRect.x + clickedRect.width,
              y: clickedRect.y + clickedRect.height / 2
            },
            to: {x: world.x, y: world.y}
          };
          this.canvasService.draw();
          this.drawTempConnection();
        } else if (this.connectionStartRect.id !== clickedRect.id) {
          this.canvasService.createConnector(
            this.connectionStartRect.id,
            clickedRect.id
          );
          this.resetConnectionState();
          this.canvasService.draw();
        }
      } else {
        this.resetConnectionState();
        this.canvasService.draw();
      }
      return;
    }

    if (this.canvasService.spawnMode) {
      this.canvasService.spawnRectangle(world.x, world.y);
      this.canvasService.draw();
      return;
    }

    const selectedRect = this.canvasService.rectangles.find(r => r.selected);

    if (selectedRect) {
      const clickedInside = (
        world.x >= selectedRect.x &&
        world.x <= selectedRect.x + selectedRect.width &&
        world.y >= selectedRect.y &&
        world.y <= selectedRect.y + selectedRect.height
      );

      const handle = this.getHandleAt(world.x, world.y, selectedRect);

      if (clickedInside && !handle) {
        this.isDraggingRect = true;
        this.dragOffsetX = world.x - selectedRect.x;
        this.dragOffsetY = world.y - selectedRect.y;
        return;
      }

      if (handle) {
        this.currentHandle = { type: handle, rect: selectedRect };
        this.isDragging = true;
        this.cursorStyle = this.getResizeCursor(handle);
        return;
      }
    }

    this.selectRectangleOrDeselect(world.x, world.y);

    this.selectRectangleOrDeselect(world.x, world.y);
  }


  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.pan(event);
      return;
    }

    const world = this.getWorldPos(event);

    if (this.isDraggingRect) {
      const selectedRect = this.canvasService.rectangles.find(r => r.selected);
      if (selectedRect) {
        selectedRect.x = world.x - this.dragOffsetX;
        selectedRect.y = world.y - this.dragOffsetY;
        this.canvasService.draw();
      }
      return;
    }

    if (this.isConnecting) {
      if (this.tempConnection) {
        this.tempConnection.to = { x: world.x, y: world.y };
      }

      this.potentialTarget = null;
      if (this.connectionStartRect) {
        const hoveredRect = this.getRectAt(world.x, world.y);
        if (hoveredRect && hoveredRect.id !== this.connectionStartRect.id) {
          this.potentialTarget = hoveredRect;
        }
      }

      this.canvasService.draw();
      this.drawTempConnection();
      return;
    }

    if (this.isPanning) {
      this.pan(event);
      return;
    }

    if (!this.canvasService.spawnMode && !this.isEditingText) {
      this.updateCursor(event);
    }

    if (!this.canvasService.spawnMode && !this.isDragging && !this.isEditingText) {
      this.updateCursor(event);
    }

    if (this.isDragging && this.currentHandle) {
      this.resizeRectangle(event);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isPanning = false;
    this.isDragging = false;
    this.isDraggingRect = false;
    this.currentHandle = null;

    if (this.isConnecting) {
      if (this.potentialTarget && this.connectionStartRect) {
        this.canvasService.createConnector(
          this.connectionStartRect.id,
          this.potentialTarget.id
        );
      }

      this.resetConnectionState();
      this.canvasService.draw();
      return;
    }

    this.isPanning = false;
    this.isDragging = false;
    this.currentHandle = null;
    this.cursorStyle = 'default';
  }

  private resetConnectionState() {
    this.isConnecting = false;
    this.connectionStartRect = null;
    this.tempConnection = null;
    this.potentialTarget = null;
  }

  onMouseLeave(event: MouseEvent) {
    this.isPanning = false;
    this.isDragging = false;
    this.isDraggingRect = false;
    this.isConnecting = false;
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

  private getWorldPos(event: MouseEvent) {
    const canvasRect = this.canvasService.getCanvasRect();
    return this.canvasService.screenToWorld(event.clientX, event.clientY, canvasRect);
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
      world.y,
    );
    this.canvasService.draw();
  }

  private selectRectangleOrDeselect(x: number, y: number) {
    const clickedRect = this.getRectAt(x, y);

    this.canvasService.rectangles.forEach((r) => (r.selected = false));

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
      },
    );
  }

  private updateCursor(event: MouseEvent) {
    const world = this.getWorldPos(event);
    let cursor = 'default';

    const selectedRect = this.canvasService.rectangles.find(r => r.selected);
    if (selectedRect) {
      const handle = this.getHandleAt(world.x, world.y, selectedRect);
      if (handle) {
        cursor = this.getResizeCursor(handle);
      }
      else if (
        world.x >= selectedRect.x &&
        world.x <= selectedRect.x + selectedRect.width &&
        world.y >= selectedRect.y &&
        world.y <= selectedRect.y + selectedRect.height
      ) {
        cursor = 'move';
      }
    }

    this.cursorStyle = cursor;
  }
  private getHandleAt(x: number, y: number, rect: Rectangle): string | null {
    const hs = 8;
    const corners = [
      {type: 'nw', x: rect.x, y: rect.y},
      {type: 'ne', x: rect.x + rect.width, y: rect.y},
      {type: 'sw', x: rect.x, y: rect.y + rect.height},
      {type: 'se', x: rect.x + rect.width, y: rect.y + rect.height},
    ];

    for (const corner of corners) {
      if (
        x >= corner.x - hs / 2 &&
        x <= corner.x + hs / 2 &&
        y >= corner.y - hs / 2 &&
        y <= corner.y + hs / 2
      ) {
        return corner.type;
      }
    }
    return null;
  }

  private getResizeCursor(handleType: string): string {
    const cursors: Record<string, string> = {
      nw: 'nw-resize',
      ne: 'ne-resize',
      sw: 'sw-resize',
      se: 'se-resize',
    };
    return cursors[handleType] || 'default';
  }
}
