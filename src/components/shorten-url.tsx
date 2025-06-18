'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, Loader2, ArrowRight } from "lucide-react";
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
                setShortenedUrl(`https://${result}`);
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

    const handleVisit = () => {
        if (shortenedUrl) {
            window.open(shortenedUrl, '_blank');
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Main input form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="url"
                    placeholder="https://"
                    value={url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                    className="w-full h-12 px-4 text-base border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400"
                    disabled={isLoading}
                />
                <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-auto px-6 py-3 bg-[#467291] hover:bg-[#3d6280] text-white font-medium rounded-md flex items-center gap-2 mx-auto"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            LIGHTEN IT
                        </>
                    ) : (
                        <>
                            LIGHTEN IT
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>

            {/* Error handling */}
            {error && (
                <Alert variant="destructive" className="max-w-md mx-auto">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Result display */}
            {shortenedUrl && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 max-w-md mx-auto">
                    <p className="text-sm font-medium text-green-800 mb-2">
                        Your shortened URL:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-md border">
                        <code className="flex-1 text-sm font-mono text-green-700 break-all">
                            {shortenedUrl}
                        </code>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="flex items-center gap-1 shrink-0"
                        >
                            <Copy className="h-4 w-4" />
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleVisit}
                            className="flex items-center gap-1 shrink-0"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Visit
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
