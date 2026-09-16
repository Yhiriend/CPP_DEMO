export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  /** Whether this section has a real route yet; unimplemented items render disabled. */
  readonly implemented?: boolean;
}
