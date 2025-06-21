'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useState, useEffect, useRef } from 'react'
import { formatEther } from 'viem'

export default function WalletConnect() {
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()
  const [balance, setBalance] = useState<string>('0')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch balance using wallet provider for TEN Protocol
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && address && connector) {
        try {
          // Check if getProvider method exists
          if (typeof connector.getProvider !== 'function') {
            // Fallback to window.ethereum if connector doesn't have getProvider
            const provider = (window as any).ethereum
            if (provider) {
              const balance = await provider.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
              })
              setBalance(formatEther(BigInt(balance)))
            }
            return
          }

          // Use connector's provider
          const provider = await connector.getProvider() as any
          const balance = await provider.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          })
          setBalance(formatEther(BigInt(balance)))
        } catch (error) {
          // Silently handle errors since balance fetching is working elsewhere
          setBalance('0')
        }
      }
    }

    // Add small delay to avoid race conditions
    const timeoutId = setTimeout(fetchBalance, 100)
    return () => clearTimeout(timeoutId)
  }, [isConnected, address, connector])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="px-4 py-2 hover:cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="px-4 hover:cursor-pointer py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Address</p>
              <p className="text-white font-mono text-sm break-all">{address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-white font-mono">{parseFloat(balance).toFixed(4)} ETH</p>
            </div>
            <button
              onClick={() => {
                disconnect()
                setIsDropdownOpen(false)
              }}
              className="w-full hover:cursor-pointer px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}