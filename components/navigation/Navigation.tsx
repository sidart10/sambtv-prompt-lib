'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import UserMenu from '@/components/user/UserMenu';
import SignIn from '@/components/sign-in';
import MobileNavigation from './MobileNavigation';
import ThemeToggle from '@/components/ui/theme-toggle';
import Logo from '@/components/ui/logo';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <>
      {/* Desktop Navigation */}
      <nav 
        id="navigation"
        className="hidden md:block sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm transition-[background-color,border-color] duration-300"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                href="/" 
                className="flex items-center space-x-3 group transition-transform hover:scale-105"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:blur-2xl transition-all rounded-lg"></div>
                  <Logo
                    width={150}
                    height={32}
                    className="relative h-8 w-auto"
                    priority
                  />
                </div>
              </Link>

              {/* Navigation Links */}
              <ul className="flex items-center space-x-1" role="menubar">
                {!hasMounted ? (
                  // Show loading placeholders during hydration
                  <>
                    <li><div className="w-16 h-8 bg-muted animate-pulse rounded"></div></li>
                    <li><div className="w-20 h-8 bg-muted animate-pulse rounded"></div></li>
                    <li><div className="w-20 h-8 bg-muted animate-pulse rounded"></div></li>
                    <li><div className="w-24 h-8 bg-muted animate-pulse rounded"></div></li>
                  </>
                ) : (
                  <>
                    <li role="none">
                      <Link href="/" aria-label="Explore prompts">
                        <Button variant="ghost" className="text-base font-medium h-10 px-4" role="menuitem">
                          Explore
                        </Button>
                      </Link>
                    </li>
                    <li role="none">
                      <Link href="/playground" aria-label="AI Playground">
                        <Button variant="ghost" className="text-base font-medium h-10 px-4" role="menuitem">
                          Playground
                        </Button>
                      </Link>
                    </li>
                    <li role="none">
                      <Link href="/categories" aria-label="Browse categories">
                        <Button variant="ghost" className="text-base font-medium h-10 px-4" role="menuitem">
                          Categories
                        </Button>
                      </Link>
                    </li>
                    {session?.user && (
                      <li role="none">
                        <Link href="/traces" aria-label="AI Trace Analytics">
                          <Button variant="ghost" className="text-base font-medium h-10 px-4" role="menuitem">
                            Analytics
                          </Button>
                        </Link>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {!hasMounted ? (
                // Show loading state during hydration to prevent mismatch
                <>
                  <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
                  <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
                </>
              ) : (
                <>
                  {session?.user ? (
                    <>
                      <Link href="/submit" aria-label="Create a new prompt">
                        <Button className="bg-primary hover:bg-primary/90 text-base font-medium h-10 px-4">
                          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                          Create Prompt
                        </Button>
                      </Link>
                      <UserMenu />
                    </>
                  ) : (
                    <SignIn />
                  )}
                  <ThemeToggle />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </>
  );
} 