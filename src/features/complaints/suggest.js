// Client-side category suggestion from the title, using each category's keyword list from the API.
// Matches whole words / phrases; the category with the most matches wins.
export function suggestCategory(title, categories = []) {
  const hay = ` ${String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  let best = null;
  for (const c of categories) {
    const matched = (c.keywords || []).filter((k) => hay.includes(` ${k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `));
    if (matched.length && (!best || matched.length > best.matched.length)) best = { key: c.key, name: c.name, matched };
  }
  return best;
}
