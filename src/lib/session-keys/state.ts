import type { SessionKeyState, StateSubscriber } from './types'

// Internal state
let state: SessionKeyState = {
 sessionKey: null,
 isActive: false,
 balance: null,
 isLoading: false,
 error: null
}

// Subscribers
const subscribers = new Set<StateSubscriber>()

// Simple mutex for state updates
let isUpdating = false

// Load persisted state on init
try {
 const persisted = localStorage.getItem('ten-session-key-state')
 if (persisted) {
   const parsed = JSON.parse(persisted)
   state = {
     ...state,
     sessionKey: parsed.sessionKey,
     isActive: parsed.isActive
   }
 }
} catch (error) {
 console.warn('Failed to load persisted state:', error)
}

export const getState = (): SessionKeyState => ({ ...state })

export const updateState = async (updates: Partial<SessionKeyState>): Promise<void> => {
 // Wait if another update is in progress
 while (isUpdating) {
   await new Promise(resolve => setTimeout(resolve, 50))
 }
 
 try {
   isUpdating = true
   state = { ...state, ...updates }
   
   // Persist key state changes
   if ('sessionKey' in updates || 'isActive' in updates) {
     try {
       localStorage.setItem('ten-session-key-state', JSON.stringify({
         sessionKey: state.sessionKey,
         isActive: state.isActive
       }))
     } catch (error) {
       console.warn('Failed to persist state:', error)
     }
   }
   
   // Notify all subscribers
   subscribers.forEach(callback => {
     try {
       callback(getState())
     } catch (error) {
       console.error('Error in state subscriber:', error)
     }
   })
 } finally {
   isUpdating = false
 }
}

export const subscribeToState = (callback: StateSubscriber): (() => void) => {
 subscribers.add(callback)
 
 // Return unsubscribe function
 return () => {
   subscribers.delete(callback)
 }
}

// Convenience getters
export const getSessionKey = () => state.sessionKey
export const getIsActive = () => state.isActive
export const getBalance = () => state.balance
export const getIsLoading = () => state.isLoading
export const getError = () => state.error