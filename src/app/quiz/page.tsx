import type { Metadata } from 'next'
import { QuizClient } from './QuizClient'

// Jeu de plage — page publique, aucune auth ni Supabase requise.
export const metadata: Metadata = {
  title: 'Quiz de la Nati 🇨🇭⚽',
  description: 'La Suisse aux 4 dernières Coupes du Monde — quiz de plage',
}

export default function QuizPage() {
  return <QuizClient />
}
