export type Cert = { name: string; date: string; certId: string }

const KEY = 'handyman-progress'

export function loadProgress(): Record<string, Cert> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveProgress(progress: Record<string, Cert>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // storage blocked (private window): progress lasts for this visit only
  }
}
