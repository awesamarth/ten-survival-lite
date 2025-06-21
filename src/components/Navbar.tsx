// components/Navbar.tsx
'use client'

import WalletConnect from './WalletConnect'

export default function Navbar() {
  return (
    <nav className="w-full py-6 z-[9999] fixed top-0 bg-[#0e0e0e]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-20 flex items-center justify-between">
        {/* Title */}
        <h1 className="text-xl text-white font-bold">TEN Survival</h1>

        {/* Connect Wallet Button */}
        <WalletConnect />
      </div>
    </nav>
  );
}