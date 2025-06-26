'use client'

import { useEffect, useState } from 'react'
import { getTransactionReceipt } from 'viem/actions'
import { useWalletClient } from 'wagmi'
import type { TransactionReceipt } from 'viem'

interface UseTenWaitForReceiptParams {
  hash?: `0x${string}`
}

interface UseTenWaitForReceiptReturn {
  data: TransactionReceipt | undefined
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

export function useTenWaitForReceipt({
  hash
}: UseTenWaitForReceiptParams): UseTenWaitForReceiptReturn {
  const [data, setData] = useState<TransactionReceipt | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { data: walletClient } = useWalletClient()
  const isSuccess = !!data

  const fetchReceipt = async () => {
    if (!hash || !walletClient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const receipt = await getTransactionReceipt(walletClient, { hash })
      setData(receipt)
      setIsLoading(false)
    } catch (err) {
      // Transaction might still be pending, continue polling
      if (err instanceof Error && (
        err.message.includes('pending') || 
        err.message.includes('not be found') ||
        err.message.includes('TransactionReceiptNotFoundError')
      )) {
        // Continue polling after delay
        console.log('🔄 Transaction still pending, polling again in 0.5s...')
        setTimeout(() => fetchReceipt(), 500)
      } else {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        setIsLoading(false)
        console.error('useTenWaitForReceipt error:', error)
      }
    }
  }

  useEffect(() => {
    if (hash && walletClient && !data) {
      fetchReceipt()
    }
  }, [hash, walletClient])

  // Reset state when hash changes
  useEffect(() => {
    setData(undefined)
    setError(null)
    setIsLoading(false)
  }, [hash])

  return {
    data,
    isLoading,
    isSuccess,
    error
  }
}