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
            className="bg-white rounded-lg p-8 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end items-center mb-6">
              {/* <h2 className="text-xl font-semibold">Sign In</h2> */}
              <button
                onClick={() => setShowAuthenticator(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="amplify-authenticator-container flex justify-center">
              {isAuthenticating ? (
                <div className="text-center py-8">
                  <div className="flex justify-center items-center mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#467291]"></div>
                  </div>
                  <p className="text-gray-600">Signing you in...</p>
                </div>
              ) : (
                <Authenticator>
                  {({ signOut }) => (
                    <div className="text-center">
                      <div className="flex justify-center items-center mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#467291]"></div>
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
        
        /* Restore original font sizes */
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
        <span className="text-sm text-gray-600 hidden sm:inline">
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