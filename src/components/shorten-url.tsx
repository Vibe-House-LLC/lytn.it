'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import shortenUrl from "@/api/shortenUrl";

export default function ShortenUrl() {
    const [url, setUrl] = useState('');
    const [shortenedUrl, setShortenedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

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
            const result = await shortenUrl(url.trim());
            
            if (result) {
                // Check if result is an error message from backend
                if (result.startsWith('Error:')) {
                    setError(result.replace('Error: ', ''));
                } else {
                    setShortenedUrl(`https://${result}`);
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
                await navigator.clipboard.writeText(shortenedUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    // Remove protocol for display
    const displayUrl = shortenedUrl ? shortenedUrl.replace(/^https?:\/\//, '') : '';

    return (
        <div className="w-full text-center">
            <form 
                onSubmit={handleSubmit} 
                className="w-full"
            >
                {/* Text Input */}
                <input
                    id="textbox"
                    type="text"
                    className="relative w-[90%] h-[70px] bg-white border border-[#b0b0b0] rounded-[4px] mt-[10px] text-left outline-none text-[#6e6e6e] bg-transparent px-[10px] py-0 font-light animate-[fadeIn_1s_ease-out]"
                    style={{ fontSize: '25px' }}
                    name="link"
                    placeholder="https://"
                    value={url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    disabled={isLoading}
                />
                
                {/* Submit Button */}
                <div className="flex justify-center mt-[30px]">
                    <button 
                        type="submit"
                        className="bg-[#467291] rounded-[4px] border border-[#5d5d5d] text-white px-[5px] py-0 pl-[15px] text-center no-underline inline-flex items-center justify-center transition-all duration-200 cursor-pointer w-[210px] h-[65px] hover:bg-white hover:text-[#467291] animate-[fadeInUp_1s_ease-out]"
                        style={{ 
                            fontFamily: 'var(--font-roboto-condensed)',
                            letterSpacing: '2pt',
                            fontSize: '22px'
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
                className={`${shortenedUrl || error ? 'block animate-[fadeIn_0.5s_ease-out]' : 'hidden'}`}
            >
                {/* Error Message - No copy button */}
                {error && !shortenedUrl && (
                    <p className="text-red-600 text-center mt-4 text-base">
                        {error}
                    </p>
                )}
                
                {/* Success Result - With copy button */}
                {shortenedUrl && !error && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCopy}
                                className={`h-10 w-10 hover:bg-transparent p-0 ml-[-12px] cursor-pointer transition-colors duration-200 ${
                                    copied 
                                        ? 'text-green-600 hover:text-green-700' 
                                        : 'text-[#467291] hover:text-[#5a8eb2]'
                                }`}
                                title={copied ? 'Copied!' : 'Copy to clipboard'}
                            >
                                <Copy style={{ width: '28px', height: '28px' }} />
                            </Button>
                            {/* Custom tooltip */}
                            {copied && (
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-3 py-1 rounded-md whitespace-nowrap animate-[fadeIn_0.2s_ease-out]">
                                    Link copied!
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            )}
                        </div>
                        <a 
                            href={shortenedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[28pt] font-semibold text-[#467291] hover:text-[#5a8eb2] no-underline"
                            style={{ fontFamily: 'var(--font-dosis)' }}
                        >
                            {displayUrl}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
