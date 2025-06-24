'use client'

import { useState } from 'react'
import { useAccount, useBalance, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { SURVIVAL_CONTRACT_ABI, SURVIVAL_TOKEN_ABI, LOCAL_SURVIVAL_CONTRACT_ADDRESS, LOCAL_SURVIVAL_TOKEN_ADDRESS, TEN_SURVIVAL_CONTRACT_ADDRESS, TEN_SURVIVAL_TOKEN_ADDRESS } from '@/constants'

export default function AnotherTestPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [logs, setLogs] = useState<string[]>([])
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Get contract addresses based on chain ID
  const survivalContract = chainId === 443 ? TEN_SURVIVAL_CONTRACT_ADDRESS : LOCAL_SURVIVAL_CONTRACT_ADDRESS
  const survivalToken = chainId === 443 ? TEN_SURVIVAL_TOKEN_ADDRESS : LOCAL_SURVIVAL_TOKEN_ADDRESS

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Test ETH balance
  const { data: ethBalance, error: ethError, isLoading: ethLoading } = useBalance({
    address: address,
    query: { enabled: !!address }
  })

  // Test SRV token balance
  const { data: srvBalance, error: srvError, isLoading: srvLoading } = useReadContract({
    address: survivalToken as `0x${string}`,
    abi: SURVIVAL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    account: address,
    query: { enabled: !!address }
  })

  // Test registration status
  const { data: isRegistered, error: regError, isLoading: regLoading } = useReadContract({
    address: survivalContract as `0x${string}`,
    abi: SURVIVAL_CONTRACT_ABI,
    functionName: 'registered',
    args: [address],
    account: address,
    query: { enabled: !!address }
  })

  const runTests = () => {
    setLogs([])
    addLog('Starting tests...')
    addLog(`Chain ID: ${chainId}`)
    addLog(`Connected: ${isConnected}`)
    addLog(`Address: ${address}`)
    addLog(`Survival Contract: ${survivalContract}`)
    addLog(`Survival Token: ${survivalToken}`)
  }

  const handleRegister = async () => {
    if (!address) return
    
    try {
      addLog('Starting registration...')
      writeContract({
        address: survivalContract as `0x${string}`,
        abi: SURVIVAL_CONTRACT_ABI,
        functionName: 'registerPlayer',
        value: parseEther('0.01')
      })
      addLog('Registration transaction sent!')
    } catch (error) {
      addLog(`Registration error: ${error}`)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center pt-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to run tests</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] pt-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Debug Test Page</h1>
          <p className="text-gray-400">Testing contract reads and balances</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Results */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">ETH Balance</h3>
                <p className="text-sm text-gray-400">Loading: {ethLoading ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-400">Error: {ethError?.message || 'None'}</p>
                <p className="text-green-400">{ethBalance ? formatEther(ethBalance.value) + ' ETH' : 'No data'}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-300">SRV Balance</h3>
                <p className="text-sm text-gray-400">Loading: {srvLoading ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-400">Error: {srvError?.message || 'None'}</p>
                <p className="text-green-400">{srvBalance ? formatEther(srvBalance as bigint) + ' SRV' : 'No data'}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-300">Registration Status</h3>
                <p className="text-sm text-gray-400">Loading: {regLoading ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-400">Error: {regError?.message || 'None'}</p>
                <p className="text-green-400">{isRegistered !== undefined ? (isRegistered ? 'Registered' : 'Not Registered') : 'No data'}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={runTests}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Run Tests
              </button>
              
              <button
                onClick={handleRegister}
                disabled={isPending || isConfirming || isRegistered}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {isPending || isConfirming ? 'Registering...' : isRegistered ? 'Already Registered' : 'Register Player (0.01 ETH)'}
              </button>
              
              {isSuccess && (
                <div className="text-green-400 text-sm">
                  ✅ Registration successful! Hash: {hash}
                </div>
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Logs</h2>
            <div className="bg-black rounded p-4 h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-green-400 text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Raw Debug Info</h2>
          <pre className="text-gray-400 text-sm overflow-x-auto">
            {JSON.stringify({
              chainId,
              address,
              survivalContract,
              survivalToken,
              ethBalance: ethBalance?.value?.toString(),
              srvBalance: srvBalance?.toString(),
              isRegistered,
              errors: {
                eth: ethError?.message,
                srv: srvError?.message,
                reg: regError?.message
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}