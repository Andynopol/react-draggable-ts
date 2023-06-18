import React, { PropsWithChildren } from "react";
import { DraggableCoreDefaultProps, DraggableCoreProps, DraggableCoreState } from "../types/draggable-core.props";
import ReactDOM from "react-dom";
import { addEvent, addUserSelectStyles, getTouchIdentifier, matchesSelectorAndParentsTo, removeEvent, removeUserSelectStyles } from "../utils/draggable";
import { MouseTouchEvent } from "../types";
import { createCoreData, getControlPosition, snapToGrid } from "../utils/draggable/positionFns";
import log from "../utils/draggable/log";


const eventsFor = {
  touch: {
    start: 'touchstart',
    move: 'touchmove',
    stop: 'touchend'
  },
  mouse: {
    start: 'mousedown',
    move: 'mousemove',
    stop: 'mouseup'
  }
};

export default class DraggableCore extends React.Component<PropsWithChildren<DraggableCoreProps>, DraggableCoreState>{

  private mounted: boolean = false;
  private dragEventFor = eventsFor.mouse;
  static displayName: string = 'DraggableCore';

  static defaultProps: DraggableCoreDefaultProps = {
    allowAnyClick: false, // by default only accept left click
    disabled: false,
    enableUserSelectHack: true,
    onStart: function () { },
    onDrag: function () { },
    onStop: function () { },
    onMouseDown: function () { },
    scale: 1,
  };



  constructor ( props: DraggableCoreProps = DraggableCore.defaultProps ) {
    super( props );
    this.state = {
      dragging: false,
      // Used while dragging to determine deltas.
      lastX: NaN, lastY: NaN,
      touchIdentifier: null
    };
  }

  componentDidMount (): void {
    this.mounted = true;

    const thisNode = this.findDOMNode();
    if ( thisNode ) {
      addEvent( thisNode, eventsFor.touch.start, this.onTouchStart, { passive: false } );
    }
  }

  findDOMNode (): Node {
    return this.props?.nodeRef ? this.props?.nodeRef.current : ReactDOM.findDOMNode( this );
  }

  handleDragStart = ( e: MouseTouchEvent ) => {
    // Make it possible to attach event handlers on top of this one.
    this.props.onMouseDown( e );

    // Only accept left-clicks.
    if ( !this.props.allowAnyClick && typeof e.button === 'number' && e.button !== 0 ) return false;

    // Get nodes. Be sure to grab relative document (could be iframed)
    const thisNode = this.findDOMNode();
    if ( !thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body ) {
      throw new Error( '<DraggableCore> not mounted on DragStart!' );
    }
    const { ownerDocument } = thisNode;

    // Short circuit if handle or cancel prop was provided and selector doesn't match.
    if ( this.props.disabled ||
      ( !( e.target instanceof ownerDocument!.defaultView!.Node ) ) ||
      ( this.props.handle && !matchesSelectorAndParentsTo( e.target, this.props.handle, thisNode ) ) ||
      ( this.props.cancel && matchesSelectorAndParentsTo( e.target, this.props.cancel, thisNode ) ) ) {
      return;
    }

    // Prevent scrolling on mobile devices, like ipad/iphone.
    // Important that this is after handle/cancel.
    if ( e.type === 'touchstart' ) e.preventDefault();

    // Set touch identifier in component state if this is a touch event. This allows us to
    // distinguish between individual touches on multitouch screens by identifying which
    // touchpoint was set to this element.
    const touchIdentifier = getTouchIdentifier( e );
    this.setState( { touchIdentifier } );

    // Get the current drag point from the event. This is used as the offset.
    const position = getControlPosition( e, touchIdentifier as number, this );
    if ( position == null ) return; // not possible but satisfies flow
    const { x, y } = position;

    // Create an event object with all the data parents need to make a decision here.
    const coreEvent = createCoreData( this, x, y );

    console.log( 'DraggableCore: handleDragStart: %j', coreEvent );

    // Call event handler. If it returns explicit false, cancel.
    console.log( 'calling', this.props.onStart );
    const shouldUpdate = this.props.onStart( e, coreEvent );
    if ( shouldUpdate === false || this.mounted === false ) return;

    // Add a style to the body to disable user-select. This prevents text from
    // being selected all over the page.
    if ( this.props.enableUserSelectHack ) addUserSelectStyles( ownerDocument );

    // Initiate dragging. Set the current x and y as offsets
    // so we know how much we've moved during the drag. This allows us
    // to drag elements around even if they have been moved, without issue.
    this.setState( {
      dragging: true,

      lastX: x,
      lastY: y
    } );

    // Add events to the document directly so we catch when the user's mouse/touch moves outside of
    // this element. We use different events depending on whether or not we have detected that this
    // is a touch-capable device.
    addEvent( ownerDocument, this.dragEventFor.move, this.handleDrag );
    addEvent( ownerDocument, this.dragEventFor.stop, this.handleDragStop );

  };

  handleDrag = ( e: MouseTouchEvent ) => {
    const position = getControlPosition( e, this.state.touchIdentifier, this );
    if ( position == null ) return;
    let { x, y } = position;

    // Snap to grid if prop has been provided
    if ( Array.isArray( this.props.grid ) ) {
      let deltaX = x - this.state.lastX, deltaY = y - this.state.lastY;
      [ deltaX, deltaY ] = snapToGrid( this.props.grid, deltaX, deltaY );
      if ( !deltaX && !deltaY ) return; // skip useless drag
      x = this.state.lastX + deltaX, y = this.state.lastY + deltaY;
    }

    const coreEvent = createCoreData( this, x, y );

    console.log( 'DraggableCore: handleDrag: %j', coreEvent );

    // Call event handler. If it returns explicit false, trigger end.
    const shouldUpdate = this.props.onDrag( e, coreEvent );
    if ( shouldUpdate === false || this.mounted === false ) {
      try {
        this.handleDragStop( new MouseEvent( 'mouseup' ) as MouseTouchEvent );
      } catch ( err ) {
        // Old browsers
        const event = document.createEvent( 'MouseEvents' ) as MouseTouchEvent;
        event.initMouseEvent( 'mouseup', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null );
        this.handleDragStop( event );
      }
      return;
    }

    this.setState( {
      lastX: x,
      lastY: y
    } );
  };

  handleDragStop = ( e: MouseTouchEvent ) => {
    if ( !this.state.dragging ) return;

    const position = getControlPosition( e, this.state.touchIdentifier, this );
    if ( position == null ) return;
    let { x, y } = position;

    // Snap to grid if prop has been provided
    if ( Array.isArray( this.props.grid ) ) {
      let deltaX = x - this.state.lastX || 0;
      let deltaY = y - this.state.lastY || 0;
      [ deltaX, deltaY ] = snapToGrid( this.props.grid, deltaX, deltaY );
      x = this.state.lastX + deltaX, y = this.state.lastY + deltaY;
    }

    const coreEvent = createCoreData( this, x, y );

    // Call event handler
    const shouldContinue = this.props.onStop( e, coreEvent );
    if ( shouldContinue === false || this.mounted === false ) return false;

    const thisNode = this.findDOMNode();
    if ( thisNode ) {
      // Remove user-select hack
      if ( this.props.enableUserSelectHack ) removeUserSelectStyles( thisNode.ownerDocument as Document );
    }

    console.log( 'DraggableCore: handleDragStop: %j', coreEvent );

    // Reset the el.
    this.setState( {
      dragging: false,
      lastX: NaN,
      lastY: NaN
    } );

    if ( thisNode ) {
      // Remove event handlers
      console.log( 'DraggableCore: Removing handlers' );
      removeEvent( thisNode.ownerDocument as Node, this.dragEventFor.move, this.handleDrag );
      removeEvent( thisNode.ownerDocument as Node, this.dragEventFor.stop, this.handleDragStop );
    }
  };

  onMouseDown = ( e: MouseTouchEvent ) => {
    this.dragEventFor = eventsFor.mouse; // on touchscreen laptops we could switch back to mouse

    return this.handleDragStart( e );
  };

  onMouseUp = ( e: MouseTouchEvent ) => {
    this.dragEventFor = eventsFor.mouse;

    return this.handleDragStop( e );
  };

  // Same as onMouseDown (start drag), but now consider this a touch device.
  onTouchStart = ( e: MouseTouchEvent ) => {
    // We're on a touch device now, so change the event handlers
    this.dragEventFor = eventsFor.touch;

    return this.handleDragStart( e );
  };

  onTouchEnd = ( e: MouseTouchEvent ) => {
    // We're on a touch device now, so change the event handlers
    this.dragEventFor = eventsFor.touch;

    return this.handleDragStop( e );
  };

  render (): React.ReactNode {
    return React.cloneElement( React.Children.only( this.props.children as React.ReactElement ), {
      // Note: mouseMove handler is attached to document so it will still function
      // when the user drags quickly and leaves the bounds of the element.
      onMouseDown: this.onMouseDown,
      onMouseUp: this.onMouseUp,
      // onTouchStart is added on `componentDidMount` so they can be added with
      // {passive: false}, which allows it to cancel. See
      // https://developers.google.com/web/updates/2017/01/scrolling-intervention
      onTouchEnd: this.onTouchEnd
    } );
  }

}