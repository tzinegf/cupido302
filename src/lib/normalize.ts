export function normalizeHumanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeOptional(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').trim()
  return cleaned ? cleaned.replace(/\s+/g, ' ') : null
}

