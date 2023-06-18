import type { ReactElement } from "react";
import { DraggableEventHandler } from "./draggable.types";

export interface DraggableCoreState {
  dragging: boolean,
  lastX: number,
  lastY: number,
  touchIdentifier?: number | null;
}

export interface DraggableCoreDefaultProps {
  /**
     * `allowAnyClick` allows dragging using any mouse button.
     * By default, we only accept the left button.
     *
     * Defaults to `false`.
     */
  allowAnyClick: boolean,
  /**
     * `disabled`, if true, stops the <Draggable> from dragging. All handlers,
     * with the exception of `onMouseDown`, will not fire.
     */
  disabled: boolean,
  /**
     * By default, we add 'user-select:none' attributes to the document body
     * to prevent ugly text selection during drag. If this is causing problems
     * for your app, set this to `false`.
     */
  enableUserSelectHack: boolean,
  /**
     * Called when dragging starts.
     * If this function returns the boolean false, dragging will be canceled.
     */
  onStart: DraggableEventHandler,
  /**
     * Called while dragging.
     * If this function returns the boolean false, dragging will be canceled.
     */
  onDrag: DraggableEventHandler,
  /**
     * Called when dragging stops.
     * If this function returns the boolean false, the drag will remain active.
     */
  onStop: DraggableEventHandler,
  /**
     * A workaround option which can be passed if onMouseDown needs to be accessed,
     * since it'll always be blocked (as there is internal use of onMouseDown)
     */
  onMouseDown: ( e: MouseEvent ) => void,
  /**
    * `scale`, if set, applies scaling while dragging an element
    */
  scale: number,
}

export interface DraggableCoreProps extends DraggableCoreDefaultProps {
  /**
     * `cancel` specifies a selector to be used to prevent drag initialization.
     *
     * Example:
     *
     * ```jsx
     *   let App = React.createClass({
     *       render: function () {
     *           return(
     *               <Draggable cancel=".cancel">
     *                   <div>
     *                     <div className="cancel">You can't drag from here</div>
     *                     <div>Dragging here works fine</div>
     *                   </div>
     *               </Draggable>
     *           );
     *       }
     *   });
     * ```
     */
  cancel?: string,
  children?: ReactElement<any>,
  /**
     * `offsetParent`, if set, uses the passed DOM node to compute drag offsets
     * instead of using the parent node.
     */
  offsetParent?: HTMLElement,
  /**
     * `grid` specifies the x and y that dragging should snap to.
     */
  grid?: [ number, number ],
  /**
     * `handle` specifies a selector to be used as the handle that initiates drag.
     *
     * Example:
     *
     * ```jsx
     *   let App = React.createClass({
     *       render: function () {
     *         return (
     *            <Draggable handle=".handle">
     *              <div>
     *                  <div className="handle">Click me to drag</div>
     *                  <div>This is some other content</div>
     *              </div>
     *           </Draggable>
     *         );
     *       }
     *   });
     * ```
     */
  handle?: string,
  /* If running in React Strict mode, ReactDOM.findDOMNode() is deprecated.
     * Unfortunately, in order for <Draggable> to work properly, we need raw access
     * to the underlying DOM node. If you want to avoid the warning, pass a `nodeRef`
     * as in this example:
     *
     * function MyComponent() {
     *   const nodeRef = React.useRef(null);
     *   return (
     *     <Draggable nodeRef={nodeRef}>
     *       <div ref={nodeRef}>Example Target</div>
     *     </Draggable>
     *   );
     * }
     *
     * This can be used for arbitrarily nested components, so long as the ref ends up
     * pointing to the actual child DOM node and not a custom component.
     */
  nodeRef?: React.RefObject<any>,
}