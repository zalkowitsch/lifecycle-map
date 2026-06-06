# Primitive-Driven Node Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the NodeDrawer's hardcoded billing sections with a generic primitive registry composed by JSON node types.

**Architecture:** A pure `resolveBinding` resolves `$`-prefixed values against a context object. Small React primitive components (Section, List, Tile, etc.) render content. A `PrimitiveRenderer` walks a `layout` tree from `meta.nodeTypes[type]`, resolves bindings against `node.context`, and dispatches to the registry. `NodeDrawer.renderNode` uses the renderer when a node has `type`.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Vite, CSS modules.

**Spec:** `docs/superpowers/specs/2026-06-05-primitive-driven-drawer-design.md`

---

## File Structure

- `src/components/NodeDrawer/primitives/resolveBinding.ts` — pure binding resolver
- `src/components/NodeDrawer/primitives/types.ts` — `PrimitiveNode`, `NodeTypeDef`, context types
- `src/components/NodeDrawer/primitives/Section.tsx`, `List.tsx`, `Tile.tsx`, `Pills.tsx`, `Prose.tsx`, `Title.tsx`, `Text.tsx`, `KeyValue.tsx`, `Button.tsx`, `Link.tsx` — one component each
- `src/components/NodeDrawer/primitives/RenderNode.tsx` — registry + single-node dispatch
- `src/components/NodeDrawer/primitives/PrimitiveRenderer.tsx` — top-level layout walker (wraps RenderNode)
- `src/components/NodeDrawer/primitives/primitives.module.css` — shared styles (reuse NodeDrawer tokens)
- `src/components/NodeDrawer/NodeDrawer.tsx` — `renderNode` dispatches to renderer when `node.type` set
- `src/types/lifecycle-map.ts` — add `type`/`context` to `MapNode`, `nodeTypes` to `MapMeta`
- `examples/biller-lifecycle.json`, `examples/hiring-pipeline.json` — migrated (done last)
- `docs/primitives.html` (+ `docs/index.html` link) — primitive reference

---

## Task 1: Binding resolver (`resolveBinding`)

**Files:**
- Create: `src/components/NodeDrawer/primitives/resolveBinding.ts`
- Test: `src/components/NodeDrawer/primitives/resolveBinding.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { resolveBinding } from './resolveBinding';

describe('resolveBinding', () => {
  const ctx = { name: 'Alpha', count: 3, tags: ['a', 'b'], nested: { x: 1 } };

  it('returns a literal string unchanged when it has no $ prefix', () => {
    expect(resolveBinding('Rubrics', ctx)).toBe('Rubrics');
  });

  it('resolves a $-prefixed key against the context', () => {
    expect(resolveBinding('$name', ctx)).toBe('Alpha');
  });

  it('resolves non-string context values (arrays, numbers)', () => {
    expect(resolveBinding('$tags', ctx)).toEqual(['a', 'b']);
    expect(resolveBinding('$count', ctx)).toBe(3);
  });

  it('returns undefined for a missing key', () => {
    expect(resolveBinding('$missing', ctx)).toBeUndefined();
  });

  it('passes through non-string inputs unchanged', () => {
    expect(resolveBinding(42, ctx)).toBe(42);
    expect(resolveBinding(undefined, ctx)).toBeUndefined();
  });

  it('treats a literal "$" with nothing after it as a literal', () => {
    expect(resolveBinding('$', ctx)).toBe('$');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/resolveBinding.test.ts`
Expected: FAIL — `Failed to resolve import "./resolveBinding"`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Resolve a primitive prop value against a context object.
// A string starting with "$" (and at least one more char) is a binding:
// "$name" -> context.name. Anything else is returned as-is.

export function resolveBinding(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value !== 'string') return value;
  if (value.length < 2 || value[0] !== '$') return value;
  return context[value.slice(1)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/resolveBinding.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/NodeDrawer/primitives/resolveBinding.ts src/components/NodeDrawer/primitives/resolveBinding.test.ts
git commit -m "feat: add resolveBinding for primitive data bindings"
```

---

## Task 2: Primitive types

**Files:**
- Create: `src/components/NodeDrawer/primitives/types.ts`
- Test: none (types only; validated by consuming tasks compiling)

- [ ] **Step 1: Write the types**

```typescript
import type { I18nString } from '@/types/lifecycle-map';

/** A node in a node-type layout tree. `type` selects a primitive; other
 *  fields are either literals or "$"-prefixed bindings resolved against
 *  the node's context. */
export interface PrimitiveNode {
  type: string;
  // common optional fields (not all primitives use all)
  title?: string;
  sub?: string;
  text?: string;
  bind?: string;
  variant?: string;
  href?: string;
  action?: string;
  target?: string;
  pills?: string;
  tags?: string;
  children?: PrimitiveNode[];
  item?: PrimitiveNode;
}

export interface NodeTypeDef {
  layout: PrimitiveNode[];
}

export type DrawerContext = Record<string, unknown>;

/** Props every primitive component receives. */
export interface PrimitiveProps {
  node: PrimitiveNode;
  context: DrawerContext;
  /** i18n resolver passed down from NodeDrawer. */
  L: (v: unknown) => string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/NodeDrawer/primitives/types.ts
git commit -m "feat: add primitive node type definitions"
```

---

## Task 3: `Text` and `Title` primitives

**Files:**
- Create: `src/components/NodeDrawer/primitives/Text.tsx`, `Title.tsx`
- Create: `src/components/NodeDrawer/primitives/primitives.module.css`
- Test: `src/components/NodeDrawer/primitives/Text.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Text } from './Text';
import { Title } from './Title';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Text primitive', () => {
  it('renders a literal text value', () => {
    const { getByText } = render(
      <Text node={{ type: 'Text', text: 'hello' }} context={{}} L={L} />,
    );
    expect(getByText('hello')).toBeInTheDocument();
  });

  it('renders a bound text value from context', () => {
    const { getByText } = render(
      <Text node={{ type: 'Text', text: '$msg' }} context={{ msg: 'bound' }} L={L} />,
    );
    expect(getByText('bound')).toBeInTheDocument();
  });

  it('renders nothing when the bound value is missing', () => {
    const { container } = render(
      <Text node={{ type: 'Text', text: '$nope' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('Title primitive', () => {
  it('renders an eyebrow variant', () => {
    const { getByText } = render(
      <Title node={{ type: 'Title', text: 'RUBRICS', variant: 'eyebrow' }} context={{}} L={L} />,
    );
    expect(getByText('RUBRICS')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Text.test.tsx`
Expected: FAIL — cannot resolve `./Text`.

- [ ] **Step 3: Create the CSS module**

```css
/* src/components/NodeDrawer/primitives/primitives.module.css */
.text { font-size: 0.95rem; line-height: 1.5; color: var(--ink, #d8d2c4); }
.caption { font-size: 0.8rem; opacity: 0.7; }
.mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.title-h1 { font-size: 1.6rem; font-weight: 600; }
.title-h2 { font-size: 1.2rem; font-weight: 600; }
.eyebrow { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }
```

- [ ] **Step 4: Write Text.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

const TEXT_VARIANT: Record<string, string> = {
  body: styles.text,
  caption: styles.caption,
  mono: styles.mono,
};

export function Text({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.text, context);
  if (raw === undefined || raw === null || raw === '') return null;
  const cls = TEXT_VARIANT[node.variant ?? 'body'] ?? styles.text;
  return <div className={cls}>{L(raw)}</div>;
}
```

- [ ] **Step 5: Write Title.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

const TITLE_VARIANT: Record<string, string> = {
  h1: styles['title-h1'],
  h2: styles['title-h2'],
  eyebrow: styles.eyebrow,
};

export function Title({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.text, context);
  if (raw === undefined || raw === null || raw === '') return null;
  const cls = TITLE_VARIANT[node.variant ?? 'h2'] ?? styles['title-h2'];
  return <div className={cls}>{L(raw)}</div>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Text.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/NodeDrawer/primitives/Text.tsx src/components/NodeDrawer/primitives/Title.tsx src/components/NodeDrawer/primitives/primitives.module.css src/components/NodeDrawer/primitives/Text.test.tsx
git commit -m "feat: add Text and Title primitives"
```

---

## Task 4: `Prose` and `KeyValue` primitives

**Files:**
- Create: `src/components/NodeDrawer/primitives/Prose.tsx`, `KeyValue.tsx`
- Test: `src/components/NodeDrawer/primitives/KeyValue.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Prose } from './Prose';
import { KeyValue } from './KeyValue';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Prose primitive', () => {
  it('renders bound prose text', () => {
    const { getByText } = render(
      <Prose node={{ type: 'Prose', bind: '$body' }} context={{ body: 'narrative' }} L={L} />,
    );
    expect(getByText('narrative')).toBeInTheDocument();
  });

  it('renders <em> emphasis embedded in the text', () => {
    const { container } = render(
      <Prose node={{ type: 'Prose', bind: '$body' }} context={{ body: 'a <em>b</em>' }} L={L} />,
    );
    expect(container.querySelector('em')?.textContent).toBe('b');
  });

  it('omits when the bound value is missing', () => {
    const { container } = render(
      <Prose node={{ type: 'Prose', bind: '$x' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('KeyValue primitive', () => {
  it('renders label/value rows from an array', () => {
    const { getByText } = render(
      <KeyValue
        node={{ type: 'KeyValue', bind: '$meta' }}
        context={{ meta: [{ label: 'Duration', value: '75 min' }] }}
        L={L}
      />,
    );
    expect(getByText('Duration')).toBeInTheDocument();
    expect(getByText('75 min')).toBeInTheDocument();
  });

  it('omits when there are no rows', () => {
    const { container } = render(
      <KeyValue node={{ type: 'KeyValue', bind: '$meta' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/KeyValue.test.tsx`
Expected: FAIL — cannot resolve `./Prose`.

- [ ] **Step 3: Write Prose.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Prose({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  if (raw === undefined || raw === null || raw === '') return null;
  // Text may contain a small subset of HTML (<em>) like the legacy drawer.
  return <p className={styles.text} dangerouslySetInnerHTML={{ __html: L(raw) }} />;
}
```

- [ ] **Step 4: Add KeyValue CSS**

Append to `primitives.module.css`:

```css
.kv { display: grid; grid-template-columns: minmax(80px, 30%) 1fr; gap: 6px 16px; }
.kv-label { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; }
.kv-value { font-size: 0.9rem; }
```

- [ ] **Step 5: Write KeyValue.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

interface Row { label: unknown; value: unknown }

export function KeyValue({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const rows = Array.isArray(raw) ? (raw as Row[]) : [];
  if (rows.length === 0) return null;
  return (
    <div className={styles.kv}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span className={styles['kv-label']}>{L(r.label)}</span>
          <span className={styles['kv-value']}>{L(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/KeyValue.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/NodeDrawer/primitives/Prose.tsx src/components/NodeDrawer/primitives/KeyValue.tsx src/components/NodeDrawer/primitives/KeyValue.test.tsx src/components/NodeDrawer/primitives/primitives.module.css
git commit -m "feat: add Prose and KeyValue primitives"
```

---

## Task 5: `Pills` primitive

**Files:**
- Create: `src/components/NodeDrawer/primitives/Pills.tsx`
- Test: `src/components/NodeDrawer/primitives/Pills.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Pills } from './Pills';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Pills primitive', () => {
  it('renders a pill per item', () => {
    const { getByText } = render(
      <Pills
        node={{ type: 'Pills', bind: '$levels' }}
        context={{ levels: [{ label: 'L1' }, { label: 'L4' }] }}
        L={L}
      />,
    );
    expect(getByText('L1')).toBeInTheDocument();
    expect(getByText('L4')).toBeInTheDocument();
  });

  it('accepts plain strings as pills', () => {
    const { getByText } = render(
      <Pills node={{ type: 'Pills', bind: '$tags' }} context={{ tags: ['x'] }} L={L} />,
    );
    expect(getByText('x')).toBeInTheDocument();
  });

  it('omits when empty', () => {
    const { container } = render(
      <Pills node={{ type: 'Pills', bind: '$z' }} context={{}} L={L} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Pills.test.tsx`
Expected: FAIL — cannot resolve `./Pills`.

- [ ] **Step 3: Add Pills CSS**

Append to `primitives.module.css`:

```css
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { font-size: 0.74rem; padding: 2px 8px; border: 1px solid currentColor; border-radius: 999px; opacity: 0.85; }
```

- [ ] **Step 4: Write Pills.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

interface PillItem { label?: unknown; color?: string }

function toPill(item: unknown): PillItem {
  if (typeof item === 'string') return { label: item };
  if (item && typeof item === 'object') return item as PillItem;
  return { label: String(item) };
}

export function Pills({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const items = Array.isArray(raw) ? raw.map(toPill) : [];
  if (items.length === 0) return null;
  return (
    <div className={styles.pills}>
      {items.map((p, i) => (
        <span key={i} className={styles.pill} style={p.color ? { color: p.color } : undefined}>
          {L(p.label)}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Pills.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/NodeDrawer/primitives/Pills.tsx src/components/NodeDrawer/primitives/Pills.test.tsx src/components/NodeDrawer/primitives/primitives.module.css
git commit -m "feat: add Pills primitive"
```

---

## Task 6: `Tile` primitive

**Files:**
- Create: `src/components/NodeDrawer/primitives/Tile.tsx`
- Test: `src/components/NodeDrawer/primitives/Tile.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Tile } from './Tile';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Tile primitive', () => {
  // Inside a List, the Tile receives one array element as its local context.
  const item = { name: 'Code fluency', id: 'rubric:code-fluency', levels: [{ label: 'L1' }, { label: 'L4' }], tags: ['Code fluency'] };

  it('renders title, sub, pills, and tags from local context', () => {
    const { getByText } = render(
      <Tile
        node={{ type: 'Tile', title: '$name', sub: '$id', pills: '$levels', tags: '$tags' }}
        context={item}
        L={L}
      />,
    );
    expect(getByText('Code fluency')).toBeInTheDocument();
    expect(getByText('rubric:code-fluency')).toBeInTheDocument();
    expect(getByText('L1')).toBeInTheDocument();
    expect(getByText('L4')).toBeInTheDocument();
  });

  it('renders only the title when optional binds are missing', () => {
    const { getByText, container } = render(
      <Tile node={{ type: 'Tile', title: '$name', sub: '$id', pills: '$levels' }} context={{ name: 'X' }} L={L} />,
    );
    expect(getByText('X')).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Tile.test.tsx`
Expected: FAIL — cannot resolve `./Tile`.

- [ ] **Step 3: Add Tile CSS**

Append to `primitives.module.css`:

```css
.tile { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.08); }
.tile-name { font-size: 1rem; font-weight: 600; }
.tile-sub { font-size: 0.78rem; font-family: ui-monospace, monospace; opacity: 0.6; }
.tile-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
```

- [ ] **Step 4: Write Tile.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import { Pills } from './Pills';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Tile({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const name = resolveBinding(node.title, context);
  const sub = resolveBinding(node.sub, context);
  const tags = resolveBinding(node.tags, context);
  if (name === undefined || name === null || name === '') return null;
  return (
    <div className={styles.tile}>
      <div className={styles['tile-name']}>{L(name)}</div>
      {sub !== undefined && sub !== null && sub !== '' ? (
        <div className={styles['tile-sub']}>{L(sub)}</div>
      ) : null}
      <div className={styles['tile-row']}>
        {node.pills ? <Pills node={{ type: 'Pills', bind: node.pills }} context={context} L={L} /> : null}
        {Array.isArray(tags) ? <Pills node={{ type: 'Pills', bind: '$__tags' }} context={{ __tags: tags }} L={L} /> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Tile.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/NodeDrawer/primitives/Tile.tsx src/components/NodeDrawer/primitives/Tile.test.tsx src/components/NodeDrawer/primitives/primitives.module.css
git commit -m "feat: add Tile primitive"
```

---

## Task 7: `Button` and `Link` primitives

**Files:**
- Create: `src/components/NodeDrawer/primitives/Button.tsx`, `Link.tsx`
- Test: `src/components/NodeDrawer/primitives/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { Link } from './Link';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('Button primitive', () => {
  it('renders text and fires onAction with the resolved target on click', () => {
    const onAction = vi.fn();
    const { getByText } = render(
      <Button
        node={{ type: 'Button', text: 'Go', action: 'navigate', target: '$dest' }}
        context={{ dest: 'coding' }}
        L={L}
        onAction={onAction}
      />,
    );
    fireEvent.click(getByText('Go'));
    expect(onAction).toHaveBeenCalledWith('navigate', 'coding');
  });
});

describe('Link primitive', () => {
  it('renders an anchor with the bound href', () => {
    const { getByText } = render(
      <Link node={{ type: 'Link', text: 'Docs', href: '$url' }} context={{ url: 'https://x.dev' }} L={L} />,
    );
    expect((getByText('Docs') as HTMLAnchorElement).href).toContain('https://x.dev');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Button.test.tsx`
Expected: FAIL — cannot resolve `./Button`.

- [ ] **Step 3: Extend PrimitiveProps with an optional onAction**

In `src/components/NodeDrawer/primitives/types.ts`, add to `PrimitiveProps`:

```typescript
  /** Optional action handler (Button uses it: navigate/copy). */
  onAction?: (action: string, target: unknown) => void;
```

- [ ] **Step 4: Add Button/Link CSS**

Append to `primitives.module.css`:

```css
.button { align-self: flex-start; font-size: 0.85rem; padding: 6px 14px; border: 1px solid currentColor; border-radius: 6px; background: none; color: inherit; cursor: pointer; }
.link { color: var(--accent, #d98a4f); text-decoration: underline; }
```

- [ ] **Step 5: Write Button.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Button({ node, context, L, onAction }: PrimitiveProps): JSX.Element | null {
  const label = resolveBinding(node.text, context);
  if (label === undefined || label === null || label === '') return null;
  const target = resolveBinding(node.target, context);
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => onAction?.(node.action ?? 'navigate', target)}
    >
      {L(label)}
    </button>
  );
}
```

- [ ] **Step 6: Write Link.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';

export function Link({ node, context, L }: PrimitiveProps): JSX.Element | null {
  const label = resolveBinding(node.text, context);
  const href = resolveBinding(node.href, context);
  if (!label || typeof href !== 'string' || href === '') return null;
  return (
    <a className={styles.link} href={href} target="_blank" rel="noreferrer">
      {L(label)}
    </a>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/Button.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/components/NodeDrawer/primitives/Button.tsx src/components/NodeDrawer/primitives/Link.tsx src/components/NodeDrawer/primitives/Button.test.tsx src/components/NodeDrawer/primitives/types.ts src/components/NodeDrawer/primitives/primitives.module.css
git commit -m "feat: add Button and Link primitives"
```

---

## Task 8: `Section`, `List`, `RenderNode` registry, and `PrimitiveRenderer`

**Files:**
- Create: `src/components/NodeDrawer/primitives/RenderNode.tsx` (registry + dispatch)
- Create: `src/components/NodeDrawer/primitives/Section.tsx`, `List.tsx`, `PrimitiveRenderer.tsx`
- Test: `src/components/NodeDrawer/primitives/PrimitiveRenderer.test.tsx`

**Note on module structure:** `Section`/`List` are containers — they render their
children via `RenderNode`. To avoid a circular import (`PrimitiveRenderer` →
`Section` → `PrimitiveRenderer`), the registry + dispatch live in their own module
`RenderNode.tsx`. `Section`/`List` import `RenderNode` from there; `RenderNode`'s
registry imports `Section`/`List`. This Section↔RenderNode cycle is safe because
the components only *call* `RenderNode` at render time, not at module load — ESM
resolves the binding lazily. `PrimitiveRenderer` is a thin top-level wrapper over
`RenderNode` with no cycle.

- [ ] **Step 1: Write the failing test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PrimitiveRenderer } from './PrimitiveRenderer';
import type { PrimitiveNode } from './types';

const L = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

describe('PrimitiveRenderer', () => {
  it('renders a flat layout of primitives', () => {
    const layout: PrimitiveNode[] = [
      { type: 'Title', text: 'Rubrics', variant: 'eyebrow' },
      { type: 'Prose', bind: '$intro' },
    ];
    const { getByText } = render(
      <PrimitiveRenderer layout={layout} context={{ intro: 'measured signals' }} L={L} />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('measured signals')).toBeInTheDocument();
  });

  it('renders a Section with nested children', () => {
    const layout: PrimitiveNode[] = [
      { type: 'Section', title: 'Rubrics', sub: '$sub', children: [{ type: 'Prose', bind: '$body' }] },
    ];
    const { getByText } = render(
      <PrimitiveRenderer layout={layout} context={{ sub: 'this round', body: 'text' }} L={L} />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('this round')).toBeInTheDocument();
    expect(getByText('text')).toBeInTheDocument();
  });

  it('renders a List, giving each item to its item-primitive as local context', () => {
    const layout: PrimitiveNode[] = [
      {
        type: 'List',
        bind: '$rubrics',
        item: { type: 'Tile', title: '$name', sub: '$id' },
      },
    ];
    const ctx = { rubrics: [{ name: 'A', id: 'r:a' }, { name: 'B', id: 'r:b' }] };
    const { getByText } = render(<PrimitiveRenderer layout={layout} context={ctx} L={L} />);
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
    expect(getByText('r:a')).toBeInTheDocument();
  });

  it('omits an unknown primitive type without crashing', () => {
    const layout = [{ type: 'Bogus', text: 'x' }] as PrimitiveNode[];
    const { container } = render(<PrimitiveRenderer layout={layout} context={{}} L={L} />);
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/primitives/PrimitiveRenderer.test.tsx`
Expected: FAIL — cannot resolve `./PrimitiveRenderer`.

- [ ] **Step 3: Add Section CSS**

Append to `primitives.module.css`:

```css
.section { margin-top: 20px; }
.section-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.section-title { font-size: 1.1rem; font-weight: 600; }
.section-sub { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.55; }
```

- [ ] **Step 4: Write Section.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps } from './types';
import styles from './primitives.module.css';
import { RenderNode } from './RenderNode';

export function Section({ node, context, L, onAction }: PrimitiveProps): JSX.Element | null {
  const title = resolveBinding(node.title, context);
  const sub = resolveBinding(node.sub, context);
  const children = node.children ?? [];
  return (
    <div className={styles.section}>
      <div className={styles['section-head']}>
        {title !== undefined && title !== null && title !== '' ? (
          <div className={styles['section-title']}>{L(title)}</div>
        ) : null}
        {sub !== undefined && sub !== null && sub !== '' ? (
          <div className={styles['section-sub']}>{L(sub)}</div>
        ) : null}
      </div>
      {children.map((child, i) => (
        <RenderNode key={i} node={child} context={context} L={L} onAction={onAction} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write List.tsx**

```tsx
import { resolveBinding } from './resolveBinding';
import type { PrimitiveProps, DrawerContext } from './types';
import { RenderNode } from './RenderNode';

export function List({ node, context, L, onAction }: PrimitiveProps): JSX.Element | null {
  const raw = resolveBinding(node.bind, context);
  const items = Array.isArray(raw) ? raw : [];
  const item = node.item;
  if (items.length === 0 || !item) return null;
  return (
    <>
      {items.map((entry, i) => (
        <RenderNode
          key={i}
          node={item}
          context={entry as DrawerContext}
          L={L}
          onAction={onAction}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 6: Write RenderNode.tsx (registry + dispatch)**

```tsx
import type { PrimitiveProps } from './types';
import { Text } from './Text';
import { Title } from './Title';
import { Prose } from './Prose';
import { KeyValue } from './KeyValue';
import { Pills } from './Pills';
import { Tile } from './Tile';
import { Button } from './Button';
import { Link } from './Link';
import { Section } from './Section';
import { List } from './List';

const REGISTRY: Record<string, (p: PrimitiveProps) => JSX.Element | null> = {
  Text, Title, Prose, KeyValue, Pills, Tile, Button, Link, Section, List,
};

/** Dispatch a single primitive node to its registry component. Unknown types
 *  are omitted with a warning (defensive, like the edge filter). */
export function RenderNode(props: PrimitiveProps): JSX.Element | null {
  const Comp = REGISTRY[props.node.type];
  if (!Comp) {
    console.warn(`Unknown drawer primitive type: "${props.node.type}"`);
    return null;
  }
  return <Comp {...props} />;
}
```

- [ ] **Step 7: Write PrimitiveRenderer.tsx (thin top-level wrapper)**

```tsx
import type { PrimitiveNode, DrawerContext } from './types';
import { RenderNode } from './RenderNode';

export interface PrimitiveRendererProps {
  layout: PrimitiveNode[];
  context: DrawerContext;
  L: (v: unknown) => string;
  onAction?: (action: string, target: unknown) => void;
}

export function PrimitiveRenderer({ layout, context, L, onAction }: PrimitiveRendererProps): JSX.Element {
  return (
    <>
      {layout.map((node, i) => (
        <RenderNode key={i} node={node} context={context} L={L} onAction={onAction} />
      ))}
    </>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/primitives/PrimitiveRenderer.test.tsx`
Expected: PASS (4 tests). Note the unknown-type test emits a `console.warn` — that is expected.

- [ ] **Step 9: Commit**

```bash
git add src/components/NodeDrawer/primitives/Section.tsx src/components/NodeDrawer/primitives/List.tsx src/components/NodeDrawer/primitives/RenderNode.tsx src/components/NodeDrawer/primitives/PrimitiveRenderer.tsx src/components/NodeDrawer/primitives/PrimitiveRenderer.test.tsx src/components/NodeDrawer/primitives/primitives.module.css
git commit -m "feat: add Section, List, RenderNode registry, and PrimitiveRenderer"
```

---

## Task 9: Add `type`/`context`/`nodeTypes` to the data model

**Files:**
- Modify: `src/types/lifecycle-map.ts` (MapNode ~line 79, MapMeta ~line 130)

- [ ] **Step 1: Add fields to MapNode**

In `MapNode`, after `modules?: ModuleRef[];`, add:

```typescript
  /** Node type id — selects a layout from meta.nodeTypes. When set, the
   *  drawer renders via PrimitiveRenderer using `context` for data. */
  type?: string;
  /** Data passed to the node type's primitive layout. */
  context?: Record<string, unknown>;
```

- [ ] **Step 2: Add nodeTypes to MapMeta**

In `MapMeta`, after `direction?: Direction;`, add:

```typescript
  /** Map of node-type id -> layout (primitive tree). Consumed by the drawer. */
  nodeTypes?: Record<string, { layout: import('@/components/NodeDrawer/primitives/types').PrimitiveNode[] }>;
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/lifecycle-map.ts
git commit -m "feat: add node type/context and meta.nodeTypes to data model"
```

---

## Task 10: Wire PrimitiveRenderer into NodeDrawer

**Files:**
- Modify: `src/components/NodeDrawer/NodeDrawer.tsx` (`renderNode` ~line 101)
- Test: `src/components/NodeDrawer/NodeDrawer.primitive.test.tsx`

- [ ] **Step 1: Write the failing integration test**

```tsx
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NodeDrawer } from './NodeDrawer';
import type { NormalizedMap } from '@/types/lifecycle-map';

const L = (v: unknown): string => (typeof v === 'string' ? v : String((v as any)?.en ?? v ?? ''));

function makeData(): NormalizedMap {
  return {
    meta: {
      title: 'T', subtitle: '', context: '', modes: [],
      nodeTypes: {
        'interview-round': {
          layout: [
            { type: 'Section', title: 'Rubrics', children: [
              { type: 'List', bind: '$rubrics', item: { type: 'Tile', title: '$name', sub: '$id' } },
            ] },
          ],
        },
      },
    },
    lanes: [{ id: 'l', label: 'L' }],
    phases: [{ id: 'p', label: 'P' }],
    nodes: [
      {
        id: 'coding', lane: 'l', phase: 'p', title: 'Coding', type: 'interview-round',
        context: { rubrics: [{ name: 'Code fluency', id: 'rubric:code-fluency' }] },
        states: {},
      },
    ],
    edges: [],
    _modeMap: {},
    _moduleCatalog: {},
  } as unknown as NormalizedMap;
}

describe('NodeDrawer with a typed node', () => {
  it('renders the node type layout (Section + List + Tile) from context', () => {
    const data = makeData();
    const { getByText } = render(
      <NodeDrawer
        open mode="node" data={data} activeNodeId="coding" activeEdge={null}
        walkOrder={['coding']} onClose={() => {}} onNavigate={() => {}} L={L}
      />,
    );
    expect(getByText('Rubrics')).toBeInTheDocument();
    expect(getByText('Code fluency')).toBeInTheDocument();
    expect(getByText('rubric:code-fluency')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/NodeDrawer/NodeDrawer.primitive.test.tsx`
Expected: FAIL — the typed node is not rendered via the renderer yet (no "Rubrics").

- [ ] **Step 3: Import the renderer in NodeDrawer.tsx**

At the top of `src/components/NodeDrawer/NodeDrawer.tsx`, add:

```tsx
import { PrimitiveRenderer } from './primitives/PrimitiveRenderer';
```

- [ ] **Step 4: Branch on node.type inside renderNode**

In `renderNode`, immediately after `if (!lane || !phase) return null;`, add:

```tsx
  // Typed nodes render via the primitive layout from meta.nodeTypes.
  const typeDef = node.type ? data.meta.nodeTypes?.[node.type] : undefined;
  const typedBody =
    typeDef && node.context ? (
      <PrimitiveRenderer
        layout={typeDef.layout}
        context={node.context}
        L={L}
        onAction={(action, target) => {
          if (action === 'navigate' && typeof target === 'string') onNavigate(target);
        }}
      />
    ) : null;
```

Then, in the returned JSX of `renderNode`, render `{typedBody}` directly after the
node title/lane/phase header block and BEFORE the legacy meta grid. (The legacy
meta grid / modules block is removed in Task 11; for this task both can coexist —
typed nodes have no legacy fields so the legacy block renders nothing for them.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/NodeDrawer/NodeDrawer.primitive.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `npm test -- --run`
Expected: all tests pass (legacy NodeDrawer tests still green — typed path is additive).

- [ ] **Step 7: Commit**

```bash
git add src/components/NodeDrawer/NodeDrawer.tsx src/components/NodeDrawer/NodeDrawer.primitive.test.tsx
git commit -m "feat: render typed nodes via PrimitiveRenderer in NodeDrawer"
```

---

## Task 11: Migrate biller + hiring; remove legacy drawer sections

**Files:**
- Modify: `examples/biller-lifecycle.json`, `examples/hiring-pipeline.json`
- Modify: `src/components/NodeDrawer/NodeDrawer.tsx` (remove legacy meta grid + modules + stateLabels)
- Modify: existing `src/components/NodeDrawer/NodeDrawer.test.tsx` (drop assertions on removed legacy sections)

- [ ] **Step 1: Migrate examples to the typed model**

For each example, add `meta.nodeTypes` with a layout that reproduces what the
node currently shows (objective Prose, a KeyValue for meta fields, a Section +
List + Tile for modules/rubrics), and convert each node to `{ type, context }`.
Keep `id`, `lane`, `phase`, `col` outside `context`.

Concretely, for `examples/hiring-pipeline.json` add to `meta`:

```json
"nodeTypes": {
  "step": {
    "layout": [
      { "type": "Prose", "bind": "$objective" },
      { "type": "Section", "title": "Modules", "sub": "$modulesSub",
        "children": [
          { "type": "List", "bind": "$modules",
            "item": { "type": "Tile", "title": "$name", "sub": "$id", "pills": "$levels" } } ] }
    ]
  }
}
```

and convert each node from `{ id, lane, phase, title, objective, modules }` to:

```json
{ "id": "source", "lane": "sourcer", "phase": "sourcing", "type": "step",
  "context": {
    "title": "Source candidates",
    "objective": "Build a top-of-funnel pipeline.",
    "modulesSub": "features that make this step work",
    "modules": [ { "name": "Outreach template library", "id": "outreach:templates", "levels": [] } ] } }
```

Do the equivalent for `examples/biller-lifecycle.json` (one `nodeType` named
`step`; move objective/entity/actors/triggers/next into a KeyValue `context.meta`
array; move modules into `context.modules`). Preserve all existing text values.

- [ ] **Step 2: Remove the legacy body from NodeDrawer.tsx**

Delete from `renderNode`: the `metaGrid` block (the `renderMetaRow('Objective'...)`
calls), the `modules` `<div className={styles.modulesSection}>...</div>` block, and
the `renderStates`/`stateLabels` calls and their helper functions. Keep the title /
lane / phase header and the deps (Depends on / Triggers) block. Remove now-unused
imports and the `renderMetaRow`, `renderStates`, `stateLabels`, `ModuleRow`,
`resolveModule`, `ModePill`, `ToolsetRow` helpers if they are no longer referenced.

- [ ] **Step 3: Update legacy NodeDrawer tests**

In `src/components/NodeDrawer/NodeDrawer.test.tsx`, remove or rewrite any test that
asserts on the removed sections (e.g. "renders Objective row", "renders Modules
header", "renders Current/Future state"). Tests for the header, deps, navigation,
and Escape stay.

- [ ] **Step 4: Run the full suite**

Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add examples/biller-lifecycle.json examples/hiring-pipeline.json src/components/NodeDrawer/NodeDrawer.tsx src/components/NodeDrawer/NodeDrawer.test.tsx
git commit -m "refactor: migrate examples to typed nodes; remove legacy drawer sections"
```

---

## Task 12: Document the primitives in docs/

**Files:**
- Create: `docs/primitives.html`
- Modify: `docs/index.html` (add a link to primitives.html)

- [ ] **Step 1: Write docs/primitives.html**

Create a static page (match the existing `docs/index.html` style: vanilla HTML)
documenting each of the 10 primitives — `Section, KeyValue, List, Tile, Pills,
Prose, Title, Text, Button, Link` — with its fields and a short JSON example, plus
a "Bindings" section explaining the `$key` rule (string starting with `$` reads
`context.key`; otherwise literal; inside `List` the `item` gets each element as
local context) and the node `{ type, context }` + `meta.nodeTypes` shape.

- [ ] **Step 2: Link it from docs/index.html**

Add an anchor in `docs/index.html` pointing to `./primitives.html` (label:
"Drawer primitives reference").

- [ ] **Step 3: Commit**

```bash
git add docs/primitives.html docs/index.html
git commit -m "docs: add drawer primitives reference"
```

---

## Final verification

- [ ] Run `npm test -- --run` — all green.
- [ ] Run `npm run typecheck` — clean.
- [ ] Run `npm run build` — succeeds.
- [ ] Manually (or via `npm run dev`) open the biller and interview maps; confirm node drawers render via primitives with no "Unknown" and no "features that make this step work" hardcoded string.
