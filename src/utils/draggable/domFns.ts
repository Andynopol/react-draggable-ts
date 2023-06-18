import { ControlPosition, EventWithOffset, MouseTouchEvent, PositionOffsetControlPosition } from "../../types";
import browserPrefix, { browserPrefixToKey } from './getPrefix';
import { findInArray, int, isFunction } from "./shims";

export interface EnhancedNode extends Node {
  attachEvent?: Function;
  [ key: string ]: any;
}

export function addEvent ( el: EnhancedNode, event: string, handler: Function, inputOptions?: Object ): void {
  if ( !el ) return;
  const options = { capture: true, ...inputOptions };
  // $FlowIgnore[method-unbinding]
  if ( el.addEventListener ) {
    el.addEventListener( event, ( handler as EventListenerOrEventListenerObject ), options );
  } else if ( el.attachEvent ) {
    el.attachEvent( 'on' + event, handler );
  } else {
    // $FlowIgnore: Doesn't think elements are indexable
    el[ 'on' + event ] = handler;
  }
}

export function matchesSelectorAndParentsTo ( el: Node, selector: string, baseNode: Node ): boolean {
  let node = el;
  do {
    if ( matchesSelector( node, selector ) ) return true;
    if ( node === baseNode ) return false;
    node = node.parentNode as Node;
  } while ( node );

  return false;
}


export function matchesSelector ( el: EnhancedNode, selector: string ): boolean {
  const matchesSelectorFunc = findInArray( [
    'matches',
    'webkitMatchesSelector',
    'mozMatchesSelector',
    'msMatchesSelector',
    'oMatchesSelector'
  ], function ( method: string ) {
    // $FlowIgnore: Doesn't think elements are indexable
    return isFunction( el[ method ] );
  } );


  // Might not be found entirely (not an Element?) - in that case, bail
  // $FlowIgnore: Doesn't think elements are indexable
  if ( !isFunction( el[ matchesSelectorFunc ] ) ) return false;

  // $FlowIgnore: Doesn't think elements are indexable
  return el[ matchesSelectorFunc ]( selector );
}

export function getTouchIdentifier ( e: MouseTouchEvent ): number | undefined {
  if ( e.targetTouches && e.targetTouches[ 0 ] ) return e.targetTouches[ 0 ].identifier;
  if ( e.changedTouches && e.changedTouches[ 0 ] ) return e.changedTouches[ 0 ].identifier;
}

export function getTouch ( e: MouseTouchEvent, identifier: number ): { clientX: number, clientY: number; } {
  return ( e.targetTouches && findInArray( e.targetTouches, ( t: any ) => identifier === t.identifier ) ) ||
    ( e.changedTouches && findInArray( e.changedTouches, ( t: any ) => identifier === t.identifier ) );
}

export function offsetXYFromParent ( evt: EventWithOffset, offsetParent: HTMLElement, scale: number ): ControlPosition {
  const isBody = offsetParent === offsetParent.ownerDocument.body;
  const offsetParentRect = isBody ? { left: 0, top: 0 } : offsetParent.getBoundingClientRect();

  const x = ( evt.clientX + offsetParent.scrollLeft - offsetParentRect.left ) / scale;
  const y = ( evt.clientY + offsetParent.scrollTop - offsetParentRect.top ) / scale;

  return { x, y };
}

export function addUserSelectStyles ( doc: Document ) {
  if ( !doc ) return;
  let styleEl = doc.getElementById( 'react-draggable-style-el' );
  if ( !styleEl ) {
    styleEl = doc.createElement( 'style' );
    ( styleEl as any ).type = 'text/css';
    styleEl.id = 'react-draggable-style-el';
    styleEl.innerHTML = '.react-draggable-transparent-selection *::-moz-selection {all: inherit;}\n';
    styleEl.innerHTML += '.react-draggable-transparent-selection *::selection {all: inherit;}\n';
    doc.getElementsByTagName( 'head' )[ 0 ].appendChild( styleEl );
  }
  if ( doc.body ) addClassName( doc.body, 'react-draggable-transparent-selection' );
}

export function addClassName ( el: HTMLElement, className: string ) {
  if ( el.classList ) {
    el.classList.add( className );
  } else {
    if ( !el.className.match( new RegExp( `(?:^|\\s)${ className }(?!\\S)` ) ) ) {
      el.className += ` ${ className }`;
    }
  }
}

export function removeEvent ( el: EnhancedNode, event: string, handler: Function, inputOptions?: Object ): void {
  if ( !el ) return;
  const options = { capture: true, ...inputOptions };
  // $FlowIgnore[method-unbinding]
  if ( el.removeEventListener ) {
    el.removeEventListener( event, handler as EventListenerOrEventListenerObject, options );
  } else if ( el.detachEvent ) {
    el.detachEvent( 'on' + event, handler );
  } else {
    // $FlowIgnore: Doesn't think elements are indexable
    el[ 'on' + event ] = null;
  }
}

export function removeUserSelectStyles ( doc: Document ) {
  if ( !doc ) return;
  try {
    if ( doc.body ) removeClassName( doc.body, 'react-draggable-transparent-selection' );
    if ( doc.getSelection() ) {
      doc.getSelection()!.empty();
    } else {
      // Remove selection caused by scroll, unless it's a focused input
      // (we use doc.defaultView in case we're in an iframe)
      const selection = ( doc.defaultView || window ).getSelection();
      if ( selection && selection.type !== 'Caret' ) {
        selection.removeAllRanges();
      }
    }
  } catch ( e ) {
    // probably IE
  }
}

export function removeClassName ( el: HTMLElement, className: string ) {
  if ( el.classList ) {
    el.classList.remove( className );
  } else {
    el.className = el.className.replace( new RegExp( `(?:^|\\s)${ className }(?!\\S)`, 'g' ), '' );
  }
}

export function innerWidth ( node: HTMLElement ): number {
  let width = node.clientWidth;
  const computedStyle = node.ownerDocument.defaultView!.getComputedStyle( node );
  width -= int( computedStyle.paddingLeft );
  width -= int( computedStyle.paddingRight );
  return width;
}


export function createCSSTransform ( controlPos: ControlPosition, positionOffset: PositionOffsetControlPosition ): Object {
  const translation = getTranslation( controlPos, positionOffset, 'px' );
  return { [ browserPrefixToKey( 'transform', browserPrefix ) ]: translation };
}

export function createSVGTransform ( controlPos: ControlPosition, positionOffset: PositionOffsetControlPosition ): string {
  const translation = getTranslation( controlPos, positionOffset, '' );
  return translation;
}
export function getTranslation ( { x, y }: ControlPosition, positionOffset: PositionOffsetControlPosition, unitSuffix: string ): string {
  let translation = `translate(${ x }${ unitSuffix },${ y }${ unitSuffix })`;
  if ( positionOffset ) {
    const defaultX = `${ ( typeof positionOffset.x === 'string' ) ? positionOffset.x : positionOffset.x + unitSuffix }`;
    const defaultY = `${ ( typeof positionOffset.y === 'string' ) ? positionOffset.y : positionOffset.y + unitSuffix }`;
    translation = `translate(${ defaultX }, ${ defaultY })` + translation;
  }
  return translation;
}