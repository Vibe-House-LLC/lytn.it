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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
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
          className="bg-background rounded-lg p-4 pt-0 max-w-lg w-full mx-0 max-h-[90vh] overflow-y-auto border-0"
          onClick={(e) => e.stopPropagation()}
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
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
        /* Use Amplify's documented CSS variables approach */
        [data-amplify-authenticator] {
          --amplify-components-authenticator-router-box-shadow: none;
          --amplify-components-authenticator-router-border-width: 0;
          --amplify-components-button-primary-background-color: #467291;
          --amplify-components-button-primary-color: white;
          --amplify-components-button-link-color: var(--muted-foreground);
          --amplify-components-fieldcontrol-border-color: #89949f;
          --amplify-components-textfield-border-color: #89949f;
          --amplify-components-fieldcontrol-focus-border-color: #467291;
          --amplify-components-tabs-item-color: rgba(0, 0, 0, 0.7);
          --amplify-components-tabs-item-active-color: #467291;
          --amplify-components-tabs-item-active-border-color: #467291;
          --amplify-components-text-color: white;
          --amplify-components-fieldcontrol-color: white;
        }
        
        /* Dark mode - use theme primary color for all blues */
        .dark [data-amplify-authenticator] {
          --amplify-components-fieldcontrol-border-color: oklch(0.6 0.02 220);
          --amplify-components-textfield-border-color: #89949f;
          --amplify-components-button-primary-background-color: oklch(0.7 0.15 220);
          --amplify-components-fieldcontrol-focus-border-color: oklch(0.7 0.15 220);
          --amplify-components-tabs-item-color: white;
          --amplify-components-tabs-item-active-color: oklch(0.7 0.15 220);
          --amplify-components-tabs-item-active-border-color: oklch(0.7 0.15 220);
        }
        
        /* Hide default heading */
        [data-amplify-authenticator] .amplify-heading {
          display: none;
        }
        
        /* Make card background transparent */
        [data-amplify-authenticator] .amplify-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Ensure all Amplify containers have transparent backgrounds */
        [data-amplify-authenticator] [class*="amplify-"],
        [data-amplify-authenticator] div:not([class*="input"]):not(input),
        [data-amplify-authenticator] form,
        [data-amplify-authenticator] fieldset,
        [data-amplify-authenticator] section {
          background-color: transparent !important;
        }
        
        /* Make all text lytn.it blue */
        [data-amplify-authenticator] label,
        [data-amplify-authenticator] span,
        [data-amplify-authenticator] p,
        [data-amplify-authenticator] .amplify-text,
        [data-amplify-authenticator] .amplify-label {
          color: #467291 !important;
        }
        
        /* Force primary buttons to have lytn.it blue background */
        [data-amplify-authenticator] button[type="submit"],
        [data-amplify-authenticator] .amplify-button[type="submit"],
        [data-amplify-authenticator] button[data-amplify-button-variation="primary"],
        [data-amplify-authenticator] .amplify-button[data-amplify-button-variation="primary"] {
          background-color: #467291 !important;
          color: white !important;
          border: none !important;
        }
        
        /* Dark mode buttons use theme primary color */
        .dark [data-amplify-authenticator] button[type="submit"],
        .dark [data-amplify-authenticator] .amplify-button[type="submit"],
        .dark [data-amplify-authenticator] button[data-amplify-button-variation="primary"],
        .dark [data-amplify-authenticator] .amplify-button[data-amplify-button-variation="primary"] {
          background-color: oklch(0.7 0.15 220) !important;
          color: white !important;
        }
        
        /* Tab text - different colors for light and dark mode */
        /* Dark mode tabs - more specific to override other styles */
        .dark [data-amplify-authenticator] .amplify-tabs-item:not([aria-selected="true"]),
        .dark [data-amplify-authenticator] [role="tab"]:not([aria-selected="true"]),
        .dark [data-amplify-authenticator] button[role="tab"]:not([aria-selected="true"]) {
          color: white !important;
        }
        
        /* Light mode tabs */
        :root [data-amplify-authenticator] .amplify-tabs-item,
        :root [data-amplify-authenticator] [role="tab"],
        :root [data-amplify-authenticator] button[role="tab"] {
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        /* Active tab - light mode */
        [data-amplify-authenticator] .amplify-tabs-item[aria-selected="true"],
        [data-amplify-authenticator] [role="tab"][aria-selected="true"] {
          color: #467291 !important;
        }
        
        /* Active tab - dark mode uses theme primary */
        .dark [data-amplify-authenticator] .amplify-tabs-item[aria-selected="true"],
        .dark [data-amplify-authenticator] [role="tab"][aria-selected="true"] {
          color: oklch(0.7 0.15 220) !important;
        }
        
        /* Password show/hide button - light mode pure white background, black icon */
        [data-amplify-authenticator] .amplify-field__show-password,
        [data-amplify-authenticator] button.amplify-field__show-password {
          border-color: var(--amplify-components-fieldcontrol-border-color) !important;
          background-color: white !important;
          color: black !important;
          margin-left: 5px !important;
          border-radius: 6px !important;
        }
        
        /* Light mode specific override */
        :root [data-amplify-authenticator] .amplify-field__show-password,
        :root [data-amplify-authenticator] button.amplify-field__show-password {
          background-color: white !important;
          color: black !important;
          border-color: var(--amplify-components-fieldcontrol-border-color) !important;
          border-radius: 6px !important;
        }
        
        /* Dark mode password button - better contrast border */
        .dark [data-amplify-authenticator] .amplify-field__show-password,
        .dark [data-amplify-authenticator] button.amplify-field__show-password {
          border-color: #89949f !important;
          background-color: rgb(0 0 0 / 0.1) !important;
          color: #000 !important;
          margin-left: 5px !important;
          border-radius: 6px !important;
        }
        
        [data-amplify-authenticator] .amplify-field__show-password:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }
        
        /* Password input field - ensure right side is rounded */
        [data-amplify-authenticator] input[type="password"],
        [data-amplify-authenticator] .amplify-input[type="password"] {
          border-radius: 6px !important;
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
    <Button onClick={onShowAuth} variant="default" size="sm" className="bg-[#467291] hover:bg-[#3a5e7a] text-white">
      Sign In
    </Button>
  );
} 