'use client'

import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { LOCAL_SURVIVAL_CONTRACT_ADDRESS, TEN_SURVIVAL_CONTRACT_ADDRESS, SURVIVAL_CONTRACT_ABI } from '@/constants'

export const useRegistration = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()
  
  // Get contract address based on chain ID
  const survivalContract = chainId === 443 ? TEN_SURVIVAL_CONTRACT_ADDRESS : LOCAL_SURVIVAL_CONTRACT_ADDRESS
  
  const { data: isRegisteredRaw, isLoading, error, refetch } = useReadContract({
    address: survivalContract as `0x${string}`,
    abi: SURVIVAL_CONTRACT_ABI,
    functionName: 'registered',
    args: [address],
    account: address,
    query: { enabled: !!address }
  })

  const isRegistered = Boolean(isRegisteredRaw) ?? false

  const register = async () => {
    if (!address) throw new Error('Wallet not connected')
    
    const hash = await writeContractAsync({
      address: survivalContract as `0x${string}`,
      abi: SURVIVAL_CONTRACT_ABI,
      functionName: 'registerPlayer',
      value: parseEther('0.01')
    })
    
    // Refetch registration status after transaction
    setTimeout(() => refetch(), 2000)
    
    return hash
  }

  return {
    isRegistered,
    isLoading,
    error: error?.message || null,
    refetch,
    register
  }
}