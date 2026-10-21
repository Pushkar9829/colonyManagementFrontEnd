import { createElement } from 'react';
import { useT } from '../../context/LanguageContext';

// For toast texts built outside a component (e.g. a useApiMutation `success` function in an api.js file):
//   success: (r) => tt(<English text with {count}>, { count: r.updated })
// returns a tiny element that translates itself when the toast renders.
function Translated({ text, vars }) {
  const { t } = useT();
  return t(text, vars);
}

export const tt = (text, vars) => createElement(Translated, { text, vars });
