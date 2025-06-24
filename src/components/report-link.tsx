'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

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

  const isLytnUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      // Allow lytn.it domains and localhost for development
      return parsed.hostname === 'lytn.it' || 
             parsed.hostname.endsWith('.lytn.it') ||
             parsed.hostname === 'localhost' ||
             parsed.hostname === '127.0.0.1';
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

    if (!isLytnUrl(formData.lytnUrl)) {
      setError('Please enter a valid shortened URL (e.g., https://lytn.it/abc123 or http://localhost:3000/abc123)');
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

      const result = await client.mutations.reportLink({
        lytnUrl: formData.lytnUrl,
        shortId: extractedShortId,
        reason: formData.reason || '',
        reporterEmail: formData.reporterEmail || '',
      });

      console.log('Report result:', result);
      
      // Parse the response if it's a JSON string
      let parsedResponse;
      if (typeof result.data === 'string') {
        try {
          parsedResponse = JSON.parse(result.data);
        } catch {
          parsedResponse = null;
        }
      } else {
        parsedResponse = result.data;
      }
      
      if (parsedResponse && typeof parsedResponse === 'object' && 'success' in parsedResponse && parsedResponse.success) {
        onSuccess?.();
      } else {
        const errorMessage = parsedResponse && typeof parsedResponse === 'object' && 'message' in parsedResponse 
          ? String(parsedResponse.message) 
          : `Failed to report link. Response: ${JSON.stringify(result.data)}`;
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Report Link</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="lytnUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Shortened URL to Report *
            </label>
            <input
              type="url"
              id="lytnUrl"
              value={formData.lytnUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, lytnUrl: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                ? `${window.location.origin}/abc123` 
                : 'https://lytn.it/abc123'}
              required
              disabled={!!lytnUrl} // Disable if URL is pre-filled
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the shortened URL you want to report
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Report
            </label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="malware">Malware/Phishing</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="copyright">Copyright Violation</option>
              <option value="abuse">Abuse/Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="reporterEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Your Email (optional)
            </label>
            <input
              type="email"
              id="reporterEmail"
              value={formData.reporterEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, reporterEmail: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
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
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              {isSubmitting ? 'Reporting...' : 'Report Link'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 cursor-pointer font-medium"
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