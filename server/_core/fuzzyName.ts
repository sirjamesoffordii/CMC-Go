export function normalizeName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z\s\-']/g, "");
}

/**
 * Jaro-Winkler similarity for short human names.
 * Returns a score in [0, 1] where 1 is exact match.
 */
export function jaroWinkler(aRaw: string, bRaw: string): number {
  const a = normalizeName(aRaw);
  const b = normalizeName(bRaw);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aLen = a.length;
  const bLen = b.length;
  const matchDistance = Math.max(0, Math.floor(Math.max(aLen, bLen) / 2) - 1);

  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let t = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const transpositions = t / 2;

  const jaro =
    (matches / aLen + matches / bLen + (matches - transpositions) / matches) / 3;

  // Winkler prefix scaling
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, aLen, bLen); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  const p = 0.1;
  return jaro + prefix * p * (1 - jaro);
}
