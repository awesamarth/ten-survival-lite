// components/Navbar.tsx
'use client'

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="w-full py-6 z-[9999] fixed top-0 dark:bg-[#0e0e0e] bg-[#f2f2f2]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-20 flex items-center justify-between">
        {/* Mobile menu button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/projects" className="text-sm font-medium transition-colors hover:text-primary">
            Projects
          </Link>
          <Link href="/writings" className="text-sm font-medium transition-colors hover:text-primary">
            Writings
          </Link>
          <Link href="/videos" className="text-sm font-medium transition-colors hover:text-primary">
            Videos
          </Link>
          <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
            Contact
          </Link>
        </div>

        {/* Mobile navigation overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-[100%] left-0 right-0 p-4 dark:bg-[#0e0e0e] bg-[#f2f2f2] border-b">
            <div className="flex flex-col space-y-4 max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-20">
              <Link 
                href="/" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/projects" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Projects
              </Link>
              <Link 
                href="/writings" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Writings
              </Link>
              <Link 
                href="/videos" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Videos
              </Link>
              <Link 
                href="/contact" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}

      </div>
    </nav>
  );
}