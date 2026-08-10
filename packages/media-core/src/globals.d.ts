/**
 * Minimal ambient declaration for `console`, which is a platform global but is
 * NOT part of the ECMAScript type library. This keeps `media-core` compiling
 * against `lib: ["ES2020"]` with no DOM/browser types.
 */
declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
