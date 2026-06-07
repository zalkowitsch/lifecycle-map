// Resolve a primitive prop value against a context object.
// A string starting with "$" (and at least one more char) is a binding:
// "$name" -> context.name. Anything else is returned as-is.

export function resolveBinding(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value !== 'string') return value;
  if (value.length < 2 || value[0] !== '$') return value;
  return context[value.slice(1)];
}
