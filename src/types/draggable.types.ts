// eslint-disable-next-line no-use-before-define
export type DraggableEventHandler = ( e: MouseEvent, data: DraggableData ) => void | boolean;

export type DraggableData = {
  node: HTMLElement,
  x: number, y: number,
  deltaX: number, deltaY: number,
  lastX: number, lastY: number;
};

export type Bounds = {
  left?: number, top?: number, right?: number, bottom?: number;
};
export type ControlPosition = { x: number, y: number; };
export type PositionOffsetControlPosition = { x: number | string, y: number | string; };
export type EventHandler<T> = ( e: T ) => void | boolean;

// Missing targetTouches
interface TouchEvent2 extends TouchEvent {
  changedTouches: TouchList;
  targetTouches: TouchList;
}

export type MouseTouchEvent = MouseEvent & TouchEvent2;


export interface EventWithOffset {
  clientX: number, clientY: number;
}
