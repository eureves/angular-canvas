import { Injectable } from '@angular/core';
import { Rectangle } from '../components/rectangle/rectangle.model';

@Injectable({ providedIn: 'root' })
export class RectangleManager {
  private ctx!: CanvasRenderingContext2D;
  private readonly HANDLE_SIZE = 8;
  private readonly MIN_FONT_SIZE = 12;
  private readonly MAX_FONT_SIZE = 32;

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  createRandom(x: number, y: number): Rectangle {
    const width = Math.floor(Math.random() * 80) + 40;
    const height = Math.floor(Math.random() * 80) + 40;
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 0%, 95%)`;
    const texts = ['New', 'Item', 'Box', 'Text', 'Rect'];
    const text = texts[Math.floor(Math.random() * texts.length)];
    return { id: '', x, y, width, height, color, selected: false, text };
  }

  draw(rect: Rectangle, isSelected: boolean) {
    const radius = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(rect.x + radius, rect.y);
    this.ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
    this.ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
    this.ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
    this.ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
    this.ctx.closePath();

    this.ctx.fillStyle = rect.color;
    this.ctx.fill();

    this.ctx.strokeStyle = isSelected ? '#FF5722' : '#000';
    this.ctx.lineWidth = isSelected ? 2 : 1;
    this.ctx.stroke();

    if (rect.text) {
      const fontSize = this.getFontSize(rect);
      this.ctx.font = `bold ${fontSize}px Arial`;
      this.ctx.fillStyle = this.getTextColor(rect.color);
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        rect.text,
        rect.x + rect.width / 2,
        rect.y + rect.height / 2
      );
    }

    if (isSelected) this.drawResizeHandles(rect);
  }

  resizeRectangle(rect: Rectangle, handleType: string, worldX: number, worldY: number) {
    const minWidth = 20;
    const minHeight = 20;

    switch (handleType) {
      case 'se':
        rect.width = Math.max(minWidth, worldX - rect.x);
        rect.height = Math.max(minHeight, worldY - rect.y);
        break;

      case 'sw':
        const newWidth = rect.x + rect.width - worldX;
        if (newWidth >= minWidth) {
          rect.x = worldX;
          rect.width = newWidth;
        }
        rect.height = Math.max(minHeight, worldY - rect.y);
        break;

      case 'ne':
        rect.width = Math.max(minWidth, worldX - rect.x);
        const newHeight = rect.y + rect.height - worldY;
        if (newHeight >= minHeight) {
          rect.y = worldY;
          rect.height = newHeight;
        }
        break;

      case 'nw':
        const newW = rect.x + rect.width - worldX;
        const newH = rect.y + rect.height - worldY;
        if (newW >= minWidth) {
          rect.x = worldX;
          rect.width = newW;
        }
        if (newH >= minHeight) {
          rect.y = worldY;
          rect.height = newH;
        }
        break;
    }
  }

  private getFontSize(rect: Rectangle): number {
    const maxWidth = rect.width - 10;
    const maxHeight = rect.height - 10;
    let fontSize = this.MAX_FONT_SIZE;
    this.ctx.font = `${fontSize}px Arial`;

    while (
      (this.ctx.measureText(rect.text).width > maxWidth || fontSize > maxHeight) &&
      fontSize > this.MIN_FONT_SIZE
    ) {
      fontSize--;
      this.ctx.font = `${fontSize}px Arial`;
    }
    return fontSize;
  }

  private getTextColor(hex: string): string {
    return '#000';
  }

  private drawResizeHandles(rect: Rectangle) {
    const hs = this.HANDLE_SIZE;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x, y: rect.y + rect.height },
      { x: rect.x + rect.width, y: rect.y + rect.height },
    ];

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;

    corners.forEach((corner) => {
      this.ctx.fillRect(corner.x - hs / 2, corner.y - hs / 2, hs, hs);
      this.ctx.strokeRect(corner.x - hs / 2, corner.y - hs / 2, hs, hs);
    });
  }
}
