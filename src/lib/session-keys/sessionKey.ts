import { TEN_ADDRESSES, TEN_CHAIN_ID } from './constants'
import { updateState } from './state'
import { formatEther } from 'viem'

const estimateTransactions = (ethBalance: number): number => {
  return Math.floor(ethBalance / 0.005) // Rough estimate: 0.005 ETH per transaction
}

const checkTenNetwork = async (walletClient: any): Promise<void> => {
  const chainId = await walletClient.request({ method: 'eth_chainId' })
  const chainIdInt = parseInt(chainId, 16)
  
  if (chainIdInt !== TEN_CHAIN_ID) {
    throw new Error('Session Keys is only for TEN chain, please add or switch to TEN.')
  }
}

export const createSessionKey = async (walletClient: any): Promise<string> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(walletClient)

    console.log('🔑 Creating session key on TEN network...')
    console.log('🔑 Using address:', TEN_ADDRESSES.SESSION_KEY_CREATE)

    // Try to create a new session key
    const response = await walletClient.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_CREATE,
        '0x0',
        'latest'
      ]
    })

    console.log('🔑 Create response:', response)

    if (!response || response === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('🔑 Creation failed, trying to retrieve existing session key...')
      
      // If creation failed, try to retrieve existing session key
      const existingKey = await walletClient.request({
        method: 'eth_getStorageAt',
        params: [
          TEN_ADDRESSES.SESSION_KEY_RETRIEVE,
          '0x0',
          'latest'
        ]
      })

      console.log('🔑 Existing key response:', existingKey)

      if (existingKey && existingKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const sessionKeyAddress = '0x' + existingKey.slice(-40) // Extract address from response
        console.log('🔑 Retrieved existing session key:', sessionKeyAddress)
        updateState({ 
          sessionKey: sessionKeyAddress,
          isLoading: false 
        })
        return sessionKeyAddress
      }

      throw new Error('Failed to create session key - both creation and retrieval returned empty response')
    }

    const sessionKeyAddress = '0x' + response.slice(-40) // Extract address from response
    console.log('🔑 Created new session key:', sessionKeyAddress)
    updateState({ 
      sessionKey: sessionKeyAddress,
      isLoading: false 
    })

    return sessionKeyAddress
  } catch (error) {
    console.error('🔑 Session key creation error:', error)
    const err = error instanceof Error ? error : new Error('Unknown error')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const activateSessionKey = async (walletClient: any): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(walletClient)

    console.log('🔓 Activating session key...')

    await walletClient.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_ACTIVATE,
        '0x0',
        'latest'
      ]
    })

    console.log('🔓 Session key activated successfully')

    updateState({ 
      isActive: true,
      isLoading: false 
    })

  } catch (error) {
    console.error('🔓 Session key activation error:', error)
    const err = error instanceof Error ? error : new Error('Activation failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const deactivateSessionKey = async (walletClient: any): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(walletClient)

    await walletClient.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DEACTIVATE,
        '0x0',
        'latest'
      ]
    })

    updateState({ 
      isActive: false,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Deactivation failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const deleteSessionKey = async (walletClient: any): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(walletClient)

    await walletClient.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DELETE,
        '0x0',
        'latest'
      ]
    })

    // Clear persisted state when deleting
    try {
      localStorage.removeItem('ten-session-key-state')
    } catch (error) {
      console.warn('Failed to clear persisted state:', error)
    }

    updateState({ 
      sessionKey: null,
      isActive: false,
      balance: null,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Deletion failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const updateSessionKeyBalance = async (sessionKeyAddress: string, walletClient: any): Promise<void> => {
  try {
    console.log('💰 Updating session key balance for:', sessionKeyAddress)
    
    const balanceHex = await walletClient.request({
      method: 'eth_getBalance',
      params: [sessionKeyAddress, 'latest']
    })

    console.log('💰 Balance response:', balanceHex)

    const balanceWei = BigInt(balanceHex)
    const ethBalance = parseFloat(formatEther(balanceWei))
    
    console.log('💰 Session key balance:', ethBalance, 'ETH')
    
    updateState({
      balance: {
        eth: ethBalance,
        estimatedTransactions: estimateTransactions(ethBalance)
      }
    })
  } catch (error) {
    console.warn('💰 Failed to update balance:', error)
  }
}