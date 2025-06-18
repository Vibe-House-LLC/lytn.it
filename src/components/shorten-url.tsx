'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
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
        <div className="w-full max-w-2xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        Lytn.it URL Shortener
                    </CardTitle>
                    <CardDescription className="text-center">
                        Shorten your long URLs into compact, shareable links
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                type="url"
                                placeholder="Enter your URL here..."
                                value={url}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="min-w-[100px]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Shortening...
                                    </>
                                ) : (
                                    'Shorten'
                                )}
                            </Button>
                        </div>
                    </form>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {shortenedUrl && (
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-green-800">
                                        Your shortened URL:
                                    </p>
                                    <div className="flex items-center gap-2 p-3 bg-white rounded-md border">
                                        <code className="flex-1 text-sm font-mono text-green-700">
                                            {shortenedUrl}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="flex items-center gap-1"
                                        >
                                            <Copy className="h-4 w-4" />
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleVisit}
                                            className="flex items-center gap-1"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Visit
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
