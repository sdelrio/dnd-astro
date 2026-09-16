export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  // Initialize first column and first row
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Check for substring match first
  if (lowerText.includes(lowerQuery)) {
    return true;
  }
  
  // Fuzzy match with Levenshtein distance
  const distance = levenshtein(lowerQuery, lowerText);
  const tolerance = Math.floor(query.length / 3);
  
  return distance <= tolerance;
}
