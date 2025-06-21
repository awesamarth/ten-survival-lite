'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface TenAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  encryptionToken: string | null
  error: string | null
}

export const useTenAuth = () => {
  const { address, isConnected } = useAccount()
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

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Use the hardcoded global encryption token
      const globalToken = '0xf0de535ead5811a9f13a69bb2ae759e1ba5d3a4b'
      
      // Check if current address is authenticated with the global token
      const response = await fetch(`${TEN_GATEWAY_URL}/query?token=${globalToken}&a=${address}`)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.status === true) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            encryptionToken: globalToken,
            error: null
          })
          return
        }
      }

      // Not authenticated
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

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      // Step 1: Use the hardcoded global encryption token
      const encryptionToken = '0xf0de535ead5811a9f13a69bb2ae759e1ba5d3a4b'

      // Step 2: Create EIP712 message with encryption token
      const provider = await (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }

      // Create the standard TEN Gateway EIP712 message
      const message = {
        domain: {
          name: "Ten",
          version: "1.0",
          chainId: 443,
          verifyingContract: "0x0000000000000000000000000000000000000000"
        },
        message: {
          "Encryption Token": encryptionToken
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
      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(message)]
      })

      const type = 'EIP712'

      // Step 4: Authenticate with signature
      const authResponse = await fetch(`${TEN_GATEWAY_URL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: encryptionToken,
          address,
          signature,
          type
        })
      })

      if (!authResponse.ok) {
        throw new Error('Authentication failed')
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        encryptionToken,
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
      await fetch(`${TEN_GATEWAY_URL}/revoke?token=${authState.encryptionToken}`)
      
      // Remove global token
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
  }, [address, isConnected])

  return {
    ...authState,
    authenticate,
    revokeAuthentication,
    checkAuthentication
  }
}