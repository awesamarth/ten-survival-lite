'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit, useAppKitTheme } from '@reown/appkit/react'
import { foundry, megaethTestnet } from '@reown/appkit/networks'
import React, { ReactNode, useEffect, useState } from 'react'
import { cookieToInitialState, WagmiProvider } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'portfolio',
  description: 'Portfolio',
  url: 'https://appkitexampleapp.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}



function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [initialState, setInitialState] = useState<any>(undefined)

  useEffect(() => {
    setMounted(true)

    // Only initialize AppKit on the client side
    if (typeof window !== 'undefined') {
      createAppKit({
        adapters: [wagmiAdapter],
        projectId: projectId!, // Add the ! here
        networks: [megaethTestnet, foundry],
        defaultNetwork: megaethTestnet,
        metadata: metadata,
        features: {
          email: false,
          socials: ['google'],
        },
        themeVariables: {
          '--w3m-accent': '#333333',
          '--w3m-color-mix': '#000000',
          '--w3m-color-mix-strength': 10,
          '--w3m-border-radius-master': '1px',
          '--w3m-font-family': 'var(--font-geist-sans)',
          '--w3m-z-index': 9999,
        },
        themeMode: 'dark'
      })
    }

    const initializeState = async () => {
      try {
        const state = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies)
        setInitialState(state)
      } catch (error) {
        console.warn("Continuing without blockchain state.")
      }
    }

    initializeState()
  }, [cookies])

  if (!mounted) {
    return null
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider