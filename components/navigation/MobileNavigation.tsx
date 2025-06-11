'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Home, Search, Plus, User, LogOut, Beaker, Shield, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import SignIn from '@/components/sign-in';
import ThemeToggle from '@/components/ui/theme-toggle';
import Logo from '@/components/ui/logo';

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
  };

  const closeMenu = () => setIsOpen(false);

  // Check if user is admin (has @samba.tv email)
  const isAdmin = session?.user?.email?.endsWith('@samba.tv');

  return (
    <div className="md:hidden">
      {/* Mobile Header */}
      <header 
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm transition-[background-color,border-color] duration-300"
        role="banner"
        aria-label="Mobile navigation header"
      >
        <div className="flex items-center justify-between px-4 h-14">
          {/* Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo */}
          <Link 
            href="/" 
            className="absolute left-1/2 transform -translate-x-1/2"
            onClick={closeMenu}
          >
            <Image
              src="/sambatv-icon.png"
              alt="SambaTV"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {!hasMounted ? (
              <>
                <div className="w-10 h-10 bg-muted animate-pulse rounded"></div>
                <div className="w-10 h-10 bg-muted animate-pulse rounded"></div>
              </>
            ) : (
              <>
                {session?.user ? (
                  <Link href="/submit" onClick={closeMenu}>
                    <Button size="sm" variant="ghost" className="p-2">
                      <Plus className="h-5 w-5" />
                      <span className="sr-only">Create Prompt</span>
                    </Button>
                  </Link>
                ) : (
                  <div className="w-10" /> // Spacer for layout balance
                )}
                <ThemeToggle size="sm" />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={closeMenu} />
      )}

      {/* Mobile Menu Drawer */}
      <div
        id="mobile-menu"
        className={`fixed top-0 left-0 h-full w-64 bg-background/95 backdrop-blur-sm shadow-xl transform transition-[transform,background-color] duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        aria-hidden={!isOpen}
      >
        {/* Menu Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Logo
              width={120}
              height={32}
              className="h-8 w-auto"
            />
            <button
              onClick={closeMenu}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Menu Content */}
        <nav className="p-4" role="navigation" aria-label="Mobile menu navigation">
          {/* User Section */}
          {hasMounted && session?.user && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <Link href="/profile" onClick={closeMenu}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </Button>
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            {!hasMounted ? (
              // Show loading placeholders during hydration
              <>
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
              </>
            ) : (
              <>
                <Link href="/" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Home className="h-4 w-4 mr-3" />
                    Explore Prompts
                  </Button>
                </Link>
                <Link href="/playground" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Beaker className="h-4 w-4 mr-3" />
                    Playground
                  </Button>
                </Link>
                <Link href="/categories" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-3" />
                    Categories
                  </Button>
                </Link>
                {session?.user && (
                  <>
                    <Link href="/submit" onClick={closeMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-3" />
                        Create Prompt
                      </Button>
                    </Link>
                    <Link href="/traces" onClick={closeMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Analytics
                      </Button>
                    </Link>
                  </>
                )}
                {session?.user && isAdmin && (
                  <Link href="/admin" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-3" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="mt-8 pt-8 border-t">
            {!hasMounted ? (
              <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
            ) : session?.user ? (
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </Button>
            ) : (
              <div className="w-full">
                <SignIn />
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
} 