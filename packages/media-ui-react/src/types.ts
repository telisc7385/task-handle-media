/**
 * Shared, SDK-agnostic types for the headless UI packages.
 *
 * The hooks are fully generic over `T`. The only constraint is that `T`
 * should be a plain data object consumers can render; no SDK types required.
 */

export interface MediaItemLike {
  id: string | number;
  src?: string;
  alt?: string;
}

export type Overrides<T> = T | (Partial<T> & Record<string, unknown>);
