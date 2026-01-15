function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Jaro distance
function jaro(aRaw: string, bRaw: string): number {
  const a = normalizeName(aRaw);
  const b = normalizeName(bRaw);

  if (!a || !b) return 0;
  if (a === b) return 1;

  const aLen = a.length;
  const bLen = b.length;
  const matchDistance = Math.max(0, Math.floor(Math.max(aLen, bLen) / 2) - 1);

  const aMatches = new Array<boolean>(aLen).fill(false);
  const bMatches = new Array<boolean>(bLen).fill(false);

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

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  transpositions /= 2;

  return (
    matches / aLen +
    matches / bLen +
    (matches - transpositions) / matches
  ) / 3;
}

export function jaroWinklerScore(a: string, b: string): number {
  const j = jaro(a, b);

  // Common prefix length (max 4)
  const aN = normalizeName(a);
  const bN = normalizeName(b);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, aN.length, bN.length); i++) {
    if (aN[i] === bN[i]) prefix++;
    else break;
  }

  const p = 0.1;
  return j + prefix * p * (1 - j);
}

export function normalizeDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}
