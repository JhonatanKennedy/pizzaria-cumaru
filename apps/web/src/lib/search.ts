// Catalog and table names are pt-BR, so a manager typing "acai" or "CALABRESA"
// has to find "Açaí" and "Calabresa": the search folds case and accents before
// it compares. The combining marks live in their own block, which is what NFD
// decomposition leaves behind once the base letters are separated out.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim();
}

// An empty query matches everything, so a list can filter unconditionally
// instead of branching on whether the field has been typed into yet.
export function matchesSearch(text: string, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return true;
  }
  return normalizeForSearch(text).includes(needle);
}
