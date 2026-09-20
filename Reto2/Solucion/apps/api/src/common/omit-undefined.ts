/**
 * `exactOptionalPropertyTypes` distingue "clave ausente" de "clave con
 * valor `undefined`". Zod produce lo segundo para campos `.optional()`;
 * los puertos de aplicación exigen lo primero. Esta función homogeniza
 * un valor ya validado por zod a la forma que `exactOptionalPropertyTypes`
 * exige, recursivamente.
 */
export function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => omitUndefinedDeep(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (entryValue !== undefined) {
        result[key] = omitUndefinedDeep(entryValue);
      }
    }
    return result as T;
  }
  return value;
}
