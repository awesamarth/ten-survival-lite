'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'

interface TenAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  encryptionToken: string | null
  error: string | null
}

export const useTenAuth = () => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [authState, setAuthState] = useState<TenAuthState>({
    isAuthenticated: false,
    isLoading: true,
    encryptionToken: null,
    error: null
  })

  const TEN_GATEWAY_URL = '/api/ten-gateway'

  const checkAuthentication = async () => {
    if (!isConnected || !address) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        encryptionToken: null,
        error: null
      })
      return
    }

    // Skip TEN authentication for Foundry (chainId 31337)
    if (chainId === 31337) {
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        encryptionToken: 'foundry-bypass',
        error: null
      })
      return
    }

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Check if we have a stored token
      const storedToken = localStorage.getItem('ten_encryption_token')
      if (!storedToken) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          encryptionToken: null,
          error: null
        })
        return
      }
      
      // Check if current address is authenticated with the stored token
      const response = await fetch(`${TEN_GATEWAY_URL}/query?token=${storedToken}&a=${address}`)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.status === true) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            encryptionToken: storedToken,
            error: null
          })
          return
        }
      }

      // Token invalid, remove it
      localStorage.removeItem('ten_encryption_token')
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        encryptionToken: null,
        error: null
      })

    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        encryptionToken: null,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      })
    }
  }

  const authenticate = async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Skip TEN authentication for Foundry (chainId 31337)
    if (chainId === 31337) {
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        encryptionToken: 'foundry-bypass',
        error: null
      })
      return
    }

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      // Step 1: Get encryption token
      const joinResponse = await fetch(`${TEN_GATEWAY_URL}/join`)
      if (!joinResponse.ok) {
        throw new Error('Failed to get encryption token')
      }
      const encryptionToken = await joinResponse.text()

      // Step 2: Create EIP712 message (hardcoded structure from TEN Gateway website)
      // Ensure token has 0x prefix and is lowercase (Ethereum address format)
      const formattedToken = encryptionToken.startsWith('0x') ? 
        encryptionToken.toLowerCase() : 
        `0x${encryptionToken.toLowerCase()}`
      
      const message = {
        domain: {
          name: "Ten",
          version: "1.0",
          chainId: 443,
          verifyingContract: "0x0000000000000000000000000000000000000000"
        },
        message: {
          "Encryption Token": formattedToken
        },
        primaryType: "Authentication",
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          Authentication: [
            { name: "Encryption Token", type: "address" }
          ]
        }
      }

      // Step 3: Sign the EIP712 message
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }

      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(message)]
      })

      // Step 4: Authenticate with signature
      const authResponse = await fetch(`${TEN_GATEWAY_URL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: formattedToken,
          address,
          signature
        })
      })

      if (!authResponse.ok) {
        throw new Error('Authentication failed')
      }

      // Store token for future use (use formatted token)
      localStorage.setItem('ten_encryption_token', formattedToken)

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        encryptionToken: formattedToken,
        error: null
      })

    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }))
      throw error
    }
  }

  const revokeAuthentication = async () => {
    if (!authState.encryptionToken) return

    try {
      await fetch(`${TEN_GATEWAY_URL}/revoke?token=${authState.encryptionToken}`, {
        method: 'POST'
      })
      
      localStorage.removeItem('ten_encryption_token')
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        encryptionToken: null,
        error: null
      })
    } catch (error) {
      console.error('Failed to revoke authentication:', error)
    }
  }

  useEffect(() => {
    checkAuthentication()
  }, [address, isConnected, chainId])

  return {
    ...authState,
    authenticate,
    revokeAuthentication,
    checkAuthentication
  }
}