export function suiteLink(value: string | undefined) {
  if (!value?.trim()) return undefined
  const url = URL.parse(value)

  if (!url || !["https:", "http:"].includes(url.protocol) || url.username || url.password) return undefined

  return url.href
}
