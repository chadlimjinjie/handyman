export type Cert = { name: string; date: string; certId: string }

const KEY = 'handyman-progress'

// keeps progress across route changes when storage is blocked
let cache: Record<string, Cert> | undefined

export function loadProgress(): Record<string, Cert> {
  if (!cache) {
    try {
      cache = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    } catch {
      // storage blocked or corrupt: start empty
    }
  }
  return (cache ??= {})
}

export function saveProgress(progress: Record<string, Cert>) {
  cache = progress
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // storage blocked (private window): progress lasts for this visit only
  }
}
