'use client'

import { useState } from 'react'
import { useRegistration } from '@/hooks/useRegistration'

export default function Registration() {
  const { isRegistered, isLoading, error, register } = useRegistration()
  const [isRegistering, setIsRegistering] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Checking registration status...</p>
      </div>
    )
  }

  if (isRegistered) {
    return (
      <div className="bg-green-900 border border-green-700 rounded-lg p-6 text-center">
        <div className="text-green-400 text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-white mb-2">You're Registered!</h3>
        <p className="text-green-200">
          You have 200 SRV tokens and can start playing TEN Survival
        </p>
      </div>
    )
  }

  const handleRegister = async () => {
    try {
      setIsRegistering(true)
      setTxHash(null)
      const hash = await register()
      setTxHash(hash)
    } catch (err) {
      console.error('Registration failed:', err)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Join TEN Survival</h2>
        <p className="text-gray-400">
          Register to receive 200 SRV tokens and start playing
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">Registration includes:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• 200 SRV tokens for gaming</li>
            <li>• Access to survival games</li>
            <li>• Encrypted gameplay on TEN Protocol</li>
          </ul>
        </div>

        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            <strong>Cost:</strong> 0.01 ETH registration fee
          </p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {txHash && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              Transaction sent! Hash: <code className="break-all">{txHash}</code>
            </p>
            <p className="text-blue-300 text-xs mt-2">
              Waiting for confirmation...
            </p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={isRegistering}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          {isRegistering ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Registering...
            </>
          ) : (
            'Register for 0.01 ETH'
          )}
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Your wallet will prompt you to confirm the transaction
          </p>
        </div>
      </div>
    </div>
  )
}