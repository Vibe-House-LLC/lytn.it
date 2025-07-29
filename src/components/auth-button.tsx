'use client';

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AuthButton() {
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
      {showAuthenticator && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0"
          onClick={() => setShowAuthenticator(false)}
        >
          <div 
            className="bg-background rounded-lg p-8 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-lg border-0"
            onClick={(e) => e.stopPropagation()}
            style={{ border: 'none', outline: 'none' }}
          >
            <div className="flex justify-end items-center mb-6">
              {/* <h2 className="text-xl font-semibold">Sign In</h2> */}
              <button
                onClick={() => setShowAuthenticator(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none cursor-pointer"
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
      
      <AuthenticatorWrapper onShowAuth={() => setShowAuthenticator(true)} />
      
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
        
        /* Force input borders with maximum specificity */
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

function AuthenticatorWrapper({ onShowAuth }: { onShowAuth: () => void }) {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user.signInDetails?.loginId}
        </span>
        <Button 
          onClick={() => window.location.href = '/dashboard/admin'} 
          variant="secondary" 
          size="sm"
        >
          Admin
        </Button>
        <Button onClick={signOut} variant="outline" size="sm">
          Sign Out
        </Button>
      </div>
    );
  }
  
  return (
    <Button onClick={onShowAuth} variant="default" size="sm">
      Sign In
    </Button>
  );
} 