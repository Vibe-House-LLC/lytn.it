'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useState, useEffect } from 'react';
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { user } = useAuthenticator((context) => [context.user]);

  // Auto-close modal when user becomes authenticated
  useEffect(() => {
    if (user && showAuthenticator) {
      setIsAuthenticating(true);
      // Small delay to show spinner before closing
      setTimeout(() => {
        setShowAuthenticator(false);
        setIsAuthenticating(false);
      }, 500);
    }
  }, [user, showAuthenticator]);

  return (
    <>
      <nav className="w-full bg-background/80 backdrop-blur-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - only show when not on home page */}
            {!isHomePage && (
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <h1 
                    className="text-[#467291] hover:text-[#5a8eb2] dark:text-primary dark:hover:text-primary/80 transition-colors text-2xl font-semibold"
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
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAuthenticator(false)}
        >
        <div 
          className="bg-background rounded-lg p-4 pt-0 max-w-lg w-full mx-0 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end items-center mb-0">
            <button
              onClick={() => setShowAuthenticator(false)}
              className="text-muted-foreground hover:text-foreground text-l leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="amplify-authenticator-container flex justify-center">
            {isAuthenticating ? (
              <div className="text-center py-8">
                <div className="flex justify-center items-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <p className="text-muted-foreground">Signing you in...</p>
              </div>
            ) : (
              <Authenticator>
                {({ signOut }) => (
                  <div className="text-center">
                    <div className="flex justify-center items-center mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
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
            )}
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
          <Button variant="ghost" className="relative h-8 w-8 rounded-full focus:outline-none focus:ring-0 focus:ring-offset-0 border-0 focus:border-0 active:border-0 hover:bg-transparent">
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
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </Link>
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