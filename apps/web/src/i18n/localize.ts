import { getLocale, tr } from '@ninja/shared';

// The panel and the website write their text in Dutch, in JSX. Every element passes through here on its way to React (see
// vite.config.ts), and the text inside plain HTML elements comes out in the chosen language.

const TEXT_PROPS = ['title', 'placeholder', 'aria-label', 'alt'] as const;

type Props = Record<string, unknown> & { children?: unknown };

const plain = (node: unknown) => node === null || node === undefined || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number';

/** Text written as `{taken} van {n} stoelen bezet` arrives in pieces; they are joined so the sentence is found whole. */
function localizeChildren(children: unknown): unknown {
  if (typeof children === 'string') return tr(children);
  if (Array.isArray(children)) {
    if (children.every(plain)) return tr(children.filter((c) => typeof c === 'string' || typeof c === 'number').join(''));
    let changed = false;
    const out = children.map((c) => {
      if (typeof c !== 'string') return c;
      const t = tr(c);
      if (t !== c) changed = true;
      return t;
    });
    return changed ? out : children;
  }
  return children;
}

/** The props with their text translated, and whether the children stopped being a list. */
export function localizeProps(type: unknown, props: Props): { props: Props; joined: boolean } {
  if (getLocale() === 'nl' || typeof type !== 'string' || !props || props.translate === 'no') return { props, joined: false };
  let out = props;
  const children = localizeChildren(props.children);
  if (children !== props.children) out = { ...props, children };
  for (const name of TEXT_PROPS) {
    const value = props[name];
    if (typeof value !== 'string') continue;
    const t = tr(value);
    if (t === value) continue;
    if (out === props) out = { ...props };
    out[name] = t;
  }
  return { props: out, joined: Array.isArray(props.children) && !Array.isArray(out.children) };
}
