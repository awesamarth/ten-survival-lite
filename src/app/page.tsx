'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi'
import { parseEther, decodeEventLog, formatEther } from 'viem'
import { useRegistration } from '@/hooks/useRegistration'
import Registration from '@/components/Registration'
import StickFigure from '@/components/StickFigure'
import { SURVIVAL_CONTRACT_ABI, SURVIVAL_TOKEN_ABI, LOCAL_SURVIVAL_CONTRACT_ADDRESS, LOCAL_SURVIVAL_TOKEN_ADDRESS, TEN_SURVIVAL_CONTRACT_ADDRESS, TEN_SURVIVAL_TOKEN_ADDRESS } from '@/constants'
import { foundry } from 'viem/chains'

export default function Home() {
  // All hooks must be at the top level
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { isRegistered } = useRegistration()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })
  
  // Get contract addresses based on chain ID
  const survivalContract = chainId === 443 ? TEN_SURVIVAL_CONTRACT_ADDRESS : LOCAL_SURVIVAL_CONTRACT_ADDRESS
  const survivalToken = chainId === 443 ? TEN_SURVIVAL_TOKEN_ADDRESS : LOCAL_SURVIVAL_TOKEN_ADDRESS
  
  // Read game config to check if game is active
  const { data: gameConfig, refetch: refetchGameConfig } = useReadContract({
    address: survivalContract as `0x${string}`,
    abi: SURVIVAL_CONTRACT_ABI,
    functionName: 'getGameConfig',
    args: [address],
    account: address,
    query: { enabled: !!address },
  })

  // Read SRV token balance
  const { data: srvBalance, refetch: refetchBalance } = useReadContract({
    address: survivalToken as `0x${string}`,
    abi: SURVIVAL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  })
  
  // All state hooks
  const [gameStarted, setGameStarted] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number>(0)
  const [gamePhase, setGamePhase] = useState<'positioning' | 'locking-position' | 'waiting' | 'choosing' | 'locking-choice' | 'results'>('positioning')
  const [aiProgress, setAiProgress] = useState<string>('')
  const [gameResult, setGameResult] = useState<{gameEnded: boolean, won: boolean, result: string, isPartialWin?: boolean, tokensEarned?: number} | null>(null)
  const [pendingGameResult, setPendingGameResult] = useState<{won: boolean, actor: string, actionType: string} | null>(null)
  const [showInstructions, setShowInstructions] = useState(true)
  const [showTenWarning, setShowTenWarning] = useState(true)
  const [processedHash, setProcessedHash] = useState<string | null>(null)
  const [displayBalance, setDisplayBalance] = useState<bigint | null>(null)

  // All useEffect hooks must be here too
  // Process transaction results only once per hash
  useEffect(() => {
    if (isSuccess && receipt && hash && hash !== processedHash) {
      setProcessedHash(hash)
      console.log('✅ Transaction successful')
      console.log('📋 Receipt logs:', receipt.logs)
      
      let foundGameEndedEvent = false
      
      // Look for GameEnded events
      receipt.logs.forEach((log) => {
        if (log.address.toLowerCase() === survivalContract.toLowerCase()) {
          try {
            const decodedEvent = decodeEventLog({
              abi: SURVIVAL_CONTRACT_ABI,
              data: log.data,
              topics: log.topics as any
            })
            
            if (decodedEvent.eventName === 'GameEnded') {
              foundGameEndedEvent = true
              const { won, actor, actionType, tokensEarned } = decodedEvent.args as any;
              
              // Store the result for AI progression
              const gameResultData = {
                won: Boolean(won),
                actor: actor,
                actionType: actionType,
                tokensEarned: Number(tokensEarned)
              };
              console.log('🎯 Setting pendingGameResult:', gameResultData)
              setPendingGameResult(gameResultData);
              
              // Start AI progression based on actual result
              console.log('🎬 Starting AI progression for:', actor, actionType)
              simulateAiProgressionFromResult(actor, actionType, gameResultData, selectedPosition);
            }
          } catch (error) {
            console.error('❌ Error decoding event:', error)
          }
        }
      })
      
      // If no GameEnded event found and we're in locking-position phase,
      // it means the game continues and it's the player's turn
      if (!foundGameEndedEvent && gamePhase === 'locking-position') {
        // Show AI progression for AIs before player, then player's turn
        simulateAiProgressionFromResult('You', 'continues');
      }
      
      // If no GameEnded event and we're locking choice, just go to results
      if (!foundGameEndedEvent && gamePhase === 'locking-choice') {
        setGamePhase('results')
      }
      
      refetchGameConfig()
      refetchBalance()
    }
  }, [isSuccess, receipt, hash, refetchGameConfig, gamePhase, processedHash])

  // Auto switch to TEN testnet on page load
  useEffect(() => {
    if (isConnected && chainId !== 443) {
      switchChain({ chainId: 443 })
    }
  }, [isConnected])

  // SIMPLE AI progression - just show what actually happened
  const simulateAiProgressionFromResult = (actor: string, actionType: string, gameResultData?: any, playerPosition?: number) => {
    if (actor === 'You' && actionType === 'continues') {
      // startGame didn't end immediately, show player's turn
      if (selectedPosition === 0) {
        setGamePhase('choosing')
      } else {
        // Show AIs before player (they passed), then player's turn
        showSimpleProgression(['Alice', 'Bob', 'Charlie'].slice(0, selectedPosition), 'passed', () => {
          setGamePhase('choosing')
        })
      }
    } else {
      // Game ended, show progression and result
      showGameEndProgression(actor, actionType, gameResultData, playerPosition)
    }
  }

  const showSimpleProgression = (ais: string[], action: string, callback: () => void) => {
    setGamePhase('waiting')
    let index = 0
    
    const showNext = () => {
      if (index < ais.length) {
        setAiProgress(`${ais[index]} is thinking...`)
        setTimeout(() => {
          setAiProgress(`${ais[index]} ${action}!`)
          index++
          setTimeout(() => {
            if (index < ais.length) {
              showNext()
            } else {
              setAiProgress('')
              callback()
            }
          }, 2000)
        }, 3000)
      } else {
        callback()
      }
    }
    
    if (ais.length > 0) {
      showNext()
    } else {
      callback()
    }
  }
  
  // Helper to get which AI is at a given position
  const getAIAtPosition = (position: number, playerPosition: number) => {
    const allAIs = ['Alice', 'Bob', 'Charlie'];
    let aiIndex = 0;
    
    // Count how many positions before this one are NOT the player
    for (let i = 0; i < position; i++) {
      if (i !== playerPosition) {
        aiIndex++;
      }
    }
    
    return allAIs[aiIndex];
  };

  // Helper to run animation sequence
  const runAnimationSequence = (sequence: {name: string, action: string}[], gameResultData: any, index = 0) => {
    if (index >= sequence.length) {
      handleFinalResultWithData(gameResultData);
      return;
    }

    const { name, action } = sequence[index];
    const isLastAction = index === sequence.length - 1;
    
    // Show thinking phase
    setAiProgress(`${name} is thinking...`);
    
    setTimeout(() => {
      // Show action phase
      if (action === 'passed') {
        setAiProgress(`${name} passed!`);
      } else if (action === 'self-destruct') {
        setAiProgress(`${name} self-destructed!`);
      } else {
        setAiProgress(`${name} detonated everyone!`);
      }
      
      setTimeout(() => {
        if (isLastAction) {
          handleFinalResultWithData(gameResultData);
        } else {
          runAnimationSequence(sequence, gameResultData, index + 1);
        }
      }, 2000);
    }, 3000);
  };

  const showGameEndProgression = (finalActor: string, finalActionType: string, gameResultData?: any, playerPosition?: number) => {
    console.log('🎭 showGameEndProgression called for:', finalActor, finalActionType, 'with data:', gameResultData, 'playerPos:', playerPosition)
    setGamePhase('waiting')
    
    // Use passed data if available, otherwise fall back to state
    const currentResult = gameResultData || pendingGameResult
    
    if (playerPosition === undefined) {
      // Fallback to old behavior
      handleFinalResultWithData(currentResult);
      return;
    }
    
    // If player ended the game, show suspense moment
    if (finalActor === 'You') {
      setAiProgress('Locking in choice...');
      setTimeout(() => {
        handleFinalResultWithData(currentResult);
      }, 3000);
      return;
    }
    
    // Build animation sequence dynamically
    const sequence: {name: string, action: string}[] = [];
    
    if (finalActor === 'Everyone') {
      // Everyone passed - show all AIs after player passing
      for (let pos = playerPosition + 1; pos < 4; pos++) {
        const aiAtPosition = getAIAtPosition(pos, playerPosition);
        sequence.push({ name: aiAtPosition, action: 'passed' });
      }
    } else {
      // Check if finalActor is before or after player
      let finalActorPosition = -1;
      for (let pos = 0; pos < 4; pos++) {
        if (pos === playerPosition) continue;
        const aiAtPosition = getAIAtPosition(pos, playerPosition);
        if (aiAtPosition === finalActor) {
          finalActorPosition = pos;
          break;
        }
      }
      
      if (finalActorPosition < playerPosition) {
        // AI acted during startGame (before player) - just show that AI
        sequence.push({ name: finalActor, action: finalActionType });
      } else {
        // AI acted during makeChoice (after player) - show sequence from player+1 to finalActor
        for (let pos = playerPosition + 1; pos < 4; pos++) {
          const aiAtPosition = getAIAtPosition(pos, playerPosition);
          
          if (aiAtPosition === finalActor) {
            sequence.push({ name: aiAtPosition, action: finalActionType });
            break;
          } else {
            sequence.push({ name: aiAtPosition, action: 'passed' });
          }
        }
      }
    }
    
    // Run the sequence
    if (sequence.length > 0) {
      runAnimationSequence(sequence, currentResult);
    } else {
      handleFinalResultWithData(currentResult);
    }
  }
  
  const handleFinalResultWithData = (gameResult: any) => {
    console.log('🎯 handleFinalResultWithData called with:', gameResult)
    if (!gameResult) {
      console.log('❌ No gameResult, returning early')
      return
    }
    
    const { won, actor, actionType, tokensEarned } = gameResult
    
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

    // Determine if this is a partial win (AI self-destruct or everyone passes)
    const isPartialWin = won && (
      (actionType === 'self-destruct' && actor !== 'You') || 
      (actionType === 'passed' && actor === 'Everyone')
    );
    
    setGameResult({
      gameEnded: true,
      won: won,
      result,
      isPartialWin,
      tokensEarned: tokensEarned || 0
    });
    
    setGamePhase('results')
    setAiProgress('')
    console.log('🧹 Clearing pendingGameResult after setting results')
    setPendingGameResult(null)
    
    // Update to real balance when results show
    setTimeout(() => {
      setDisplayBalance(null)
      refetchBalance()
    }, 500) // Small delay for dramatic effect
  }

  const handleFinalResult = () => {
    handleFinalResultWithData(pendingGameResult)
  }

  // Game handlers
  const handleLockInPosition = async () => {
    console.log('🚀 Starting game with position:', selectedPosition)
    setGameResult(null)
    setGamePhase('locking-position')
    
    // Immediately deduct 9 SRV for suspense
    if (srvBalance) {
      setDisplayBalance(srvBalance as bigint - parseEther('9'))
    }
    
    try {
      await writeContractAsync({
        address: survivalContract as `0x${string}`,
        abi: SURVIVAL_CONTRACT_ABI,
        functionName: 'startGame',
        args: [selectedPosition]
      })
      console.log('✅ Transaction submitted successfully')
    } catch (error: any) {
      console.error('❌ Transaction failed or cancelled:', error)
      setGamePhase('positioning') // Reset on error
      setDisplayBalance(null) // Reset balance display on error
      
      // Check if it's a user rejection
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        console.log('🚫 User cancelled transaction')
      }
    }
  }

  const handleMakeChoice = async (detonate: boolean) => {
    console.log('🎯 Making choice:', detonate ? 'DETONATE' : 'PASS')
    setGamePhase('locking-choice')
    
    try {
      await writeContractAsync({
        address: survivalContract as `0x${string}`,
        abi: SURVIVAL_CONTRACT_ABI,
        functionName: 'makeChoice',
        args: [detonate]
      })
      console.log('✅ Choice transaction submitted successfully')
    } catch (error: any) {
      console.error('❌ Choice transaction failed or cancelled:', error)
      setGamePhase('choosing') // Reset on error
      
      // Check if it's a user rejection
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        console.log('🚫 User cancelled choice transaction')
      }
    }
  }

  // Show wallet connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center pt-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your wallet to start playing TEN Survival</p>
        </div>
      </div>
    )
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-[#0e0e0e] pt-24">
      {/* Fixed Balance Overlay */}
      {(displayBalance || srvBalance) ? (
        <div className="fixed top-28 right-4 z-[9999] bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
          <div className="text-blue-400 font-semibold text-sm">
            Balance: {formatEther((displayBalance || srvBalance) as bigint)} SRV
          </div>
        </div>
      ):""}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-20">
        <div className="text-center py-3">
          <h1 className="text-4xl font-bold text-white mb-4">TEN Survival</h1>
          <p className="text-gray-400 mb-4">
            Encrypted survival game on TEN Protocol
          </p>
          
          {/* TEN Gateway Authentication Notice */}
          {chainId === 443 && showTenWarning && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6 max-w-2xl mx-auto relative">
              <button
                onClick={() => setShowTenWarning(false)}
                className="absolute top-2 hover:cursor-pointer right-2 text-blue-300 hover:text-blue-100 text-lg font-bold"
              >
              <span >x</span>
              </button>
              <p className="text-blue-200 text-sm pr-6">
                <span className="font-semibold">Important:</span> Please ensure your account is authenticated on the{' '}
                <a 
                  href="https://gateway.ten.xyz/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-100 underline"
                >
                  TEN Gateway
                </a>
                {' '}before playing on TEN testnet.
              </p>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          {!isRegistered ? (
            <Registration />
          ) : !gameStarted ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                <div className="text-center mb-6">
                  <StickFigure color="#22c55e" size="medium" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white">Ready to Survive?</h2>
                  
                  {/* Always visible entry fee and basic info */}
                  <div className="mt-4 mb-4">
                    <div className="text-center mb-2 text-xl">
                      <span className="text-gray-300">Entry Fee:</span>
                      <span className="text-red-400 font-semibold ml-2">9 SRV</span>
                    </div>
                    <p className="text-xl font-bold text-center text-yellow-400">Last one standing wins!</p>
                  </div>
                  
                  {/* Toggle button */}
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-blue-400 hover:text-blue-300 hover:cursor-pointer text-sm mb-4"
                  >
                    {showInstructions ? '▼ Hide Instructions' : '▶ Show Instructions'}
                  </button>
                </div>
                
                {/* Collapsible instructions */}
                {showInstructions && (
                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <div className="text-gray-200 text-left leading-relaxed space-y-3">
                      <p className="text-lg">- You and 3 AI opponents (Alice, Bob, Charlie) stand in positions 1-4. Everyone has a bomb attached to them.</p>
                      <p className="text-lg">- One random position has a special detonation button that detonates everyone else.</p>
                      <p className="text-lg">- The other 3 buttons only detonate the person pressing them.</p>
                      <p className="text-lg">- Players choose in order: detonate or pass.</p>
                      
                      <div className="mt-6 pt-4 border-t border-gray-600">
                        <h3 className="text-lg text-gray-300 font-semibold mb-3 text-center">Rewards</h3>
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className="text-gray-300">Special button (detonate all but self):</span>
                            <span className="text-green-400 font-semibold ml-2">+36 SRV</span>
                          </div>
                          <div className="text-center">
                            <span className="text-gray-300">Someone self-destructs:</span>
                            <span className="text-green-400 font-semibold ml-2">+12 SRV</span>
                          </div>
                          <div className="text-center">
                            <span className="text-gray-300">Everyone passes:</span>
                            <span className="text-blue-400 font-semibold ml-2">4 SRV refund</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setGameStarted(true)}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 hover:cursor-pointer text-white rounded-lg font-bold text-lg transition-colors"
              >
                🎮 Start Game
              </button>
            </div>
          ) : gamePhase === 'positioning' ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Choose Your Position</h2>
                <p className="text-gray-400 mb-6">Select where you want to stand in the survival line (1-4)</p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[0, 1, 2, 3].map((pos) => (
                  <div key={pos} className="text-center">
                    <button
                      onClick={() => setSelectedPosition(pos)}
                      className={`w-full p-4 rounded-lg border-2 transition-all hover:cursor-pointer ${
                        selectedPosition === pos
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                      }`}
                    >
                      <div className="mb-3">
                        <StickFigure 
                          color={selectedPosition === pos ? "#22c55e" : "#9ca3af"} 
                          size="medium" 
                          className="mx-auto" 
                        />
                      </div>
                      <div className="text-white font-medium">Position {pos + 1}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {selectedPosition === pos ? "Selected" : "Available"}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={handleLockInPosition}
                  disabled={isPending || isConfirming}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 hover:cursor-pointer disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isPending || isConfirming ? 'Locking In...' : 'Lock In Position (9 SRV)'}
                </button>
                <div className="mt-4">
                  <button
                    onClick={() => setGameStarted(false)}
                    className="text-gray-400 hover:text-white hover:cursor-pointer transition-colors"
                  >
                    ← Back to Start
                  </button>
                </div>
              </div>
            </div>
          ) : gamePhase === 'locking-position' ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Locking In Position...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              </div>
            </div>
          ) : gamePhase === 'waiting' ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Game in Progress</h2>
                <div className="animate-pulse">
                  <StickFigure color="#9ca3af" size="large" className="mx-auto mb-4" />
                </div>
                <p className="text-xl text-yellow-400 font-medium">{aiProgress}</p>
              </div>
            </div>
          ) : gamePhase === 'choosing' ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Your Turn!</h2>
                <StickFigure color="#22c55e" size="large" className="mx-auto mb-6" />
                <p className="text-lg text-gray-300 mb-6">Make your choice:</p>
              </div>
              
              <div className="flex gap-6 justify-center">
                <button
                  onClick={() => handleMakeChoice(true)}
                  disabled={isPending || isConfirming}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 hover:cursor-pointer disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition-colors"
                >
                  {isPending || isConfirming ? 'Choosing...' : '💥 DETONATE'}
                </button>
                <button
                  onClick={() => handleMakeChoice(false)}
                  disabled={isPending || isConfirming}
                  className="px-8 py-4 bg-gray-600 hover:bg-gray-700 hover:cursor-pointer disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition-colors"
                >
                  {isPending || isConfirming ? 'Choosing...' : '🤝 PASS'}
                </button>
              </div>
            </div>
          ) : gamePhase === 'locking-choice' ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Confirming Choice...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Please confirm the transaction in your wallet</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <div className="mb-8">
                {gameResult && (
                  <div className={`p-6 rounded-lg mb-6 ${
                    gameResult.isPartialWin 
                      ? 'bg-yellow-800/30 border border-yellow-600'
                      : gameResult.won 
                        ? 'bg-green-800/30 border border-green-600' 
                        : 'bg-red-800/30 border border-red-600'
                  }`}>
                    <h2 className={`text-2xl font-bold mb-2 ${
                      gameResult.isPartialWin
                        ? 'text-yellow-200'
                        : gameResult.won 
                          ? 'text-green-200' 
                          : 'text-red-200'
                    }`}>
                      {gameResult.isPartialWin 
                        ? '😅 You (kinda) Won!' 
                        : gameResult.won 
                          ? '🎉 You Won!' 
                          : '💥 You Lost!'
                      }
                    </h2>
                    <p className="text-lg text-gray-300 mb-3">{gameResult.result}</p>
                    {gameResult.tokensEarned !== undefined && (
                      <p className={`text-lg font-semibold ${
                        gameResult.tokensEarned > 0 ? 'text-green-400' : 
                        gameResult.tokensEarned === 0 ? 'text-gray-400' : 'text-red-400'
                      }`}>
                        {/* @ts-ignore */}
                        {gameResult.tokensEarned > 0 ? '+' : ''}{formatEther(gameResult.tokensEarned)} SRV
                      </p>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setGameResult(null)
                    setGameStarted(false)
                    setGamePhase('positioning')
                    setSelectedPosition(0)
                    setAiProgress('')
                    setDisplayBalance(null) // Reset balance display
                  }}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 hover:cursor-pointer text-white rounded-lg font-bold text-lg transition-colors"
                >
                  🎮 Play Again
                </button>
              </div>
            </div>
          )}

          {/* DEBUG: Game Config Section - Remove for production */}
          {gameConfig && typeof gameConfig === 'object' && 'playerPosition' in gameConfig && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">🐛 Debug: Game Config & AI Positions</h3>
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
          {/* END DEBUG */}

        </div>
      </div>
    </div>
  )
}
