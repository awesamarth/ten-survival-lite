'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import {
  SURVIVAL_CONTRACT_ABI,
  SURVIVAL_TOKEN_ABI,
  LOCAL_SURVIVAL_CONTRACT_ADDRESS,
  LOCAL_SURVIVAL_TOKEN_ADDRESS
} from '@/constants'
import { foundry } from 'viem/chains'

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const [selectedPosition, setSelectedPosition] = useState<number>(0)
  const [gameResult, setGameResult] = useState<{gameEnded: boolean, won: boolean, result: string} | null>(null)

  // Wait for transaction confirmations
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  console.log("address is: ", address)

  const { data: isRegisteredRaw, refetch: refetchRegistration} = useReadContract({
    address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
    abi: SURVIVAL_CONTRACT_ABI,
    functionName: 'registered',
    args: [address],
    query: { enabled: !!address }
  })

  const isRegistered = Boolean(isRegisteredRaw) ?? false

  // Read SRV token balance
  const { data: srvBalance, refetch: refetchBalance } = useReadContract({
    address: LOCAL_SURVIVAL_TOKEN_ADDRESS as `0x${string}`,
    abi: SURVIVAL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  })

  // Read game config
  const { data: gameConfig, refetch: refetchGameConfig } = useReadContract({
    address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
    abi: SURVIVAL_CONTRACT_ABI,
    functionName: 'getGameConfig',
    args: [address],
    query: { enabled: !!address }
  })

  console.log("ye dekh gameConfig for address: ", address)
  console.log(gameConfig)



  const handleRegister = async () => {
    writeContract({
      address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
      abi: SURVIVAL_CONTRACT_ABI,
      chain: foundry,
      functionName: 'registerPlayer',
      value: parseEther('0.01')
    })
  }

  const handleStartGame = async () => {
    console.log('🚀 Starting game with position:', selectedPosition)
    // Don't clear gameResult here - let the useEffect handle it after success
    
    writeContract({
      address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
      abi: SURVIVAL_CONTRACT_ABI,
      functionName: 'startGame',
      args: [selectedPosition]
    })
  }

  const handleMakeChoice = async (detonate: boolean) => {
    writeContract({
      address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
      abi: SURVIVAL_CONTRACT_ABI,
      functionName: 'makeChoice',
      args: [detonate]
    })
  }

  // Refresh data after successful transactions
  const refreshData = () => {
    console.log('🔄 Refreshing data...')
    refetchRegistration()
    refetchBalance()
    refetchGameConfig()
  }

  // Auto-refresh when transaction succeeds
  useEffect(() => {
    if (isSuccess && receipt && hash) {
      console.log('✅ Transaction successful, refreshing data')
      console.log('📄 Receipt:', receipt)
      
      // Only set game result if we're coming from a startGame transaction
      // We can check this by seeing if we have a gameResult already set
      if (!gameResult) {
        console.log('🎯 Selected position was:', selectedPosition)
        
        // For hardcoded randomness, we know the outcome
        // detonateAllIndex = 123456789 % 4 = 1
        // ai1Decision = (123456789 >> 8) % 2 = 1
        // So AI at position 1 always detonates
        
        console.log('🔥 Setting game result...')
        if (selectedPosition > 1) {
          setGameResult({
            gameEnded: true,
            won: false,
            result: `AI at position 1 detonated (you were at position ${selectedPosition})`
          })
          console.log('🔥 Game result set - you lost')
        } else if (selectedPosition === 1) {
          setGameResult({
            gameEnded: true,
            won: true,
            result: `You had the detonate button and won!`
          })
          console.log('🔥 Game result set - you won')
        } else {
          setGameResult({
            gameEnded: true,
            won: false,
            result: `AI at position 1 detonated`
          })
          console.log('🔥 Game result set - AI detonated')
        }
      }
      
      refreshData()
    }
  }, [isSuccess, receipt, hash])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center pt-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect to localhost:8545 (Foundry) to test the game</p>
        </div>
      </div>
    )
  }


  
  const isGameActive = gameConfig ? (gameConfig as any).gameActive : false
  const hasActiveGame = isGameActive
  
  console.log('🎮 isGameActive:', isGameActive)
  console.log('🎮 hasActiveGame:', hasActiveGame)

  return (
    <div className="min-h-screen bg-[#0e0e0e] pt-24">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-20">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-4">🧪 TEN Survival - Test Mode</h1>
          <p className="text-gray-400 mb-8">Testing on Foundry local network</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Stats Panel */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Game Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Registration Status</p>
                <p className="text-white font-bold">{isRegistered ? '✅ Registered' : '❌ Not Registered'}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">SRV Balance</p>
                <p className="text-white font-bold">
                  {srvBalance ? formatEther(srvBalance as bigint) : '0'} SRV
                </p>
              </div>
            </div>
            <button
              onClick={refreshData}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Refresh Data
            </button>
          </div>


            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Register to Play</h3>
              <p className="text-gray-400 mb-4">
                Pay 0.01 ETH to register and receive 200 SRV tokens
              </p>
              <button
                onClick={handleRegister}
                disabled={isPending || isConfirming}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? 'Registering...' : 'Register (0.01 ETH)'}
              </button>
            </div>

          {/* Game Section */}
          {isRegistered && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Survival Game</h3>

              {!hasActiveGame ? (
                <div className="space-y-4">
                  {/* Game Result */}
                  {gameResult ? (
                    <div className="space-y-4">
                      <div className={`p-3 rounded-lg ${gameResult.won ? 'bg-green-800/30 text-green-200' : 'bg-red-800/30 text-red-200'}`}>
                        <p className="font-medium">
                          {gameResult.won ? '🎉 You Won!' : '💥 You Lost!'}
                        </p>
                        <p className="text-sm opacity-80">{gameResult.result}</p>
                      </div>
                      <button
                        onClick={() => {
                          setGameResult(null)
                          setSelectedPosition(0)
                          refreshData()
                        }}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      >
                        🎮 Play Again
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-400">Choose your position (0-3) and start a new game</p>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setSelectedPosition(pos)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedPosition === pos
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                          >
                            Position {pos}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleStartGame}
                        disabled={isPending || isConfirming}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      >
                        {isPending || isConfirming ? 'Starting Game...' : 'Start Game (10 SRV)'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-yellow-400 font-medium">🎮 Game Active!</p>
                  <p className="text-gray-400">Make your choice: Detonate or Pass?</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleMakeChoice(true)}
                      disabled={isPending || isConfirming}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      💥 DETONATE
                    </button>
                    <button
                      onClick={() => handleMakeChoice(false)}
                      disabled={isPending || isConfirming}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      🤝 PASS
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Game Config Debug */}
          {gameConfig && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Game Config (Debug)</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Player: {(gameConfig as any).playerAddress || 'N/A'}</p>
                <p>Detonate All Index: {(gameConfig as any).detonateAllIndex?.toString() || 'N/A'}</p>
                <p>AI1 Decision: {(gameConfig as any).ai1Decision?.toString() || 'N/A'}</p>
                <p>AI2 Decision: {(gameConfig as any).ai2Decision?.toString() || 'N/A'}</p>
                <p>AI3 Decision: {(gameConfig as any).ai3Decision?.toString() || 'N/A'}</p>
                <p>Game Active: {(gameConfig as any).gameActive ? 'Yes' : 'No'}</p>
                <p>Player Position: {(gameConfig as any).playerPosition?.toString() || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {(isPending || isConfirming) && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <p className="text-blue-200">
                {isPending ? 'Confirming transaction...' : 'Transaction confirmed!'}
              </p>
              {hash && (
                <p className="text-blue-300 text-xs mt-2 break-all">
                  Hash: {hash}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}