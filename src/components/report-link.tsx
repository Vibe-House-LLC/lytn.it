'use client';

import { useState } from 'react';

interface ReportLinkProps {
  lytnUrl?: string; // The lytn.it shortened URL
  shortId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function ReportLink({ lytnUrl, shortId, onClose, onSuccess }: ReportLinkProps) {
  const [formData, setFormData] = useState({
    lytnUrl: lytnUrl || '',
    reason: '',
    reporterEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidShortenedUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      // Validate that it has a proper protocol, hostname, and path with an ID
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname.length > 0 &&
        parsed.pathname.length > 1 && // Must have more than just "/"
        parsed.pathname !== '/'
      );
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lytnUrl.trim()) {
      setError('lytn.it URL is required');
      return;
    }

    if (!isValidShortenedUrl(formData.lytnUrl)) {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://lytn.it';
      setError(`Please enter a valid shortened URL (e.g., ${currentOrigin}/abc123)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Extract shortId from lytnUrl if not provided
      let extractedShortId = shortId || '';
      if (!extractedShortId) {
        try {
          const url = new URL(formData.lytnUrl);
          extractedShortId = url.pathname.substring(1); // Remove leading slash
        } catch {
          // If URL parsing fails, continue without shortId
        }
      }

      // const result = await client.mutations.reportLink({
      //   lytnUrl: formData.lytnUrl,
      //   shortId: extractedShortId,
      //   reason: formData.reason || '',
      //   reporterEmail: formData.reporterEmail || '',
      // });

      const response = await fetch('/api/v2/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: formData.lytnUrl, 
          shortId: extractedShortId, 
          reason: formData.reason, 
          reporterEmail: formData.reporterEmail 
        }),
      });

      const result = await response.json();
      console.log('Report result:', result);
      
      if (response.ok && result && result.id) {
        // Successfully created report
        console.log('Report created with ID:', result.id);
        onSuccess?.();
      } else {
        // Handle different error cases
        if (result.error) {
          setError(result.error);
        } else if (!response.ok) {
          setError(`Failed to report link: ${response.status} ${response.statusText}`);
        } else {
          setError('Failed to report link - no report ID returned');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => onClose?.()}
    >
      <div 
        className="bg-background rounded-lg p-6 w-full max-w-md border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Report Link</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-2xl cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="lytnUrl" className="block text-sm font-medium text-foreground mb-1">
              Shortened URL to Report *
            </label>
            <input
              type="url"
              id="lytnUrl"
              value={formData.lytnUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, lytnUrl: e.target.value }))}
              className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground"
              placeholder={typeof window !== 'undefined' 
                ? `${window.location.origin}/abc123` 
                : 'https://lytn.it/abc123'}
              required
              disabled={!!lytnUrl} // Disable if URL is pre-filled
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the shortened URL you want to report
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">
              Reason for Report
            </label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground"
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="malware">Malware</option>
              <option value="phishing">Phishing</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="copyright_violation">Copyright Violation</option>
              <option value="fraud">Fraud</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="reporterEmail" className="block text-sm font-medium text-foreground mb-1">
              Your Email (optional)
            </label>
            <input
              type="email"
              id="reporterEmail"
              value={formData.reporterEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, reporterEmail: e.target.value }))}
              className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-input text-foreground"
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Providing your email allows us to follow up if needed
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-destructive text-white py-3 px-4 rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              {isSubmitting ? 'Reporting...' : 'Report Link'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-md hover:bg-secondary/80 cursor-pointer font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 