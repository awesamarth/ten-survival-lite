'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTenAuth } from '@/hooks/useTenAuth'

export default function TenAuth() {
  const { isConnected } = useAccount()
  const { isAuthenticated, isLoading, error, authenticate } = useTenAuth()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your wallet to start playing TEN Survival</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking TEN authentication...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Let the main game interface show
  }

  const handleAuthenticate = async () => {
    try {
      setIsAuthenticating(true)
      await authenticate()
    } catch (err) {
      console.error('Authentication failed:', err)
    } finally {
      setIsAuthenticating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Authenticate with TEN</h2>
            <p className="text-gray-400">
              TEN Protocol requires authentication to access encrypted smart contracts
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">What happens next:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Generate encryption token</li>
                <li>• Sign authentication message</li>
                <li>• Gain access to encrypted game state</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isAuthenticating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                'Authenticate with TEN'
              )}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Your wallet will prompt you to sign a message for authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}