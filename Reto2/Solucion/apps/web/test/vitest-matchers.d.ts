import "vitest";

interface JestAxeMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  // Fusion de declaraciones (patron documentado de vitest para matchers
  // personalizados): la interfaz vacia es intencional, no un olvido.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends JestAxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends JestAxeMatchers {}
}
