export type GameStatus = 'draft' | 'live' | 'closed'

export interface Player {
  id: string
  token: string
  name: string
  team: string | null
  avatar: string
  score: number
  created_at: string
}

export interface TriviaQuestion {
  id: string
  order_index: number
  question: string
  options: string[]
  correct_index: number
  time_limit_seconds: number
  status: GameStatus
  opened_at: string | null
}

export interface Prediction {
  id: string
  order_index: number
  prompt: string
  unit: string | null
  status: GameStatus
  actual_value: number | null
}

export interface PhotoMission {
  id: string
  order_index: number
  prompt: string
  status: GameStatus
}

export interface PhotoWithMeta {
  id: string
  storage_path: string
  url: string
  vote_count: number
  player_name: string
  is_own: boolean
  has_voted: boolean
}

export const AVATAR_CHOICES = ['🎉', '🌴', '🍹', '🕶️', '🎧', '🦩', '⭐', '🔥', '🌊', '🍉', '🎸', '🚀']
