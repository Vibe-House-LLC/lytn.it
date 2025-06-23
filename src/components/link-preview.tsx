'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trackForward } from '@/lib/tracking';

interface LinkPreviewProps {
    id: string;
    destination: string;
    trackingData: {
        ip: string;
        referer: string;
    };
}

export default function LinkPreview({ id, destination, trackingData }: LinkPreviewProps) {
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleContinue = async () => {
        setIsRedirecting(true);
        
        // Track the forward event
        try {
            await trackForward({
                id,
                destination,
                ip: trackingData.ip,
                referer: trackingData.referer
            });
        } catch (error) {
            console.error('Error tracking forward event:', error);
        }
        
        // Redirect to the destination
        window.location.href = destination;
    };

    // Extract domain from URL for display
    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    };

    return (
        <div className="min-h-screen bg-white overflow-hidden relative" style={{ minWidth: '400px' }}>
            <div className="flex flex-col items-center justify-center h-full pb-20">
                <div className="text-[#6e6e6e] w-full min-h-[550px] h-full">
                    <div 
                        className="absolute w-full transform -translate-y-1/2"
                        style={{ 
                            top: '50%',
                        }}
                    >
                        <div className="max-w-2xl mx-auto px-6">
                            {/* Logo */}
                            <div className="text-center mb-8">
                                <h1 
                                    className="text-[#467291] text-center leading-none mb-4"
                                    style={{ 
                                        fontFamily: 'var(--font-dosis)', 
                                        fontSize: '80px',
                                        fontWeight: 600,
                                    }}
                                >
                                    lytn.it
                                </h1>
                                <p 
                                    className="text-[#6e6e6e] text-lg"
                                    style={{ fontFamily: 'var(--font-ubuntu)' }}
                                >
                                    You&apos;re about to visit:
                                </p>
                            </div>

                            {/* URL Preview Card */}
                            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
                                <div className="flex items-center mb-4">
                                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                                    <span 
                                        className="text-green-600 font-medium"
                                        style={{ fontFamily: 'var(--font-ubuntu)' }}
                                    >
                                        Secure Connection
                                    </span>
                                </div>
                                
                                <div className="mb-4">
                                    <p 
                                        className="text-sm text-gray-600 mb-2"
                                        style={{ fontFamily: 'var(--font-ubuntu)' }}
                                    >
                                        Destination:
                                    </p>
                                    <p 
                                        className="text-lg font-medium text-[#467291] break-all"
                                        style={{ fontFamily: 'var(--font-ubuntu-mono)' }}
                                    >
                                        {getDomain(destination)}
                                    </p>
                                </div>
                                
                                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                                    <p 
                                        className="font-mono break-all"
                                        style={{ fontFamily: 'var(--font-ubuntu-mono)' }}
                                    >
                                        {destination}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={handleContinue}
                                    disabled={isRedirecting}
                                    className="bg-[#467291] text-white px-8 py-3 rounded-md hover:bg-[#365a73] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ fontFamily: 'var(--font-ubuntu)' }}
                                >
                                    {isRedirecting ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Redirecting...
                                        </span>
                                    ) : (
                                        'Continue to Site'
                                    )}
                                </button>
                                
                                <Link
                                    href="/"
                                    className="bg-gray-100 text-gray-700 px-8 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium text-lg text-center"
                                    style={{ fontFamily: 'var(--font-ubuntu)' }}
                                >
                                    Create New Link
                                </Link>
                            </div>
                            
                            {/* Info Text */}
                            <div className="text-center mt-8">
                                <p 
                                    className="text-sm text-gray-500"
                                    style={{ fontFamily: 'var(--font-ubuntu)' }}
                                >
                                    Short URL: <span className="font-mono text-[#467291]">lytn.it/{id}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div 
                className="fixed bottom-0 left-0 right-0 pb-[15px] text-xs w-full text-center text-[#d4d4d4]"
                style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
                <div className="text-[11px] w-full text-center text-[#d4d4d4]">
                    © {new Date().getFullYear()} <a href="https://vibehouse.net" className="no-underline text-[#d4d4d4] hover:text-black">Vibe House LLC</a>
                </div>
            </div>
        </div>
    );
}