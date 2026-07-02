'use client'

const STORAGE_KEY = 'party_player_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(STORAGE_KEY)
}

export function storeToken(token: string) {
  window.localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(STORAGE_KEY)
}
