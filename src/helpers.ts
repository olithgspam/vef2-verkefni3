export function calculateOffset(page: number, limit: number): number {
  if (page < 1) return 0;
  return (page - 1) * limit;
}

export function isValidId(id: string): boolean {
  const parsed = parseInt(id, 10);
  return !isNaN(parsed) && parsed > 0;
}