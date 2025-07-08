'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const client = generateClient<Schema>({ authMode: 'userPool' });

// Define proper types based on the schema
type ReportedLinkStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

interface ReportedLink {
  id: string;
  lytnUrl?: string | null;
  shortId?: string | null;
  destinationUrl?: string | null;
  reason?: 'spam' | 'malware' | 'phishing' | 'inappropriate_content' | 'copyright_violation' | 'fraud' | 'harassment' | 'other' | null;
  reporterEmail?: string | null;
  reporterIp?: string | null;
  status?: ReportedLinkStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // NEW FIELDS FROM UPDATED SCHEMA
  deletedAt?: string | null;
  deletedReason?: 'spam' | 'inappropriate_content' | 'copyright_violation' | 'user_request' | 'admin_action' | 'resolved' | null;
  source?: 'user_reported' | 'admin_reported' | 'automated_scan' | 'external_api' | null;
  owner?: string | null;
}

interface LoadingStates {
  [key: string]: boolean;
}

const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [reportedLinks, setReportedLinks] = useState<ReportedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});

  const fetchReportedLinks = useCallback(async (token?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await client.models.reportedLink.list({
        limit: PAGE_SIZE,
        nextToken: token,
      });
      
      if (result.data) {
        const typedData = result.data as ReportedLink[];
        
        if (token) {
          setReportedLinks(prev => [...prev, ...typedData]);
        } else {
          setReportedLinks(typedData);
        }
        setNextToken(result.nextToken || undefined);
        setHasMore(!!result.nextToken);
      }
    } catch (err) {
      console.error('Error fetching reported links:', err);
      setError('Failed to load reported links. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, newStatus: ReportedLinkStatus) => {
    // Validate status
    const validStatuses: ReportedLinkStatus[] = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(newStatus)) {
      setError('Invalid status value');
      return;
    }

    // Set loading state for this specific button
    setLoadingStates(prev => ({ ...prev, [`${id}-${newStatus}`]: true }));
    
    try {
      await client.models.reportedLink.update({
        id,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      
      // Optimistic update
      setReportedLinks(prev =>
        prev.map(link =>
          link.id === id 
            ? { ...link, status: newStatus, updatedAt: new Date().toISOString() } 
            : link
        )
      );
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      // Clear loading state for this specific button
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[`${id}-${newStatus}`];
        return newState;
      });
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchReportedLinks();
    }
  }, [user, fetchReportedLinks]);

  const getStatusColor = (status: string | null | undefined): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // TODO: Add proper admin role verification
  // For now, all authenticated users are treated as admins
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-gray-600">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage reported links and review user reports</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading && reportedLinks.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reported links...</p>
          </div>
        ) : reportedLinks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">No reported links found.</p>
            </CardContent>
          </Card>
        ) : (
          reportedLinks.map((link) => (
            <Card key={link.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      Report for: {link.shortId || 'Unknown ID'}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Short URL:</strong> {link.lytnUrl || 'N/A'}</p>
                      <p><strong>Destination:</strong> {link.destinationUrl || 'N/A'}</p>
                      <p><strong>Reason:</strong> {link.reason || 'N/A'}</p>
                      <p><strong>Reporter Email:</strong> {link.reporterEmail || 'N/A'}</p>
                      <p><strong>Reporter IP:</strong> {link.reporterIp || 'N/A'}</p>
                      <p><strong>Reported:</strong> {formatDate(link.createdAt)}</p>
                      <p><strong>Updated:</strong> {formatDate(link.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                      {link.status || 'pending'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => {
                    const isCurrentStatus = link.status === status;
                    const isLoading = loadingStates[`${link.id}-${status}`];
                    
                    return (
                      <Button
                        key={status}
                        size="sm"
                        variant={isCurrentStatus ? 'default' : 'outline'}
                        onClick={() => updateStatus(link.id, status)}
                        disabled={isLoading || isCurrentStatus}
                        className="min-w-24"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                            <span className="sr-only">Loading...</span>
                          </div>
                        ) : (
                          `Mark ${status.charAt(0).toUpperCase() + status.slice(1)}`
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <Button
            onClick={() => fetchReportedLinks(nextToken)}
            disabled={loading}
            variant="outline"
            className="min-w-32"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 