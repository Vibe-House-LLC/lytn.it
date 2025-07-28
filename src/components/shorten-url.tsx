'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useAuthenticator } from '@aws-amplify/ui-react';

// Custom hook for auto-sizing text
const useAutoSizeText = (text: string, maxFontSize: number = 80, minFontSize: number = 16) => {
    // Start with a more reasonable initial size to reduce content shift
    const initialSize = Math.min(maxFontSize, 40); // Start smaller to reduce jump
    const [fontSize, setFontSize] = useState(initialSize);
    const [isCalculated, setIsCalculated] = useState(false);
    const textRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (!textRef.current || !text) return;

        const adjustFontSize = () => {
            const element = textRef.current;
            if (!element) return;

            // Get the actual container (the flex div that contains both copy button and link)
            const container = element.parentElement;
            if (!container) return;

            // Get the copy button element
            const copyButtonContainer = container.querySelector('div.relative');
            const copyButtonWidth = copyButtonContainer ? copyButtonContainer.getBoundingClientRect().width : 40;

            // Calculate available width more accurately
            const containerRect = container.getBoundingClientRect();
            const gap = 8; // gap-2 between copy button and link
            const buffer = 20; // Safety buffer
            
            const availableWidth = containerRect.width - copyButtonWidth - gap - buffer;

            // Create a temporary element to measure text
            const tempElement = document.createElement('span');
            tempElement.style.fontFamily = 'var(--font-dosis)';
            tempElement.style.fontWeight = '600';
            tempElement.style.visibility = 'hidden';
            tempElement.style.position = 'absolute';
            tempElement.style.whiteSpace = 'nowrap';
            tempElement.textContent = text;
            
            document.body.appendChild(tempElement);
            
            let currentSize = maxFontSize;
            tempElement.style.fontSize = `${currentSize}px`;
            
            // Reduce font size until text fits within available space
            while (tempElement.scrollWidth > availableWidth && currentSize > minFontSize) {
                currentSize -= 2;
                tempElement.style.fontSize = `${currentSize}px`;
            }

            // Additional reduction for longer text to maintain visual balance
            const textLength = text.length;
            if (textLength > 15) {
                currentSize = Math.max(currentSize * 0.85, minFontSize);
            } else if (textLength > 12) {
                currentSize = Math.max(currentSize * 0.9, minFontSize);
            }

            document.body.removeChild(tempElement);
            
            const finalSize = Math.max(currentSize, minFontSize);
            console.log('Auto-sizing debug:', {
                text,
                textLength: text.length,
                containerWidth: containerRect.width,
                copyButtonWidth,
                availableWidth,
                calculatedSize: currentSize,
                finalSize
            });
            
            setFontSize(finalSize);
            setIsCalculated(true);
        };

        // Reduce timeout delay for faster calculation
        const timeoutId = setTimeout(adjustFontSize, 50);

        // Adjust on window resize
        const handleResize = () => {
            setIsCalculated(false);
            setTimeout(adjustFontSize, 50);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [text, maxFontSize, minFontSize]);

    return { fontSize, textRef, isCalculated };
};

export default function ShortenUrl() {
    const [url, setUrl] = useState('');
    const [shortenedUrl, setShortenedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    
    // Get current user if authenticated
    const { user } = useAuthenticator((context) => [context.user]);

    // Remove protocol for display
    const displayUrl = shortenedUrl ? shortenedUrl.replace(/^https?:\/\//, '') : '';
    
    // Auto-sizing for the shortened URL
    const { fontSize, textRef, isCalculated } = useAutoSizeText(displayUrl, 60, 16);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setIsLoading(true);
        setError('');
        setShortenedUrl('');

        try {
            // const result = await shortenUrl(url.trim());

            // Prepare payload with user email if authenticated
            const payload: { url: string; userEmail?: string } = { 
                url: url.trim() 
            };
            
            // Add user email if user is authenticated
            if (user?.signInDetails?.loginId) {
                payload.userEmail = user.signInDetails.loginId;
            }

            const response = await fetch('/api/v2/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json();
            const resultId = result?.id;
            
            if (resultId) {
                // Check if result is an error message from backend
                if (resultId.startsWith('Error:')) {
                    setError(resultId.replace('Error: ', ''));
                } else {
                    // Use current origin to construct the full URL
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    setShortenedUrl(`${baseUrl}/${resultId}`);
                }
            } else {
                setError('Failed to shorten URL. Please try again.');
            }
        } catch (err) {
            setError('An error occurred while shortening the URL.');
            console.error('Shortening error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (shortenedUrl) {
            try {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                
                // Try modern Clipboard API first - works on modern iOS Safari 13.4+
                if (navigator.clipboard && window.isSecureContext) {
                    try {
                        await navigator.clipboard.writeText(shortenedUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        return;
                    } catch (clipboardError) {
                        console.log('Clipboard API failed, falling back to manual method:', clipboardError);
                        // Fall through to manual method
                    }
                }
                
                // Fallback method for older browsers or when clipboard API fails
                const textArea = document.createElement('textarea');
                textArea.value = shortenedUrl;
                
                // Position the textarea off-screen
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                textArea.style.opacity = '0';
                textArea.style.pointerEvents = 'none';
                textArea.setAttribute('readonly', '');
                textArea.setAttribute('tabindex', '-1');
                
                document.body.appendChild(textArea);
                
                let successful = false;
                
                if (isIOS) {
                    // iOS-specific selection handling
                    const range = document.createRange();
                    range.selectNodeContents(textArea);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    textArea.setSelectionRange(0, 999999);
                    successful = document.execCommand('copy');
                } else {
                    // Standard selection for other platforms
                    textArea.select();
                    textArea.setSelectionRange(0, 99999);
                    successful = document.execCommand('copy');
                }
                
                document.body.removeChild(textArea);
                
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    throw new Error('Copy command failed');
                }
            } catch (err) {
                console.error('Failed to copy:', err);
                // You might want to show a user-friendly error message here
                // For example: setError('Failed to copy to clipboard. Please try selecting and copying manually.');
            }
        }
    };

    return (
        <div className="w-full text-center px-4 sm:px-6 lg:px-8">
            <form 
                onSubmit={handleSubmit} 
                className="w-full max-w-4xl mx-auto"
            >
                {/* Text Input */}
                <input
                    id="textbox"
                    type="text"
                    className="relative w-[90%] sm:w-[85%] md:w-[80%] lg:w-[100%] h-[60px] bg-input border border-border rounded-[4px] mt-[10px] mx-auto text-left outline-none text-foreground px-[10px] py-0 font-light animate-[fadeIn_1s_ease-out] box-border block focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                    style={{ fontSize: '20px', maxWidth: '1000px' }}
                    name="link"
                    placeholder="https://"
                    value={url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    disabled={isLoading}
                />
                
                {/* Submit Button */}
                <div className="flex justify-center mt-[20px]">
                    <button 
                        type="submit"
                        className="bg-[#467291] dark:bg-primary rounded-[4px] border border-border text-white dark:text-primary-foreground px-[5px] py-0 pl-[15px] text-center no-underline inline-flex items-center justify-center transition-all duration-200 cursor-pointer w-[175px] h-[55px] hover:bg-background hover:text-[#467291] dark:hover:text-primary hover:border-[#467291] dark:hover:border-primary animate-[fadeInUp_1s_ease-out]"
                        style={{ 
                            fontFamily: 'var(--font-roboto-condensed)',
                            letterSpacing: '2pt',
                            fontSize: '18px'
                        }}
                        disabled={isLoading}
                    >
                        <b>{isLoading ? 'LIGHTENING...' : 'LIGHTEN IT'}</b>
                        {!isLoading && (
                            <i 
                                className="fa fa-arrow-circle-o-right ml-[7px]" 
                                aria-hidden="true"
                            ></i>
                        )}
                    </button>
                </div>
            </form>
            
            {/* Result Display */}
            <div 
                id="result" 
                className={`${shortenedUrl || error ? 'block animate-[fadeIn_0.5s_ease-out]' : 'hidden'} max-w-4xl mx-auto`}
            >
                {/* Error Message - No copy button */}
                {error && !shortenedUrl && (
                    <p className="text-red-600 text-center mt-4 text-base px-4">
                        {error}
                    </p>
                )}
                
                {/* Success Result - With copy button */}
                {shortenedUrl && !error && (
                    <div className="flex items-center justify-center gap-2 mt-4 px-4" style={{ minHeight: '40px' }}>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCopy}
                                className={`h-10 w-10 hover:bg-transparent p-0 ml-[-12px] cursor-pointer transition-colors duration-200 ${
                                    copied 
                                        ? 'text-green-600 hover:text-green-700' 
                                        : 'text-[#467291] hover:text-[#5a8eb2] dark:text-primary dark:hover:text-primary/80'
                                }`}
                                title={copied ? 'Copied!' : 'Copy to clipboard'}
                            >
                                <Copy style={{ width: '28px', height: '28px' }} />
                            </Button>
                            {/* Custom tooltip */}
                            {copied && (
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-sm px-3 py-1 rounded-md whitespace-nowrap animate-[fadeIn_0.2s_ease-out] border border-border shadow-md">
                                    Link copied!
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-popover"></div>
                                </div>
                            )}
                        </div>
                        <a 
                            ref={textRef}
                            href={shortenedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#467291] hover:text-[#5a8eb2] dark:text-primary dark:hover:text-primary/80 no-underline cursor-pointer break-all"
                            style={{ 
                                fontFamily: 'var(--font-dosis)',
                                fontSize: `${fontSize * 0.75}pt`, // Convert px to pt (approximate conversion)
                                opacity: isCalculated ? 1 : 0,
                                transition: 'opacity 0.15s ease-in-out'
                            }}
                        >
                            {displayUrl}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
