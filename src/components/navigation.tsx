'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - only show when not on home page */}
            {!isHomePage && (
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <h1 
                    className="text-[#467291] hover:text-[#5a8eb2] transition-colors text-2xl font-semibold"
                    style={{ fontFamily: 'var(--font-dosis)' }}
                  >
                    lytn.it
                  </h1>
                </Link>
              </div>
            )}

            {/* Auth section */}
            <div className={`flex items-center ${isHomePage ? 'ml-auto' : ''}`}>
              <AuthSection onShowAuth={() => setShowAuthenticator(true)} />
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuthenticator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end items-center mb-6">
              <button
                onClick={() => setShowAuthenticator(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="amplify-authenticator-container flex justify-center">
              <Authenticator>
                {({ signOut, user }) => (
                  <div className="text-center">
                    <p className="mb-4">Welcome, {user?.signInDetails?.loginId}!</p>
                    <Button 
                      onClick={() => {
                        signOut?.();
                        setShowAuthenticator(false);
                      }} 
                      variant="outline"
                    >
                      Sign Out
                    </Button>
                  </div>
                )}
              </Authenticator>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .amplify-authenticator-container .amplify-authenticator {
          --amplify-components-authenticator-max-width: 100%;
          margin: 0 auto;
        }
        
        .amplify-authenticator-container .amplify-card {
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
        }
        
        .amplify-authenticator-container .amplify-heading {
          display: none !important;
        }
        
        .amplify-authenticator-container .amplify-button {
          font-size: 1rem !important;
          padding: 0.75rem 1rem !important;
        }
        
        .amplify-authenticator-container .amplify-input {
          font-size: 1rem !important;
          padding: 0.75rem !important;
        }
        
        .amplify-authenticator-container .amplify-label {
          font-size: 0.875rem !important;
        }
        
        .amplify-authenticator-container .amplify-text {
          font-size: 1rem !important;
        }
        
        .amplify-authenticator-container .amplify-tabs-item {
          font-size: 1rem !important;
        }
      `}</style>
    </>
  );
}

function AuthSection({ onShowAuth }: { onShowAuth: () => void }) {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  
  if (user) {
    // Get user initials for avatar
    const email = user.signInDetails?.loginId || '';
    const initials = email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={email} />
              <AvatarFallback className="bg-[#467291] text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer opacity-50" disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <Button onClick={onShowAuth} variant="default" size="sm">
      Sign In
    </Button>
  );
} 