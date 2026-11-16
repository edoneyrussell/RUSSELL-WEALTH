import { t } from './language.ts';

type Props = Record<string, unknown>;
// Centralize presentation localization for the existing JSX screens. Never mutate the DOM:
// React receives translated text from its first render and continues to own every node.
export function localizeProps(type: unknown, input: unknown): unknown {
  const props = input as Props | null;
  if ((typeof type !== 'string' && type !== Symbol.for('react.fragment')) || !props || props.translate === 'no' || props['data-no-translate']) return props;
  if (typeof type === 'string' && ['script', 'style', 'code', 'pre'].includes(type)) return props;
  const result = {...props};
  const children = props.children;
  const translateChild = (child: unknown): unknown => Array.isArray(child) ? child.map(translateChild) : typeof child === 'string' ? t(child) : child;
  if (typeof type === 'string' && typeof children === 'string') result['data-rw-source'] = children;
  else if (typeof type === 'string' && Array.isArray(children) && children.every(child => typeof child === 'string' || typeof child === 'number')) result['data-rw-source'] = children.join('');
  result.children = translateChild(children);
  for (const key of ['aria-label', 'aria-description', 'placeholder', 'title', 'alt']) {
    if (typeof props[key] === 'string') result[key] = t(props[key] as string);
  }
  return result;
}
