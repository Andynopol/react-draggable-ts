import Draggable from "../../components/Draggable";
import DraggableCore from "../../components/DraggableCore";
import { Bounds, ControlPosition, DraggableData, MouseTouchEvent } from "../../types";
import { getTouch, offsetXYFromParent } from "./domFns";
import { int, isNum } from "./shims";


export function canDragX ( draggable: Draggable ): boolean {
  return draggable.props.axis === 'both' || draggable.props.axis === 'x';
}

export function canDragY ( draggable: Draggable ): boolean {
  return draggable.props.axis === 'both' || draggable.props.axis === 'y';
}

export function getControlPosition ( e: MouseTouchEvent, touchIdentifier: number | null | undefined, draggableCore: DraggableCore ): ControlPosition | null {
  const touchObj = typeof touchIdentifier === 'number' ? getTouch( e, touchIdentifier ) : null;
  if ( typeof touchIdentifier === 'number' && !touchObj ) return null; // not the right touch
  const node = findDOMNode( draggableCore );
  // User can provide an offsetParent if desired.
  const offsetParent = draggableCore.props.offsetParent || ( node as HTMLElement ).offsetParent || ( node as HTMLElement ).ownerDocument.body;
  return offsetXYFromParent( touchObj || e, offsetParent as HTMLElement, draggableCore.props.scale );
}


function findDOMNode ( draggable: DraggableCore | Draggable ): HTMLElement | Node {
  const node = draggable.findDOMNode();
  if ( !node ) {
    throw new Error( '<DraggableCore>: Unmounted during event!' );
  }
  return node;
}

export function createCoreData ( draggable: DraggableCore, x: number, y: number ): DraggableData {
  const state = draggable.state;
  const isStart = !isNum( state.lastX );
  const node = findDOMNode( draggable ) as HTMLElement;

  if ( isStart ) {
    // If this is our first move, use the x and y as last coords.
    return {
      node,
      deltaX: 0, deltaY: 0,
      lastX: x, lastY: y,
      x, y,
    };
  } else {
    // Otherwise calculate proper values.
    return {
      node,
      deltaX: x - state.lastX, deltaY: y - state.lastY,
      lastX: state.lastX, lastY: state.lastY,
      x, y,
    };
  }
}

export function createDraggableData ( draggable: Draggable, coreData: DraggableData ): DraggableData {
  const scale = draggable.props.scale;
  return {
    node: coreData.node,
    x: draggable.state.x + ( coreData.deltaX / scale ),
    y: draggable.state.y + ( coreData.deltaY / scale ),
    deltaX: ( coreData.deltaX / scale ),
    deltaY: ( coreData.deltaY / scale ),
    lastX: draggable.state.x,
    lastY: draggable.state.y
  };
}

export function getBoundPosition ( draggable: Draggable, x: number, y: number ): [ number, number ] {
  // If no bounds, short-circuit and move on
  if ( !draggable.props.bounds ) return [ x, y ];

  // Clone new bounds
  let { bounds } = draggable.props;
  bounds = typeof bounds === 'string' ? bounds : cloneBounds( bounds as Bounds );
  const node = findDOMNode( draggable ) as HTMLElement;

  if ( typeof bounds === 'string' ) {
    const { ownerDocument } = node;
    const ownerWindow = ownerDocument!.defaultView;
    let boundNode;
    if ( bounds === 'parent' ) {
      boundNode = node.parentNode;
    } else {
      boundNode = ownerDocument!.querySelector( bounds );
    }
    if ( !( boundNode instanceof ownerWindow!.HTMLElement ) ) {
      throw new Error( 'Bounds selector "' + bounds + '" could not find an element.' );
    }
    const boundNodeEl: HTMLElement = boundNode; // for Flow, can't seem to refine correctly
    const nodeStyle = ownerWindow!.getComputedStyle( node as HTMLElement );
    const boundNodeStyle = ownerWindow!.getComputedStyle( boundNodeEl );
    // Compute bounds. This is a pain with padding and offsets but this gets it exactly right.
    bounds = {
      left: -node.offsetLeft + int( boundNodeStyle.paddingLeft ) + int( nodeStyle.marginLeft ),
      top: -node.offsetTop + int( boundNodeStyle.paddingTop ) + int( nodeStyle.marginTop ),
      right: innerWidth( boundNodeEl ) - outerWidth( node ) - node.offsetLeft +
        int( boundNodeStyle.paddingRight ) - int( nodeStyle.marginRight ),
      bottom: innerHeight( boundNodeEl ) - outerHeight( node ) - node.offsetTop +
        int( boundNodeStyle.paddingBottom ) - int( nodeStyle.marginBottom )
    };
  }

  // Keep x and y below right and bottom limits...
  if ( isNum( bounds.right ) ) x = Math.min( x, bounds.right as number );
  if ( isNum( bounds.bottom ) ) y = Math.min( y, bounds.bottom as number );

  // But above left and top limits.
  if ( isNum( bounds.left ) ) x = Math.max( x, bounds.left as number );
  if ( isNum( bounds.top ) ) y = Math.max( y, bounds.top as number );

  return [ x, y ];
}

export function snapToGrid ( grid: [ number, number ], pendingX: number, pendingY: number ): [ number, number ] {
  const x = Math.round( pendingX / grid[ 0 ] ) * grid[ 0 ];
  const y = Math.round( pendingY / grid[ 1 ] ) * grid[ 1 ];
  return [ x, y ];
}

function cloneBounds ( bounds: Bounds ): Bounds {
  return {
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom
  };
}


export function innerHeight ( node: HTMLElement ): number {
  let height = node.clientHeight;
  const computedStyle = node.ownerDocument.defaultView!.getComputedStyle( node );
  height -= int( computedStyle.paddingTop );
  height -= int( computedStyle.paddingBottom );
  return height;
}

export function outerHeight ( node: HTMLElement ): number {
  // This is deliberately excluding margin for our calculations, since we are using
  // offsetTop which is including margin. See getBoundPosition
  let height = node.clientHeight;
  const computedStyle = node.ownerDocument.defaultView!.getComputedStyle( node );
  height += int( computedStyle.borderTopWidth );
  height += int( computedStyle.borderBottomWidth );
  return height;
}

export function outerWidth ( node: HTMLElement ): number {
  // This is deliberately excluding margin for our calculations, since we are using
  // offsetLeft which is including margin. See getBoundPosition
  let width = node.clientWidth;
  const computedStyle = node.ownerDocument.defaultView!.getComputedStyle( node );
  width += int( computedStyle.borderLeftWidth );
  width += int( computedStyle.borderRightWidth );
  return width;
}

export function innerWidth ( node: HTMLElement ): number {
  let width = node.clientWidth;
  const computedStyle = node.ownerDocument.defaultView!.getComputedStyle( node );
  width -= int( computedStyle.paddingLeft );
  width -= int( computedStyle.paddingRight );
  return width;
}