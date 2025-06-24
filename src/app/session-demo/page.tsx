'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useChainId, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import {
  createSessionKey,
  activateSessionKey,
  updateSessionKeyBalance,
  sendSessionKeyTransaction,
  getState,
  subscribeToState,
  TEN_CHAIN_ID,
  type SessionKeyState
} from '@/lib/session-keys'

export default function SessionDemoPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { sendTransaction } = useSendTransaction()
  
  const [sessionState, setSessionState] = useState<SessionKeyState>(getState())
  const [fundAmount, setFundAmount] = useState('0.01')

  useEffect(() => {
    const unsubscribe = subscribeToState(setSessionState)
    return unsubscribe
  }, [])

  console.log("here is the walletclient transport ", walletClient)
  // Update balance when session key is available and walletClient is ready
  useEffect(() => {
    if (sessionState.sessionKey && walletClient) {
      updateSessionKeyBalance(sessionState.sessionKey, walletClient)
    }
  }, [sessionState.sessionKey, walletClient])

  const isOnTenNetwork = chainId === TEN_CHAIN_ID

  const handleCreateSessionKey = async () => {
    if (!walletClient) return
    
    try {
      const sessionKeyAddress = await createSessionKey(walletClient)
      console.log('Session key created:', sessionKeyAddress)
      
      // Update balance after creation
      if (sessionKeyAddress) {
        await updateSessionKeyBalance(sessionKeyAddress, walletClient)
      }
    } catch (error) {
      console.error('Failed to create session key:', error)
    }
  }

  const handleFundSessionKey = async () => {
    if (!address || !sessionState.sessionKey) return
    
    try {
      sendTransaction({
        to: sessionState.sessionKey as `0x${string}`,
        value: parseEther(fundAmount)
      })
      console.log('Funding transaction sent')
      
      // Update balance after a delay (wait for tx to confirm)
      setTimeout(async () => {
        if (walletClient && sessionState.sessionKey) {
          await updateSessionKeyBalance(sessionState.sessionKey, walletClient)
        }
      }, 5000)
    } catch (error) {
      console.error('Failed to fund session key:', error)
    }
  }

  const handleActivateSessionKey = async () => {
    if (!walletClient) return
    
    try {
      await activateSessionKey(walletClient)
      console.log('Session key activated')
    } catch (error) {
      console.error('Failed to activate session key:', error)
    }
  }

  const handleTestTransaction = async () => {
    if (!address || !walletClient) return
    
    try {
      // Send transaction using session key (no wallet popup!)
      const txHash = await sendSessionKeyTransaction({
        to: address,
        value: ("0.001"), // Send 0 ETH to self
        data: '0x'
      }, walletClient)
      
      console.log('Session key transaction sent:', txHash)
    } catch (error) {
      console.error('Failed to send session key transaction:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center pt-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect to TEN testnet to test session keys</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] pt-24">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-20">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-4">🔑 Session Key Demo</h1>
          <p className="text-gray-400 mb-4">Test TEN Protocol session key functionality</p>
          {!isOnTenNetwork && (
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-4">
              <p className="text-yellow-200">
                ⚠️ Please switch to TEN testnet (Chain ID: {TEN_CHAIN_ID}) to use session keys
              </p>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Session Key Status */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Session Key Status</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                <span className="text-gray-400">Address:</span> {sessionState.sessionKey || 'None'}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Active:</span> {sessionState.isActive ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Balance:</span> {sessionState.balance ? `${sessionState.balance.eth.toFixed(6)} ETH` : 'Unknown'}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Est. Transactions:</span> {sessionState.balance?.estimatedTransactions || 0}
              </p>
              {sessionState.error && (
                <p className="text-red-400">
                  <span className="text-gray-400">Error:</span> {sessionState.error.message}
                </p>
              )}
            </div>
          </div>

          {/* Session Key Actions */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Session Key Actions</h3>
            <div className="space-y-4">
              
              {/* Step 1: Create */}
              <div>
                <button
                  onClick={handleCreateSessionKey}
                  disabled={sessionState.isLoading || !!sessionState.sessionKey || !isOnTenNetwork}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {sessionState.isLoading ? 'Creating...' : '1. Create Session Key'}
                </button>
              </div>

              {/* Step 2: Fund */}
              {sessionState.sessionKey && (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      step="0.001"
                      min="0"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleFundSessionKey}
                      disabled={sessionState.isLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {sessionState.isLoading ? 'Funding...' : '2. Fund'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Activate */}
              {sessionState.sessionKey && sessionState.balance && !sessionState.isActive && (
                <div>
                  <button
                    onClick={handleActivateSessionKey}
                    disabled={sessionState.isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {sessionState.isLoading ? 'Activating...' : '3. Activate Session Key'}
                  </button>
                </div>
              )}

              {/* Step 4: Test Transaction */}
              {sessionState.isActive && (
                <div>
                  <button
                    onClick={handleTestTransaction}
                    disabled={sessionState.isLoading}
                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {sessionState.isLoading ? 'Sending...' : '4. Send Test Transaction (No Popup!)'}
                  </button>
                  <p className="text-gray-400 text-xs mt-1">
                    This will send 0 ETH to yourself using the session key - no wallet popup!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Instructions</h3>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Make sure you're connected to TEN testnet (Chain ID: 443)</li>
              <li>Click "Create Session Key" to generate a new session key</li>
              <li>Fund the session key with some ETH for transaction fees</li>
              <li>Activate the session key to enable transaction signing</li>
              <li>Send a test transaction without wallet popups!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}