import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Rectangle } from './rectangle.model';

@Component({
  selector: 'app-rectangle',
  template: '',
})
export class RectangleComponent {
  @Input() rect!: Rectangle;
  @Output() select = new EventEmitter<Rectangle>();
  @Output() resize = new EventEmitter<{
    rect: Rectangle;
    handle: string;
    worldX: number;
    worldY: number;
  }>();
  @Output() spawn = new EventEmitter<{ x: number; y: number }>();

  readonly HANDLE_SIZE = 8;
  readonly MIN_FONT_SIZE = 12;
  readonly MAX_FONT_SIZE = 32;

  getHandleAt(worldX: number, worldY: number): string | null {
    const hs = this.HANDLE_SIZE;
    const corners = [
      { type: 'nw', x: this.rect.x, y: this.rect.y },
      { type: 'ne', x: this.rect.x + this.rect.width, y: this.rect.y },
      { type: 'sw', x: this.rect.x, y: this.rect.y + this.rect.height },
      { type: 'se', x: this.rect.x + this.rect.width, y: this.rect.y + this.rect.height },
    ];

    for (const corner of corners) {
      if (
        worldX >= corner.x - hs / 2 &&
        worldX <= corner.x + hs / 2 &&
        worldY >= corner.y - hs / 2 &&
        worldY <= corner.y + hs / 2
      ) {
        return corner.type;
      }
    }
    return null;
  }

  getResizeCursor(handleType: string): string {
    const cursors: Record<string, string> = {
      nw: 'nw-resize',
      ne: 'ne-resize',
      sw: 'sw-resize',
      se: 'se-resize',
    };
    return cursors[handleType] || 'default';
  }

  resizeRectangle(handleType: string, worldX: number, worldY: number) {
    const minWidth = 20;
    const minHeight = 20;

    switch (handleType) {
      case 'se':
        this.rect.width = Math.max(minWidth, worldX - this.rect.x);
        this.rect.height = Math.max(minHeight, worldY - this.rect.y);
        break;
      case 'sw':
        const newWidth = this.rect.x + this.rect.width - worldX;
        if (newWidth >= minWidth) {
          this.rect.x = worldX;
          this.rect.width = newWidth;
        }
        this.rect.height = Math.max(minHeight, worldY - this.rect.y);
        break;
      case 'ne':
        this.rect.width = Math.max(minWidth, worldX - this.rect.x);
        const newHeight = this.rect.y + this.rect.height - worldY;
        if (newHeight >= minHeight) {
          this.rect.y = worldY;
          this.rect.height = newHeight;
        }
        break;
      case 'nw':
        const newW = this.rect.x + this.rect.width - worldX;
        const newH = this.rect.y + this.rect.height - worldY;
        if (newW >= minWidth) {
          this.rect.x = worldX;
          this.rect.width = newW;
        }
        if (newH >= minHeight) {
          this.rect.y = worldY;
          this.rect.height = newH;
        }
        break;
    }
  }

  private getFontSize(ctx: CanvasRenderingContext2D): number {
    const maxWidth = this.rect.width - 10;
    const maxHeight = this.rect.height - 10;

    let fontSize = this.MAX_FONT_SIZE;
    ctx.font = `${fontSize}px Arial`;

    while (
      (ctx.measureText(this.rect.text).width > maxWidth || fontSize > maxHeight) &&
      fontSize > this.MIN_FONT_SIZE
    ) {
      fontSize--;
      ctx.font = `${fontSize}px Arial`;
    }

    return fontSize;
  }

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean) {
    ctx.fillStyle = this.rect.color;
    ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

    ctx.strokeStyle = isSelected ? '#FF5722' : '#000';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

    if (this.rect.text) {
      const fontSize = this.getFontSize(ctx);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = this.getTextColor();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const centerX = this.rect.x + this.rect.width / 2;
      const centerY = this.rect.y + this.rect.height / 2;
      ctx.fillText(this.rect.text, centerX, centerY);
    }

    if (isSelected) {
      this.drawResizeHandles(ctx);
    }
  }

  private getTextColor(): string {
    const hex = this.rect.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000' : '#fff';
  }

  private drawResizeHandles(ctx: CanvasRenderingContext2D) {
    const hs = this.HANDLE_SIZE;
    const corners = [
      { x: this.rect.x, y: this.rect.y },
      { x: this.rect.x + this.rect.width, y: this.rect.y },
      { x: this.rect.x, y: this.rect.y + this.rect.height },
      { x: this.rect.x + this.rect.width, y: this.rect.y + this.rect.height },
    ];

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    corners.forEach((corner) => {
      ctx.fillRect(corner.x - hs / 2, corner.y - hs / 2, hs, hs);
      ctx.strokeRect(corner.x - hs / 2, corner.y - hs / 2, hs, hs);
    });
  }
}
