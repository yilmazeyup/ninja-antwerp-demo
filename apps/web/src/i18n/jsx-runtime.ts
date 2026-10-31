import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime';

import { localizeProps } from './localize';

export { Fragment };

type Props = Parameters<typeof localizeProps>[1];

export function jsx(type: never, props: Props, key?: string) {
  return reactJsx(type, localizeProps(type, props).props, key);
}

export function jsxs(type: never, props: Props, key?: string) {
  const { props: out, joined } = localizeProps(type, props);
  // A list of pieces joined into one sentence is no longer a static list of children.
  return joined ? reactJsx(type, out, key) : reactJsxs(type, out, key);
}
