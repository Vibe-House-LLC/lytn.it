'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { trackForward } from '@/lib/tracking';
import ReportLink from './report-link';

// Custom hook for auto-sizing text
const useAutoSizeText = (text: string, maxFontSize: number = 80, minFontSize: number = 12) => {
    // Start with a more reasonable initial size to reduce content shift
    const initialSize = Math.min(maxFontSize, 60); // Start smaller to reduce jump
    const [fontSize, setFontSize] = useState(initialSize);
    const [isCalculated, setIsCalculated] = useState(false);
    const textRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (!textRef.current) return;

        const adjustFontSize = () => {
            const element = textRef.current;
            if (!element) return;

            // Create a temporary element to measure text
            const tempElement = document.createElement('span');
            tempElement.style.fontFamily = 'var(--font-dosis)';
            tempElement.style.fontWeight = '600';
            tempElement.style.visibility = 'hidden';
            tempElement.style.position = 'absolute';
            tempElement.style.whiteSpace = 'nowrap';
            tempElement.textContent = text;
            
            document.body.appendChild(tempElement);

            // Calculate optimal font size based on the ACTUAL container width
            const parentElement = element.parentElement;
            const parentWidth = parentElement?.clientWidth ?? window.innerWidth;
            // Small buffer to avoid touching container edges
            const containerWidth = Math.max(0, Math.floor(parentWidth * 0.98));

            // Start from the max size
            tempElement.style.fontSize = `${maxFontSize}px`;
            const textWidthAtMax = tempElement.scrollWidth;

            let calculatedSize = maxFontSize;
            if (textWidthAtMax > containerWidth) {
                const scaleRatio = containerWidth / textWidthAtMax;
                calculatedSize = Math.max(minFontSize, Math.floor(maxFontSize * scaleRatio));
            }

            document.body.removeChild(tempElement);

            setFontSize(calculatedSize);
            setIsCalculated(true);
        };

        // Reduce timeout delay and ensure calculation happens quickly
        const timeoutId = setTimeout(adjustFontSize, 10);

        // Adjust on window resize
        const handleResize = () => {
            setIsCalculated(false);
            setTimeout(adjustFontSize, 10);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [text, maxFontSize, minFontSize]);

    return { fontSize, textRef, isCalculated };
};

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
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [showFullUrl, setShowFullUrl] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [autoforwardEnabled, setAutoforwardEnabled] = useState(true);
    const [isTextTruncated, setIsTextTruncated] = useState(false);
    const urlTextRef = useRef<HTMLParagraphElement>(null);
    
    // Auto-sizing for the main heading - use actual short URL
    const headingText = `${currentHost}/${id}`;
    const { fontSize, textRef, isCalculated } = useAutoSizeText(headingText, 120, 12);

    // Handle client-side only content to prevent hydration issues
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentHost(window.location.host);
            
            // Load autoforward preference from localStorage
            const savedAutoforward = localStorage.getItem('lytn-autoforward-enabled');
            if (savedAutoforward !== null) {
                setAutoforwardEnabled(JSON.parse(savedAutoforward));
            }
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

    // Save autoforward preference to localStorage whenever it changes
    const handleAutoforwardToggle = (enabled: boolean) => {
        setAutoforwardEnabled(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('lytn-autoforward-enabled', JSON.stringify(enabled));
            console.log('Autoforward preference saved:', enabled);
        }
    };

    const handleDestinationClick = useCallback(async () => {
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
    }, [id, destination, trackingData.ip, trackingData.referer]);

    // Countdown timer for auto-forwarding
    useEffect(() => {
        if (countdown > 0 && autoforwardEnabled && !showReportModal) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && autoforwardEnabled && !showReportModal) {
            // Auto-forward when countdown reaches 0
            handleDestinationClick();
        }
    }, [countdown, autoforwardEnabled, showReportModal, handleDestinationClick]);

    const handleReportSuccess = () => {
        setShowReportModal(false);
        setReportSuccess(true);
        // Hide success message after 5 seconds
        setTimeout(() => setReportSuccess(false), 5000);
    };

    return (
        <div className="bg-background flex-grow flex items-center justify-center">
            <div className="w-full">
                <div className="max-w-4xl mx-auto px-6">
                            {/* Logo */}
                            <div className="text-center mb-8">
                                <h1 
                                    ref={textRef}
                                    className="text-[#467291] dark:text-primary text-center leading-none mb-6 hover:text-[#5a8eb2] dark:hover:text-primary/80 transition-colors whitespace-nowrap"
                                    style={{ 
                                        fontFamily: 'var(--font-dosis)', 
                                        fontSize: `${fontSize}px`,
                                        fontWeight: 600,
                                        opacity: isCalculated ? 1 : 0,
                                        transition: 'opacity 0.15s ease-in-out',
                                        minHeight: '60px' // Prevent layout shift
                                    }}
                                >
                                    {headingText}
                                </h1>
                                <div className="flex justify-center mb-4">
                                    <svg 
                                        className="w-12 h-12 text-[#467291] dark:text-primary" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={3} 
                                            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Success Message */}
                            {reportSuccess && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                                    <div className="flex items-center justify-center">
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Link reported successfully. Thank you for helping keep our community safe.
                                    </div>
                                </div>
                            )}

                                                        {/* Destination URL Card */}
                            <div className="mb-12 flex justify-center">
                                <div className="bg-muted px-6 py-3 hover:bg-muted/80 transition-all cursor-pointer max-w-2xl min-w-0">
                                    {/* Redirects to label */}
                                    <div className="mb-3">
                                        <span 
                                            className="text-sm text-muted-foreground font-medium"
                                            style={{ fontFamily: 'var(--font-ubuntu)' }}
                                        >
                                            Redirects to:
                                        </span>
                                    </div>
                                    <div 
                                        onClick={handleDestinationClick}
                                        className="cursor-pointer min-w-0"
                                    >
                                        <p 
                                            ref={urlTextRef}
                                            className={`text-xl font-medium text-foreground min-w-0 ${showFullUrl ? 'break-all' : 'truncate'}`}
                                            style={{ fontFamily: 'var(--font-ubuntu-mono)' }}
                                        >
                                            {destination}
                                        </p>
                                    </div>
                                    {(isTextTruncated || showFullUrl) && (
                                        <div className="flex justify-end mt-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowFullUrl(!showFullUrl);
                                                }}
                                                className="text-sm text-[#467291] hover:text-[#5a8eb2] dark:text-primary dark:hover:text-primary/80 flex items-center gap-1"
                                                style={{ fontFamily: 'var(--font-ubuntu)' }}
                                            >
                                                {showFullUrl ? 'Show less' : 'Show full URL'}
                                                <svg 
                                                    className="w-4 h-4" 
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
                            <div className="text-center mb-6">
                                <div className="flex items-center justify-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="autoforward-checkbox"
                                        checked={autoforwardEnabled}
                                        onChange={(e) => handleAutoforwardToggle(e.target.checked)}
                                        className="cursor-pointer w-4 h-4"
                                    />
                                    <label 
                                        htmlFor="autoforward-checkbox"
                                        className="text-sm text-muted-foreground cursor-pointer leading-none"
                                        style={{ fontFamily: 'var(--font-ubuntu)', fontWeight: 600 }}
                                    >
                                        {autoforwardEnabled 
                                            ? `Auto-redirect (${countdown}s) —` 
                                            : 'Auto-redirect —'
                                        }
                                    </label>
                                    <button
                                        onClick={handleDestinationClick}
                                        className="text-[#467291] hover:text-[#5a8eb2] dark:text-primary dark:hover:text-primary/80 underline cursor-pointer text-sm leading-none flex items-center"
                                        style={{ fontFamily: 'var(--font-ubuntu)', fontWeight: 600 }}
                                    >
                                        {autoforwardEnabled ? 'Skip Wait' : 'Redirect Now'}
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