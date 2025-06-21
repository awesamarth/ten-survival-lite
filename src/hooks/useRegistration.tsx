'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface RegistrationState {
  isRegistered: boolean
  isLoading: boolean
  error: string | null
}

// Contract addresses - update these with your deployed addresses
const SURVIVAL_CONTRACT_ADDRESS = '0x...' // Update with your deployed contract address

export const useRegistration = () => {
  const { address, isConnected } = useAccount()
  const [registrationState, setRegistrationState] = useState<RegistrationState>({
    isRegistered: false,
    isLoading: true,
    error: null
  })

  const checkRegistration = async () => {
    if (!isConnected || !address) {
      setRegistrationState({
        isRegistered: false,
        isLoading: false,
        error: null
      })
      return
    }

    try {
      setRegistrationState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Use wallet provider for TEN Protocol encrypted calls
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }

      // Call the registered mapping to check if address is registered
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: SURVIVAL_CONTRACT_ADDRESS,
          data: `0x66d003ac${address.slice(2).padStart(64, '0')}` // registered(address) function selector + padded address
        }, 'latest']
      })

      // Result is hex boolean - 0x0000...0001 = true, 0x0000...0000 = false
      const isRegistered = result !== '0x0000000000000000000000000000000000000000000000000000000000000000'

      setRegistrationState({
        isRegistered,
        isLoading: false,
        error: null
      })

    } catch (error) {
      setRegistrationState({
        isRegistered: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check registration'
      })
    }
  }

  const register = async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      setRegistrationState(prev => ({ ...prev, isLoading: true, error: null }))

      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }

      // Call registerPlayer() function with 0.01 ETH
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: SURVIVAL_CONTRACT_ADDRESS,
          data: '0x44e87f91', // registerPlayer() function selector
          value: '0x2386f26fc10000' // 0.01 ETH in hex
        }]
      })

      // Wait for transaction confirmation
      console.log('Registration transaction sent:', txHash)
      
      // Recheck registration status after a delay
      setTimeout(() => {
        checkRegistration()
      }, 3000)

      return txHash

    } catch (error) {
      setRegistrationState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }))
      throw error
    }
  }

  useEffect(() => {
    checkRegistration()
  }, [address, isConnected])

  return {
    ...registrationState,
    register,
    checkRegistration
  }
}