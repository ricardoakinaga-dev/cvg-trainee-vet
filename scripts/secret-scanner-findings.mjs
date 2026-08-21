export function deduplicateFindings(findings) {
  const unique = new Map();
  for (const item of findings) {
    unique.set(`${item.path}:${item.line}:${item.rule}:${item.evidence}`, item);
  }
  return Object.freeze([...unique.values()]);
}
