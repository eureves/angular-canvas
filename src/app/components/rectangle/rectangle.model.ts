export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  selected: boolean;
  text: string;
}

export interface Connector {
  id: string;
  fromRectId: string;
  toRectId: string;
}
