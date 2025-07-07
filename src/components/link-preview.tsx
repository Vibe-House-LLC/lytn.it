'use client';

import { useState, useEffect, useRef } from 'react';
import { trackForward } from '@/lib/tracking';
import ReportLink from './report-link';

interface LinkPreviewProps {
    id: string;
    destination: string;
    trackingData: {
        ip: string;
        referer: string;
    };
    host?: string;
}

export default function LinkPreview({ id, destination, trackingData, host = 'this domain' }: LinkPreviewProps) {
    const [currentHost, setCurrentHost] = useState(host);
    const [currentYear, setCurrentYear] = useState(2024);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [showFullUrl, setShowFullUrl] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [autoforwardEnabled, setAutoforwardEnabled] = useState(true);
    const [isTextTruncated, setIsTextTruncated] = useState(false);
    const urlTextRef = useRef<HTMLParagraphElement>(null);

    // Handle client-side only content to prevent hydration issues
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentHost(window.location.host);
            setCurrentYear(new Date().getFullYear());
        }
    }, []);

    // Check if text is truncated
    useEffect(() => {
        if (urlTextRef.current && !showFullUrl) {
            const element = urlTextRef.current;
            setIsTextTruncated(element.scrollWidth > element.clientWidth);
        } else {
            setIsTextTruncated(false);
        }
    }, [destination, showFullUrl]);

    // Countdown timer for auto-forwarding
    useEffect(() => {
        if (countdown > 0 && autoforwardEnabled) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && autoforwardEnabled) {
            // Auto-forward when countdown reaches 0
            handleDestinationClick();
        }
    }, [countdown, autoforwardEnabled]);

    const handleDestinationClick = async () => {
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
        
        window.location.href = destination;
    };

    const handleReportSuccess = () => {
        setShowReportModal(false);
        setReportSuccess(true);
        // Hide success message after 5 seconds
        setTimeout(() => setReportSuccess(false), 5000);
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
                            <div className="text-center mb-4">
                                <h1 
                                        className="text-[#467291] text-center leading-none mb-4 hover:text-[#5a8eb2] transition-colors"
                                    style={{ 
                                        fontFamily: 'var(--font-dosis)', 
                                        fontSize: '64px',
                                        fontWeight: 600,
                                    }}
                                >
                                    lytn.it/{id}
                                </h1>
                                <p 
                                    className="text-[#6e6e6e] text-sm mb-2"
                                    style={{ fontFamily: 'var(--font-ubuntu)' }}
                                >
                                    forwards to
                                </p>
                                <div className="flex justify-center mb-2">
                                    <svg 
                                        className="w-8 h-8 text-[#467291]" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Success Message */}
                            {reportSuccess && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Link reported successfully. Thank you for helping keep our community safe.
                                    </div>
                                </div>
                            )}

                                                        {/* Destination URL Card */}
                            <div className="mb-8 flex justify-center">
                                <div className="bg-gray-100 p-3 hover:bg-gray-200 transition-all cursor-pointer max-w-lg min-w-0">
                                    <div 
                                        onClick={handleDestinationClick}
                                        className="cursor-pointer min-w-0"
                                    >
                                        <p 
                                            ref={urlTextRef}
                                            className={`text-lg font-medium text-gray-700 min-w-0 ${showFullUrl ? 'break-all' : 'truncate'}`}
                                            style={{ fontFamily: 'var(--font-ubuntu-mono)' }}
                                        >
                                            {destination}
                                        </p>
                                    </div>
                                    {(isTextTruncated || showFullUrl) && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowFullUrl(!showFullUrl);
                                                }}
                                                className="text-xs text-[#467291] hover:text-[#5a8eb2] flex items-center gap-1"
                                                style={{ fontFamily: 'var(--font-ubuntu)' }}
                                            >
                                                {showFullUrl ? 'Show less' : 'Show full URL'}
                                                <svg 
                                                    className="w-3 h-3" 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path 
                                                        strokeLinecap="round" 
                                                        strokeLinejoin="round" 
                                                        strokeWidth={2} 
                                                        d={showFullUrl ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Auto-forwarding countdown */}
                            <div className="text-center mb-4">
                                <div className="flex items-center justify-center gap-1">
                                    <input 
                                        type="checkbox"
                                        id="autoforward-checkbox"
                                        checked={autoforwardEnabled}
                                        onChange={(e) => setAutoforwardEnabled(e.target.checked)}
                                        className="cursor-pointer"
                                    />
                                    <label 
                                        htmlFor="autoforward-checkbox"
                                        className="text-sm text-gray-600 cursor-pointer leading-none"
                                        style={{ fontFamily: 'var(--font-ubuntu)', fontWeight: 600 }}
                                    >
                                        {autoforwardEnabled 
                                            ? `Auto-redirect (${countdown}s) —` 
                                            : 'Auto-redirect —'
                                        }
                                    </label>
                                    <button
                                        onClick={handleDestinationClick}
                                        className="text-[#467291] hover:text-[#5a8eb2] underline cursor-pointer text-sm leading-none flex items-center"
                                        style={{ fontFamily: 'var(--font-ubuntu)', fontWeight: 600 }}
                                    >
                                        {autoforwardEnabled ? 'Skip Wait' : 'Forward Now'}
                                    </button>
                                </div>
                            </div>

                            {/* Report Link Button */}
                            <div className="text-center">
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
            </div>
            
            {/* Footer */}
            <div 
                className="fixed bottom-0 left-0 right-0 pb-[15px] text-xs w-full text-center text-[#d4d4d4]"
                style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
                <div className="text-[11px] w-full text-center text-[#d4d4d4]">
                    © {currentYear} <a href="https://vibehouse.net" className="no-underline text-[#d4d4d4] hover:text-black cursor-pointer">Vibe House LLC</a>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <ReportLink
                    lytnUrl={`https://${currentHost}/${id}`}
                    shortId={id}
                    onClose={() => setShowReportModal(false)}
                    onSuccess={handleReportSuccess}
                />
            )}
        </div>
    );
}