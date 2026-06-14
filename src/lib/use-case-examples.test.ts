// Tests for the typed use-case example maps shipped in examples/use-cases/.
//
// Each example is registered as an EXAMPLE_SLUGS entry in useViewerState and
// must be a valid TYPED lifecycle map: it parses, declares meta.nodeTypes, has
// at least one node, and every node carries a `type` + `context` whose type is
// declared in meta.nodeTypes.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseSource } from '@/lib/parseSource';
import { normalize } from '@/hooks/useViewerState';

const USE_CASE_FILES: Record<string, string> = {
  'interview-loop': 'interview-loop.json',
  'hiring-funnel': 'hiring-funnel.json',
  'support-triage': 'support-triage.json',
  'onboarding-activation': 'onboarding-activation.json',
  'capability-roadmap': 'capability-roadmap.json',
};

function loadExample(file: string) {
  const text = readFileSync(join(process.cwd(), 'examples/use-cases', file), 'utf8');
  return normalize(parseSource(text));
}

describe('use-case typed examples', () => {
  for (const [slug, file] of Object.entries(USE_CASE_FILES)) {
    describe(slug, () => {
      it('parses and normalizes without throwing', () => {
        expect(() => loadExample(file)).not.toThrow();
      });

      it('declares meta.nodeTypes', () => {
        const map = loadExample(file);
        expect(map.meta.nodeTypes).toBeDefined();
        expect(typeof map.meta.nodeTypes).toBe('object');
        expect(Object.keys(map.meta.nodeTypes ?? {}).length).toBeGreaterThan(0);
      });

      it('has at least one node', () => {
        const map = loadExample(file);
        expect(map.nodes.length).toBeGreaterThanOrEqual(1);
      });

      it('every node has a type + context, and the type exists in meta.nodeTypes', () => {
        const map = loadExample(file);
        const nodeTypes = map.meta.nodeTypes ?? {};
        for (const node of map.nodes) {
          expect(node.type, `node "${node.id}" is missing a type`).toBeTruthy();
          expect(node.context, `node "${node.id}" is missing a context`).toBeDefined();
          expect(
            nodeTypes[node.type as string],
            `node "${node.id}" references unknown type "${node.type}"`,
          ).toBeDefined();
        }
      });
    });
  }
});
