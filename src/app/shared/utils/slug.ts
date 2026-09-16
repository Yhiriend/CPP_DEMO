/** Diacritic-stripping kebab-case slug, with a numeric suffix appended until `isTaken` returns false. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(value: string, isTaken: (candidate: string) => boolean): string {
  const base = slugify(value);
  let candidate = base;
  let suffix = 2;
  while (isTaken(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}
