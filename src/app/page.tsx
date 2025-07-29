'use client';

import { useState } from 'react';
import ShortenUrl from '@/components/shorten-url';
import ReportLink from '@/components/report-link';
import { useEffect } from 'react';

export default function Home() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleReportSuccess = () => {
    setShowReportModal(false);
    setReportSuccess(true);
    // Hide success message after 5 seconds
    setTimeout(() => setReportSuccess(false), 5000);
  };

  useEffect(() => {
    fetch('/api/v2/utility/warm-up');
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div id="gradient" className="h-full w-full">
        <div className="flex flex-col items-center justify-center h-full pb-20">
                      <div id="main" className="text-muted-foreground w-full min-h-[550px] h-full">
            {/* Vertical centered content */}
            <div 
              className="absolute w-full transform -translate-y-1/2"
              style={{ 
                top: '37%',
                height: '300px'
              }}
            >
              <div id="top" className="w-full">
                <div id="content" className="mt-[15px] relative max-w-[1200px] w-full mx-auto">
                  {/* Logo */}
                  <div 
                    id="logo" 
                    className="relative mb-0 mx-auto bg-no-repeat bg-center bg-bottom animate-[fadeInDown_1s_ease-out] w-full max-w-[371px]"
                    style={{
                      height: '207px'
                    }}
                  >
                    <h1 
                      className="absolute w-full bottom-0 m-0 text-[#467291] dark:text-primary text-center leading-none"
                      style={{ 
                        fontFamily: 'var(--font-dosis)', 
                        fontSize: 'min(115px, 80vw)',
                        fontWeight: 600,
                        bottom: '15px'
                      }}
                    >
                      lytn.it
                    </h1>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {reportSuccess && (
                <div className="max-w-[1200px] mx-auto px-4 mb-4">
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Link reported successfully. Thank you for helping keep our community safe.
                    </div>
                  </div>
                </div>
              )}

              {/* URL Shortener Component */}
              <div id="content" className="mt-[15px] relative max-w-[1200px] w-full mx-auto">
                <ShortenUrl />
              </div>

              {/* Report Abuse Link */}
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-red-600 hover:text-red-800 underline text-sm font-medium cursor-pointer"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
                >
                  Report Abuse
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed to bottom */}
        <div 
          id="footer" 
          className="fixed bottom-0 left-0 right-0 pb-[15px] text-xs w-full text-center text-muted-foreground animate-[fadeInUp_1s_ease-out]"
          style={{ fontFamily: 'var(--font-ubuntu)' }}
        >
          <div id="copyright" className="text-[11px] w-full text-center text-muted-foreground">
            © {new Date().getFullYear()} <a href="https://vibehouse.net" className="no-underline text-muted-foreground hover:text-foreground cursor-pointer">Vibe House LLC</a>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportLink
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  );
}
