import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TextEditorService {
  private input!: HTMLInputElement;
  private onSave!: (text: string) => void;

  init() {
    if (this.input) return;

    this.input = document.createElement('input');
    Object.assign(this.input.style, {
      position: 'absolute',
      zIndex: '100',
      opacity: '0',
      pointerEvents: 'none',
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save();
    });
    this.input.addEventListener('blur', () => this.save());

    document.body.appendChild(this.input);
  }

  startEdit(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onSave: (text: string) => void,
  ) {
    this.onSave = onSave;
    this.input.value = text;
    Object.assign(this.input.style, {
      left: `${x + 4}px`,
      top: `${y + 4}px`,
      width: `${width - 8}px`,
      height: `${height - 8}px`,
      opacity: '1',
      pointerEvents: 'auto',
    });
    this.input.focus();
    this.input.select();
  }

  private save() {
    this.onSave?.(this.input.value);
    this.input.style.opacity = '0';
    this.input.style.pointerEvents = 'none';
  }
}
