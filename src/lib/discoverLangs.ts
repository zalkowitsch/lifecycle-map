/** Discover language codes used in localized strings inside the data. */
export function discoverLangs(data: unknown): string[] {
  const set = new Set<string>();
  const visit = (val: unknown): void => {
    if (!val || typeof val !== 'object') return;
    if (Array.isArray(val)) { val.forEach(visit); return; }
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (
      keys.length > 0 &&
      keys.every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) &&
      keys.every((k) => typeof obj[k] === 'string')
    ) {
      keys.forEach((k) => set.add(k));
      return;
    }
    Object.values(obj).forEach(visit);
  };
  visit(data);
  return Array.from(set).sort();
}
