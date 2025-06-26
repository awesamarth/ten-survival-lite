'use client'

import { useEffect, useState } from 'react'
import { readContract } from 'viem/actions'
import { useWalletClient } from 'wagmi'
import type { Address } from 'viem'

interface UseTenReadContractParams {
  address: Address
  abi: any
  functionName: string
  args?: any[]
  account?: Address
  query?: {
    enabled?: boolean
  }
}

interface UseTenReadContractReturn {
  data: any
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTenReadContract({
  address,
  abi,
  functionName,
  args = [],
  account,
  query = {}
}: UseTenReadContractParams): UseTenReadContractReturn {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const { data: walletClient } = useWalletClient()
  const enabled = query.enabled !== false

  const executeRead = async () => {
    if (!enabled || !account || !walletClient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await readContract(walletClient, {
        address,
        abi,
        functionName,
        args,
        account
      })
      
      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('useTenReadContract error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await executeRead()
  }

  useEffect(() => {
    executeRead()
  }, [address, functionName, JSON.stringify(args), account, enabled, walletClient])

  return {
    data,
    isLoading,
    error,
    refetch
  }
}