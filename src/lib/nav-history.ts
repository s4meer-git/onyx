/**
 * Tracks how many in-app navigations have happened since the document loaded.
 *
 * `window.history.length` can't answer "is there somewhere of ours to go back
 * to?" — a fresh tab already reports a length of 2, so a deep-linked page would
 * pop straight out to about:blank. This counter only advances on our own route
 * changes, so a value above 1 means the back stack really does hold one of our
 * screens. Module state, so it resets on a full page load, which is correct.
 */
let depth = 0;

export function noteNavigation() {
  depth += 1;
}

export function canGoBack() {
  return depth > 1;
}
