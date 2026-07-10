import yaml from 'js-yaml';

/**
 * Serialize an edited source object back to text in its original language.
 * JSON: 2-space indent + trailing newline. YAML: block style via js-yaml.
 */
export function serializeSource(obj: unknown, lang: 'json' | 'yaml'): string {
  if (lang === 'yaml') return yaml.dump(obj, { lineWidth: -1, noRefs: true });
  return JSON.stringify(obj, null, 2) + '\n';
}
