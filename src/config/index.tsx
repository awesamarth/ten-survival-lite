import { cookieStorage, createStorage, http } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { foundry, megaethTestnet } from '@reown/appkit/networks'
import { defineChain } from 'viem'


// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

 
export const tenTestnet = defineChain({
  id: 443,
  name: 'TEN Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.ten.xyz/v1'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://tenscan.io' },
  },
})

export const networks = [tenTestnet, foundry]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  //@ts-ignore
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig