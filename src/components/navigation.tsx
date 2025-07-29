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
        
        /* Override Amplify UI components directly with CSS - Specific targeting */
        .amplify-authenticator-container,
        .amplify-authenticator-container [data-amplify-authenticator],
        .amplify-authenticator-container [class*="amplify-"],
        .amplify-authenticator-container div:not([class*="input"]):not(input),
        .amplify-authenticator-container form,
        .amplify-authenticator-container fieldset,
        .amplify-authenticator-container section,
        .amplify-authenticator-container article,
        .amplify-authenticator-container header,
        .amplify-authenticator-container footer {
          background-color: transparent !important;
          color: hsl(var(--foreground)) !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Target the exact classes Amplify uses - better contrast borders */
        .amplify-authenticator-container .amplify-input.amplify-field-group__control,
        .amplify-authenticator-container.amplify-authenticator-container .amplify-input.amplify-field-group__control,
        .amplify-authenticator-container .amplify-input,
        .amplify-authenticator-container.amplify-authenticator-container .amplify-input {
          background-color: var(--input) !important;
          border: 1px solid oklch(0.6 0.02 220) !important; /* Light gray for better contrast */
          color: var(--foreground) !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          box-sizing: border-box !important;
        }

        /* Light mode - use the theme border color */
        :root .amplify-authenticator-container .amplify-input.amplify-field-group__control,
        :root .amplify-authenticator-container.amplify-authenticator-container .amplify-input.amplify-field-group__control,
        :root .amplify-authenticator-container .amplify-input,
        :root .amplify-authenticator-container.amplify-authenticator-container .amplify-input {
          border-color: var(--border) !important;
        }
        
        .amplify-authenticator-container .amplify-input.amplify-field-group__control:focus,
        .amplify-authenticator-container.amplify-authenticator-container .amplify-input.amplify-field-group__control:focus,
        .amplify-authenticator-container .amplify-input:focus,
        .amplify-authenticator-container.amplify-authenticator-container .amplify-input:focus {
          border-color: var(--ring) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 20%, transparent) !important;
          outline: none !important;
        }
        
                /* Primary action buttons (Sign In, Create Account, etc.) */
        .amplify-authenticator-container button[type="submit"],
        .amplify-authenticator-container .amplify-button[type="submit"],
        .amplify-authenticator-container button[data-amplify-button-variation="primary"],
        .amplify-authenticator-container .amplify-button[data-amplify-button-variation="primary"] {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          border-color: var(--primary) !important;
          border: none !important;
          border-radius: 6px !important;
        }

        .amplify-authenticator-container button[type="submit"]:hover,
        .amplify-authenticator-container .amplify-button[type="submit"]:hover,
        .amplify-authenticator-container button[data-amplify-button-variation="primary"]:hover,
        .amplify-authenticator-container .amplify-button[data-amplify-button-variation="primary"]:hover {
          background-color: color-mix(in srgb, var(--primary) 90%, black) !important;
          opacity: 1 !important;
        }

        /* Tab buttons - clean minimal style */
        .amplify-authenticator-container .amplify-tabs-item,
        .amplify-authenticator-container [role="tab"],
        .amplify-authenticator-container button[role="tab"] {
          background-color: transparent !important;
          color: var(--muted-foreground) !important;
          border: none !important;
          border-bottom: 2px solid transparent !important;
          border-radius: 0 !important;
          padding: 8px 16px !important;
        }

        .amplify-authenticator-container .amplify-tabs-item:hover,
        .amplify-authenticator-container [role="tab"]:hover,
        .amplify-authenticator-container button[role="tab"]:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }

        .amplify-authenticator-container .amplify-tabs-item[aria-selected="true"],
        .amplify-authenticator-container [role="tab"][aria-selected="true"],
        .amplify-authenticator-container button[role="tab"][aria-selected="true"] {
          background-color: transparent !important;
          color: var(--primary) !important;
          border-bottom-color: var(--primary) !important;
        }

        /* Link buttons and other secondary actions */
        .amplify-authenticator-container button[data-amplify-button-variation="link"],
        .amplify-authenticator-container .amplify-button[data-amplify-button-variation="link"],
        .amplify-authenticator-container a {
          background-color: transparent !important;
          color: var(--primary) !important;
          border: none !important;
          text-decoration: underline !important;
        }

        .amplify-authenticator-container button[data-amplify-button-variation="link"]:hover,
        .amplify-authenticator-container .amplify-button[data-amplify-button-variation="link"]:hover,
        .amplify-authenticator-container a:hover {
          background-color: transparent !important;
          color: var(--primary) !important;
          opacity: 0.8 !important;
        }
        
        .amplify-authenticator-container label,
        .amplify-authenticator-container .amplify-label,
        .amplify-authenticator-container span,
        .amplify-authenticator-container p {
          color: hsl(var(--foreground)) !important;
          background-color: transparent !important;
        }
        
        .amplify-authenticator-container a,
        .amplify-authenticator-container .amplify-link,
        .amplify-authenticator-container button[data-amplify-button-variation="link"] {
          color: hsl(var(--primary)) !important;
          background-color: transparent !important;
        }
        
        .amplify-authenticator-container [role="alert"],
        .amplify-authenticator-container .amplify-alert {
          background-color: hsl(var(--destructive) / 0.1) !important;
          color: hsl(var(--destructive)) !important;
          border-color: hsl(var(--destructive) / 0.2) !important;
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