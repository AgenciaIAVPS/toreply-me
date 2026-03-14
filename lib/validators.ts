export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z-]*[a-z]$/.test(slug) || /^[a-z]$/.test(slug)
}

export function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z-]/g, '')
}
