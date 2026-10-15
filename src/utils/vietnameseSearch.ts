/** Vietnamese-aware, incremental search for names, classes and student codes. */
export function normalizeVietnameseSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesVietnameseSearch(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const needle = normalizeVietnameseSearch(query);
  if (!needle) return true;
  return fields.some((field) => normalizeVietnameseSearch(field ?? '').includes(needle));
}
