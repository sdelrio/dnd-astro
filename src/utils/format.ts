export function signed(number: number): string {
  return number >= 0 ? `+${number}` : `${number}`;
}