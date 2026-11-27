// NFR-SEC-01: 8–64 characters with a letter (A-Z or a-z) and a digit.
// The same rule the server checks; checked here first so the user sees it at once.
export function passwordProblem(password: string): string | undefined {
  if (password.length < 8 || password.length > 64) {
    return 'Use 8 to 64 characters.';
  }
  if (!/[A-Za-z]/.test(password)) {
    return 'Include a letter (A-Z or a-z).';
  }
  if (!/\d/.test(password)) {
    return 'Include a digit.';
  }
  return undefined;
}
