import { Fragment, jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime';

import { localizeProps } from './localize';

export { Fragment };

type Props = Parameters<typeof localizeProps>[1];

export function jsxDEV(type: never, props: Props, key: string | undefined, isStatic: boolean, source?: unknown, self?: unknown) {
  const { props: out, joined } = localizeProps(type, props);
  return reactJsxDEV(type, out, key, isStatic && !joined, source as never, self);
}
