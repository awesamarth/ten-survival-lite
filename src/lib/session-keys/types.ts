export interface SessionKeyState {
 sessionKey: string | null
 isActive: boolean
 balance: {
  eth: number
  estimatedTransactions: number
 } | null
 isLoading: boolean
 error: Error | null
}

export type StateSubscriber = (state: SessionKeyState) => void