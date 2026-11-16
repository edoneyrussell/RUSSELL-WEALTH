import { jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime';
import { localizeProps } from './presentation';
export { Fragment } from 'react/jsx-dev-runtime';
export type { JSX } from 'react/jsx-dev-runtime';
export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStaticChildren, source, self) => reactJsxDEV(type, localizeProps(type, props), key, isStaticChildren, source, self);
