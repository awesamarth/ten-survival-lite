'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, decodeEventLog } from 'viem'
import {
  SURVIVAL_CONTRACT_ABI,
  SURVIVAL_TOKEN_ABI,
  LOCAL_SURVIVAL_CONTRACT_ADDRESS,
  LOCAL_SURVIVAL_TOKEN_ADDRESS
} from '@/constants'
import { foundry } from 'viem/chains'

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const { writeContract, writeContractAsync, data: hash, isPending } = useWriteContract()
  const [selectedPosition, setSelectedPosition] = useState<number>(0)
  const [gameResult, setGameResult] = useState<{gameEnded: boolean, won: boolean, result: string} | null>(null)

  // Wait for transaction confirmations
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Events are now handled in the transaction receipt useEffect


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
    setGameResult(null) // Clear previous results
    
    try {
      writeContract({
        address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
        abi: SURVIVAL_CONTRACT_ABI,
        functionName: 'startGame',
        args: [selectedPosition]
      })
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const handleMakeChoice = async (detonate: boolean) => {
    console.log('🎯 Making choice:', detonate ? 'DETONATE' : 'PASS')
    
    try {
      writeContract({
        address: LOCAL_SURVIVAL_CONTRACT_ADDRESS as `0x${string}`,
        abi: SURVIVAL_CONTRACT_ABI,
        functionName: 'makeChoice',
        args: [detonate]
      })
    } catch (error) {
      console.error('Error making choice:', error)
    }
  }

  // Refresh data after successful transactions
  const refreshData = () => {
    console.log('🔄 Refreshing data...')
    refetchRegistration()
    refetchBalance()
    refetchGameConfig()
  }

  useEffect(() => {
    if (isSuccess && receipt && hash) {
      console.log('✅ Transaction successful, refreshing data')
      console.log('📋 Receipt logs:', receipt.logs)
      
      // Look for GameEnded events in transaction receipt
      receipt.logs.forEach((log, index) => {
        console.log(`📄 Log ${index}:`, log)
        
        // Check if this is from our SurvivalContract
        if (log.address.toLowerCase() === LOCAL_SURVIVAL_CONTRACT_ADDRESS.toLowerCase()) {
          console.log('🎯 Found SurvivalContract event!', log.topics, log.data)
          
          try {
            // Decode the event log properly using viem
            const decodedEvent = decodeEventLog({
              abi: SURVIVAL_CONTRACT_ABI,
              data: log.data,
              topics: log.topics as any
            })
            
            console.log('🎉 Decoded event:', decodedEvent)
            
            if (decodedEvent.eventName === 'GameEnded') {
              const { won, tokensEarned, actor, actionType } = decodedEvent.args as any;
              console.log('🎯 GameEnded args:', { won, tokensEarned, actor, actionType })
              
              // Construct result message
              let result = '';
              if (actor === 'You' && actionType === 'special-button') {
                result = 'You won by detonating everyone!';
              } else if (actor === 'You' && actionType === 'self-destruct') {
                result = 'You detonated yourself!';
              } else if (actionType === 'special-button') {
                result = `${actor} detonated everyone`;
              } else if (actionType === 'self-destruct') {
                result = `${actor} detonated themselves - you survived!`;
              } else if (actionType === 'passed') {
                result = 'Everyone passed - you survived!';
              }

              setGameResult({
                gameEnded: true,
                won: Boolean(won),
                result
              });
            }
          } catch (error) {
            console.error('❌ Error decoding event:', error)
          }
        }
      })
      
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
                        {isPending || isConfirming ? 'Starting Game...' : 'Start Game (9 SRV)'}
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
              <h3 className="text-xl font-bold text-white mb-4">Game Config & AI Positions</h3>
              <div className="space-y-4">
                {/* Position Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((pos) => {
                    const config = gameConfig as any;
                    const isPlayer = Number(config.playerPosition) === pos;
                    const isDetonateAll = Number(config.detonateAllIndex) === pos;
                    
                    // Calculate which AI is at this position
                    let aiNumber = -1;
                    let aiDecision = 0;
                    
                    if (!isPlayer) {
                      // Count how many non-player positions come before this one
                      let aiCount = 0;
                      for (let i = 0; i < pos; i++) {
                        if (i !== Number(config.playerPosition)) {
                          aiCount++;
                        }
                      }
                      aiNumber = aiCount + 1; // AI1, AI2, AI3
                      
                      // Get the decision for this AI
                      if (aiNumber === 1) aiDecision = Number(config.ai1Decision);
                      else if (aiNumber === 2) aiDecision = Number(config.ai2Decision);
                      else if (aiNumber === 3) aiDecision = Number(config.ai3Decision);
                    }
                    
                    return (
                      <div 
                        key={pos}
                        className={`p-3 rounded-lg border-2 text-center ${
                          isPlayer 
                            ? 'border-blue-500 bg-blue-900/30' 
                            : 'border-gray-600 bg-gray-800/30'
                        }`}
                      >
                        <div className="text-white font-bold">Position {pos}</div>
                        <div className="text-sm mt-1">
                          {isPlayer ? (
                            <span className="text-blue-300">👤 YOU</span>
                          ) : (
                            <span className="text-gray-300">
                              {aiNumber === 1 ? '👩 Alice' : aiNumber === 2 ? '👨 Bob' : '👦 Charlie'}
                            </span>
                          )}
                        </div>
                        {isDetonateAll && (
                          <div className="text-xs text-red-400 mt-1">⭐ Special Button</div>
                        )}
                        {!isPlayer && (
                          <div className={`text-xs mt-1 ${aiDecision === 1 ? 'text-red-400' : 'text-green-400'}`}>
                            {aiDecision === 1 ? 
                              (isDetonateAll ? '💥 Will Kill Everyone' : '💀 Will Self-Destruct') : 
                              '🤝 Will Pass'
                            }
                          </div>
                        )}
                        {!isPlayer && (
                          <div className="text-xs text-gray-500 mt-1">
                            Raw: {aiNumber === 1 ? Number(config.ai1Decision) : aiNumber === 2 ? Number(config.ai2Decision) : Number(config.ai3Decision)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Additional Info */}
                <div className="text-sm text-gray-300 space-y-1 border-t border-gray-700 pt-3">
                  <p>Player: {(gameConfig as any).playerAddress || 'N/A'}</p>
                  <p>Detonate Button at Position: {(gameConfig as any).detonateAllIndex?.toString() || 'N/A'}</p>
                  <p>Game Active: {(gameConfig as any).gameActive ? 'Yes' : 'No'}</p>
                  <p>Randomness: {(gameConfig as any).randomness?.toString() || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}