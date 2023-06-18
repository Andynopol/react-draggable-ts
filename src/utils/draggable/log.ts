export default function log ( ...args: any ) {
  if ( process && process?.env?.DRAGGABLE_DEBUG ) console.log( ...args );
}
