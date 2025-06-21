import { encode as rlpEncode } from 'rlp'
import { toHex, parseEther } from 'viem'
import { TEN_ADDRESSES, TEN_CHAIN_ID } from './constants'
import { getSessionKey, updateState } from './state'

interface SessionKeyTransactionParams {
  to: string
  data?: string
  value?: string
}

// Convert hex to bytes (Viem alternative to their hexToBytes)
const hexToBytes = (hex: string): Uint8Array => {
  const cleanHex = hex.replace('0x', '')
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
  }
  return bytes
}

const checkTenNetwork = async (walletClient: any): Promise<void> => {
  const chainId = await walletClient.request({ method: 'eth_chainId' })
  const chainIdInt = parseInt(chainId, 16)
  
  if (chainIdInt !== TEN_CHAIN_ID) {
    throw new Error('Session Keys is only for TEN chain, please add or switch to TEN.')
  }
}

const calculateGasFees = async (
  walletClient: any,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> => {
  try {
    // Get fee history for last 10 blocks
    const feeHistory = await walletClient.request({
      method: 'eth_feeHistory',
      params: [
        10, // blocks
        'latest',
        [25, 50, 75] // percentiles
      ]
    })

    // Get base fee from latest block
    const baseFee = BigInt(feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1])
    
    // Get priority fee based on network conditions
    const priorityFeeIndex = priority === 'LOW' ? 0 : priority === 'HIGH' ? 2 : 1
    const maxPriorityFeePerGas = BigInt(feeHistory.reward[feeHistory.reward.length - 1][priorityFeeIndex])
    
    // Calculate max fee using appropriate multiplier
    const multiplier = priority === 'LOW' ? 1.1 : priority === 'HIGH' ? 1.5 : 1.2
    const maxFeePerGas = BigInt(Math.floor(Number(baseFee) * multiplier)) + maxPriorityFeePerGas

    return { maxFeePerGas, maxPriorityFeePerGas }
  } catch (error) {
    // Fallback to fixed values if fee history fails
    return {
      maxFeePerGas: BigInt('20000000000'), // 20 gwei
      maxPriorityFeePerGas: BigInt('2000000000') // 2 gwei
    }
  }
}

export const sendSessionKeyTransaction = async (
  txParams: SessionKeyTransactionParams,
  walletClient: any
): Promise<string> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(walletClient)

    const sessionKeyAddress = getSessionKey()
    if (!sessionKeyAddress) {
      throw new Error('No active session key. Create and activate a session key first.')
    }

    console.log('🚀 Sending session key transaction:', txParams)

    // Verify session key is activated
    try {
      const activationCheck = await walletClient.request({
        method: 'eth_getStorageAt',
        params: [TEN_ADDRESSES.SESSION_KEY_RETRIEVE, '0x0', 'latest']
      })
      console.log('🔍 Session key activation check:', activationCheck)
      
      if (!activationCheck || activationCheck === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('Session key is not properly activated')
      }
    } catch (error) {
      console.warn('⚠️ Could not verify session key activation:', error)
    }

    // Convert value to proper hex format
    const valueInWei = txParams.value && txParams.value !== '0x' ? parseEther(txParams.value) : 0n
    const valueHex = toHex(valueInWei)

    console.log('💰 Value converted:', txParams.value, '→', valueHex)

    // 1. Get chain ID
    const chainId = await walletClient.request({ method: 'eth_chainId' })
    const chainIdInt = parseInt(chainId, 16)

    // 2. Get nonce
    const nonceHex = await walletClient.request({
      method: 'eth_getTransactionCount',
      params: [sessionKeyAddress, 'latest']
    })
    const nonce = parseInt(nonceHex, 16)

    // 3. Calculate gas fees
    const { maxFeePerGas, maxPriorityFeePerGas } = await calculateGasFees(walletClient, 'MEDIUM')

    // 4. Get gas limit
    let gasLimit: number
    try {
      const gasEstimate = await walletClient.request({
        method: 'eth_estimateGas',
        params: [{
          to: txParams.to,
          data: txParams.data || '0x',
          value: valueHex, // Use proper hex value
          from: sessionKeyAddress
        }]
      })
      gasLimit = parseInt(gasEstimate, 16)
    } catch (error) {
      console.warn('Gas estimation failed, using default:', error)
      gasLimit = 25000 // Fallback
    }

    console.log('📊 Transaction params:', {
      chainId: chainIdInt,
      nonce,
      gasLimit,
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString()
    })

    // 5. Build EIP-1559 transaction array - handle zero values properly
    const txArray = [
      toHex(chainIdInt),                    // chainId
      nonce === 0 ? '0x' : toHex(nonce),    // nonce (0 as '0x')
      toHex(maxPriorityFeePerGas),         // maxPriorityFeePerGas
      toHex(maxFeePerGas),                 // maxFeePerGas
      toHex(gasLimit),                     // gasLimit
      txParams.to.toLowerCase(),           // to (ensure lowercase)
      valueInWei === 0n ? '0x' : toHex(valueInWei), // value
      txParams.data?.toLowerCase() || '0x', // data
      [],                                  // accessList (empty)
      '0x',                                // v (signature placeholder)
      '0x',                                // r (signature placeholder)
      '0x'                                 // s (signature placeholder)
    ]

    console.log('🔧 Transaction array:', txArray)

    // 6. RLP encode the transaction
    const rlpEncoded = rlpEncode(txArray)
    console.log('🔧 RLP encoded:', rlpEncoded)
    
    // 7. Prepare EIP-1559 transaction (type 2)
    const rlpBytes = new Uint8Array(rlpEncoded as Buffer)
    const txBytes = new Uint8Array([2, ...rlpBytes]) // EIP-1559 type prefix + RLP data

    // 8. Convert to base64 for TEN
    const txBase64 = btoa(String.fromCharCode(...txBytes))
    console.log('🔧 Transaction base64:', txBase64)

    console.log('📦 Sending transaction to TEN session key executor...')

    // 9. Send through TEN session key execution
    const txHash = await walletClient.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_EXECUTE,
        txBase64,
        'latest'
      ]
    })

    console.log('✅ Session key transaction response:', txHash)

    // Validate transaction hash response
    if (!txHash || txHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Session key transaction failed - received empty or invalid response')
    }

    // Add a small delay then update session key balance
    setTimeout(async () => {
      try {
        const balanceHex = await walletClient.request({
          method: 'eth_getBalance',
          params: [sessionKeyAddress, 'latest']
        })
        console.log('💰 Updated session key balance:', balanceHex)
      } catch (error) {
        console.warn('Failed to update balance after transaction:', error)
      }
    }, 2000)

    updateState({ isLoading: false })
    return txHash

  } catch (error) {
    console.error('❌ Session key transaction failed:', error)
    const err = error instanceof Error ? error : new Error('Transaction failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}