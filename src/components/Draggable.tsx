import React from 'react';
import { ControlPosition, DraggableDefaultProps, DraggableEventHandler, DraggableProps, DraggableState, PositionOffsetControlPosition } from '../types';
import DraggableCore from './DraggableCore';
import log from '../utils/draggable/log';
import ReactDOM from 'react-dom';
import { canDragX, canDragY, createDraggableData, getBoundPosition } from '../utils/draggable/positionFns';
import { createCSSTransform, createSVGTransform } from '../utils/draggable';
import clsx from 'clsx';


class Draggable extends React.Component<DraggableProps, DraggableState>{

  static displayName: string = 'Draggable';

  static defaultProps: DraggableDefaultProps = {
    ...DraggableCore.defaultProps,
    axis: 'both',
    bounds: false,
    defaultClassName: 'react-draggable',
    defaultClassNameDragging: 'react-draggable-dragging',
    defaultClassNameDragged: 'react-draggable-dragged',
    defaultPosition: { x: 0, y: 0 },
    scale: 1
  };

  static getDerivedStateFromProps ( { position }: DraggableProps, { prevPropsPosition }: DraggableState ): Partial<DraggableState> | null | undefined {
    // Set x/y if a new position is provided in props that is different than the previous.
    if (
      position &&
      ( !prevPropsPosition ||
        position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y
      )
    ) {
      console.log( 'Draggable: getDerivedStateFromProps %j', { position, prevPropsPosition } );
      return {
        x: position.x,
        y: position.y,
        prevPropsPosition: { ...position }
      };
    }
    return null;
  }

  constructor ( props: DraggableProps ) {
    super( props );
    this.state = {
      dragging: false,

      // Whether or not we have been dragged before.
      dragged: false,

      // Current transform x and y.
      x: props.position ? props.position.x : props.defaultPosition.x,
      y: props.position ? props.position.y : props.defaultPosition.y,

      prevPropsPosition: props.position || props.defaultPosition,

      // Used for compensating for out-of-bounds drags
      slackX: 0, slackY: 0,

      // Can only determine if SVG after mounting
      isElementSVG: false
    };

    if ( props.position && !( props.onDrag || props.onStop ) ) {
      // eslint-disable-next-line no-console
      console.warn( 'A `position` was applied to this <Draggable>, without drag handlers. This will make this ' +
        'component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the ' +
        '`position` of this element.' );
    }
  }

  componentDidMount () {
    // Check to see if the element passed is an instanceof SVGElement
    if ( typeof window.SVGElement !== 'undefined' && this.findDOMNode() instanceof window.SVGElement ) {
      this.setState( { isElementSVG: true } );
    }
  }

  componentWillUnmount () {
    this.setState( { dragging: false } ); // prevents invariant if unmounted while dragging
  }

  findDOMNode (): Node {
    return this.props?.nodeRef ? this.props?.nodeRef.current : ReactDOM.findDOMNode( this );
  }



  onDragStart: DraggableEventHandler = ( e, coreData ) => {
    console.log( 'Draggable: onDragStart: %j', coreData );

    // Short-circuit if user's callback killed it.
    const shouldStart = this.props.onStart( e, createDraggableData( this, coreData ) );
    // Kills start event on core as well, so move handlers are never bound.
    if ( shouldStart === false ) return false;

    this.setState( { dragging: true, dragged: true } );
  };

  onDrag: DraggableEventHandler = ( e, coreData ) => {
    if ( !this.state.dragging ) return false;
    console.log( 'Draggable: onDrag: %j', coreData );

    const uiData = createDraggableData( this, coreData );

    const newState: DraggableState = {
      ...this.state,
      x: uiData.x,
      y: uiData.y,
    };

    // Keep within bounds.
    if ( this.props.bounds ) {
      // Save original x and y.
      const { x, y } = newState;

      // Add slack to the values used to calculate bound position. This will ensure that if
      // we start removing slack, the element won't react to it right away until it's been
      // completely removed.
      newState!.x += this.state.slackX;
      newState!.y += this.state.slackY;

      // Get bound position. This will ceil/floor the x and y within the boundaries.
      const [ newStateX, newStateY ] = getBoundPosition( this, newState!.x, newState.y );
      newState.x = newStateX;
      newState.y = newStateY;

      // Recalculate slack by noting how much was shaved by the boundPosition handler.
      newState!.slackX = this.state.slackX + ( x - newState.x );
      newState.slackY = this.state.slackY + ( y - newState.y );

      // Update the event we fire to reflect what really happened after bounds took effect.
      uiData.x = newState.x;
      uiData.y = newState.y;
      uiData.deltaX = newState.x - this.state.x;
      uiData.deltaY = newState.y - this.state.y;
    }

    // Short-circuit if user's callback killed it.
    const shouldUpdate = this.props.onDrag( e, uiData );
    if ( shouldUpdate === false ) return false;

    this.setState( newState );
  };


  onDragStop: DraggableEventHandler = ( e, coreData ) => {
    if ( !this.state.dragging ) return false;

    // Short-circuit if user's callback killed it.
    const shouldContinue = this.props.onStop( e, createDraggableData( this, coreData ) );
    if ( shouldContinue === false ) return false;

    console.log( 'Draggable: onDragStop: %j', coreData );

    const newState: DraggableState = {
      ...this.state,
      dragging: false,
      slackX: 0,
      slackY: 0
    };

    // If this is a controlled component, the result of this operation will be to
    // revert back to the old position. We expect a handler on `onDragStop`, at the least.
    const controlled = Boolean( this.props.position );
    if ( controlled ) {
      const { x, y } = this.props.position as ControlPosition;
      newState.x = x;
      newState.y = y;
    }

    this.setState( newState );
  };

  render (): React.ReactNode {
    const {
      axis,
      bounds,
      children,
      defaultPosition,
      defaultClassName,
      defaultClassNameDragging,
      defaultClassNameDragged,
      position,
      positionOffset,
      ...draggableCoreProps
    } = this.props;

    let style = {};
    let svgTransform = null;

    // If this is controlled, we don't want to move it - unless it's dragging.
    const controlled = Boolean( position );
    const draggable = !controlled || this.state.dragging;

    const validPosition = position || defaultPosition;
    const transformOpts = {
      // Set left if horizontal drag is enabled
      x: canDragX( this ) && draggable ?
        this.state.x :
        validPosition.x,

      // Set top if vertical drag is enabled
      y: canDragY( this ) && draggable ?
        this.state.y :
        validPosition.y
    };

    // If this element was SVG, we use the `transform` attribute.
    if ( this.state.isElementSVG ) {
      svgTransform = createSVGTransform( transformOpts, positionOffset as PositionOffsetControlPosition );
    } else {
      // Add a CSS transform to move the element around. This allows us to move the element around
      // without worrying about whether or not it is relatively or absolutely positioned.
      // If the item you are dragging already has a transform set, wrap it in a <span> so <Draggable>
      // has a clean slate.
      style = createCSSTransform( transformOpts, positionOffset as PositionOffsetControlPosition );
    }

    // Mark with class while dragging
    const className = clsx( ( children?.props.className || '' ), defaultClassName, {
      [ defaultClassNameDragging ]: this.state.dragging,
      [ defaultClassNameDragged ]: this.state.dragged
    } );

    // Reuse the child provided
    // This makes it flexible to use whatever element is wanted (div, ul, etc)
    return (
      <DraggableCore { ...draggableCoreProps } onStart={ this.onDragStart } onDrag={ this.onDrag } onStop={ this.onDragStop }>
        { React.cloneElement( React.Children.only( children! ), {
          className: className,
          style: { ...children!.props.style, ...style },
          transform: svgTransform
        } ) }
      </DraggableCore>
    );
  }



}

export default Draggable;