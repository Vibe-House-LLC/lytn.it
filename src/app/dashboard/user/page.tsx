'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const client = generateClient<Schema>({ authMode: 'userPool' });

interface UserLink {
  id: string;
  destination?: string | null;
  status?: string | null;
  createdAt?: string | null;
  deletedAt?: string | null;
  deletedReason?: string | null;
  reports?: UserReport[];
}

interface UserReport {
  id: string;
  lytnUrl?: string | null;
  shortId?: string | null;
  destinationUrl?: string | null;
  reason?: string | null;
  status?: string | null;
  createdAt?: string | null;
  adminNotes?: string | null;
}

// Copy icon component
const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

// Check icon component
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function UserDashboard() {
  const { user } = useAuthenticator();
  const [links, setLinks] = useState<UserLink[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'reports'>('links');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's shortened URLs
      // const { data: urls } = await client.models.shortenedUrl.list({
      //   filter: { owner: { eq: user.userId } },
      //   limit: 100,
      // });

      console.log(user);

      const { data: urls } = await client.models.ShortenedUrl.listShortenedUrlByOwnerAndCreatedAt({
        owner: `${user.userId}::${user.username}`
      });

      // Fetch reports for those URLs
      // const urlIds = urls.map((u) => u.id);
      const { data: linkReports } = await client.models.ReportedLink.listReportedLinkByOwnerAndCreatedAt({
        owner: `${user.userId}::${user.username}`
      });

      // Ensure all link IDs are strings and filter out any with null/undefined IDs
      const validLinks = urls
        .filter(link => typeof link.id === 'string' && link.id !== null)
        .map(link => ({
          ...link,
          id: String(link.id),
          reports: linkReports.filter(report => report.shortenedUrlId === link.id)
        }));

      setLinks(validLinks as UserLink[]);

      // Ensure all report IDs are strings and filter out any with null/undefined IDs
      const validReports = (linkReports ?? []).filter(
        (report: { id?: string | null }) => typeof report.id === 'string' && report.id !== null
      ).map((report: { id?: string | null }) => ({
        ...report,
        id: String(report.id)
      }));

      setReports(validReports as UserReport[]);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const copyToClipboard = async (linkId: string) => {
    const lytnUrl = `https://lytn.it/${linkId}`;
    
    try {
      // iOS Safari specific handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      // Try modern Clipboard API first - but be more careful with iOS
      if (navigator.clipboard && window.isSecureContext && !isIOS) {
        await navigator.clipboard.writeText(lytnUrl);
        setCopiedId(linkId);
        setCopySuccess(`Copied: ${lytnUrl}`);
      } else {
        // Save current scroll position to prevent viewport jumping
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Enhanced fallback that works better on iOS and Android
        const textArea = document.createElement('textarea');
        textArea.value = lytnUrl;
        
        // Better positioning that prevents scroll issues
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.width = '1px';
        textArea.style.height = '1px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.zIndex = '-1';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        
        // Prevent any layout shifts or focus behaviors
        textArea.setAttribute('readonly', '');
        textArea.setAttribute('tabindex', '-1');
        textArea.style.webkitUserSelect = 'text';
        textArea.style.userSelect = 'text';
        textArea.style.webkitAppearance = 'none';
        
        document.body.appendChild(textArea);
        
        let successful = false;
        
        // For iOS, we need to handle selection differently
        if (isIOS) {
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          textArea.setSelectionRange(0, 999999);
          
          // Try clipboard API again for iOS if available (newer iOS versions)
          if (navigator.clipboard && window.isSecureContext) {
            try {
              await navigator.clipboard.writeText(lytnUrl);
              successful = true;
            } catch {
              // Fall back to execCommand
              successful = document.execCommand('copy');
            }
          } else {
            successful = document.execCommand('copy');
          }
        } else {
          // For Android and other platforms, avoid focus() to prevent scroll jumping
          textArea.select();
          textArea.setSelectionRange(0, 99999);
          successful = document.execCommand('copy');
        }
        
        document.body.removeChild(textArea);
        
        // Restore scroll position to prevent viewport jumping
        if (isAndroid || (!isIOS && (currentScrollTop !== 0 || currentScrollLeft !== 0))) {
          window.scrollTo(currentScrollLeft, currentScrollTop);
        }
        
        if (successful) {
          setCopiedId(linkId);
          setCopySuccess(`Copied: ${lytnUrl}`);
        } else {
          throw new Error('Copy command failed');
        }
      }
      
      // Clear the feedback after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
        setCopySuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopySuccess('Failed to copy to clipboard. Please try selecting and copying the URL manually.');
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  const filteredLinks = links.filter(link => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      link.id.toLowerCase().includes(searchLower) ||
      link.destination?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReports = reports.filter(report => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      report.shortId?.toLowerCase().includes(searchLower) ||
      report.destinationUrl?.toLowerCase().includes(searchLower) ||
      report.reason?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string | null | undefined): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'reported': return 'bg-red-100 text-red-800';
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
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatReason = (reason: string | null | undefined): string => {
    if (!reason) return 'N/A';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">User Dashboard</h1>
          <p className="text-gray-600">Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pt-0 max-w-6xl"
         style={{
           WebkitOverflowScrolling: 'touch',
           touchAction: 'pan-y',
           WebkitTransform: 'translateZ(0)',
           transform: 'translateZ(0)'
         }}>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">My Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Welcome back, {user.signInDetails?.loginId || user.username}!
          </p>
        </div>

        {/* Copy Success Toast - iOS optimized positioning */}
        {copySuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg max-w-sm transform-gpu will-change-transform"
               style={{ 
                 WebkitTransform: 'translateZ(0)',
                 transform: 'translateZ(0)',
                 WebkitBackfaceVisibility: 'hidden',
                 backfaceVisibility: 'hidden'
               }}>
            <div className="flex items-center gap-2">
              <CheckIcon className="text-green-600" />
              <span className="text-sm font-medium break-all">{copySuccess}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{links.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Links</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {links.filter(l => l.status === 'active').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Active Links</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {links.filter(l => l.status === 'reported').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Reported Links</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-gray-600">
                {links.filter(l => l.deletedAt).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Deleted Links</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('links')}
                className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm sm:text-base flex-1 sm:flex-none touch-manipulation ${
                  activeTab === 'links'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ 
                  WebkitTouchCallout: 'none',
                  touchAction: 'manipulation'
                }}
              >
                My Links ({links.length})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm sm:text-base flex-1 sm:flex-none touch-manipulation ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ 
                  WebkitTouchCallout: 'none',
                  touchAction: 'manipulation'
                }}
              >
                Reports ({reports.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={`Search ${activeTab === 'links' ? 'your links' : 'reports'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
        </div>

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {filteredLinks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">
                    {searchTerm ? 'No links found matching your search.' : "You haven't created any links yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredLinks.map((link) => (
                <Card key={link.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg break-all">
                          <span className="text-blue-600">lytn.it/</span>{link.id}
                          {link.deletedAt && (
                            <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                              DELETED
                            </span>
                          )}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                          {link.status || 'N/A'}
                        </span>
                        {!link.deletedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(link.id)}
                            className="h-8 w-8 p-0 touch-manipulation"
                            style={{ 
                              WebkitTouchCallout: 'none',
                              WebkitUserSelect: 'none',
                              touchAction: 'manipulation'
                            }}
                            disabled={copiedId === link.id}
                          >
                            {copiedId === link.id ? (
                              <CheckIcon className="text-green-600" />
                            ) : (
                              <CopyIcon />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <span className="font-medium text-sm">Destination:</span>
                      <div className="text-sm text-gray-600 break-all mt-1">{link.destination}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Created:</span>
                        <div className="text-gray-600 text-xs sm:text-sm">{formatDate(link.createdAt)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Reports:</span>
                        <span className="ml-2 text-gray-600">{link.reports?.length || 0}</span>
                      </div>
                    </div>

                    {link.deletedAt && (
                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                        <div className="font-medium">Deleted: {formatDate(link.deletedAt)}</div>
                        <div>Reason: {link.deletedReason?.replace('_', ' ') || 'N/A'}</div>
                      </div>
                    )}

                    {link.reports && link.reports.length > 0 && (
                      <div className="text-sm bg-yellow-50 p-3 rounded">
                        <div className="font-medium text-yellow-800 mb-2">Recent Reports:</div>
                        {link.reports.slice(0, 3).map((report: UserReport) => (
                          <div key={report.id} className="text-yellow-700 mb-1 text-xs sm:text-sm">
                            • {formatReason(report.reason)} - {formatDate(report.createdAt)}
                          </div>
                        ))}
                        {link.reports.length > 3 && (
                          <div className="text-yellow-600 text-xs">
                            +{link.reports.length - 3} more reports
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">
                    {searchTerm ? 'No reports found matching your search.' : "No reports found for your links."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <CardTitle className="text-base sm:text-lg break-all">
                        Report for: {report.shortId || 'Unknown'}
                      </CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(report.status)}`}>
                        {report.status || 'pending'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium text-sm">Destination:</span>
                      <div className="text-sm text-gray-600 break-all mt-1">{report.destinationUrl}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Reason:</span>
                        <div className="text-gray-600 text-xs sm:text-sm">{formatReason(report.reason)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Reported:</span>
                        <div className="text-gray-600 text-xs sm:text-sm">{formatDate(report.createdAt)}</div>
                      </div>
                    </div>

                    {report.adminNotes && (
                      <div className="text-sm bg-blue-50 p-3 rounded">
                        <div className="font-medium text-blue-800 mb-2">Admin Notes:</div>
                        <div className="text-blue-700 whitespace-pre-wrap text-xs sm:text-sm">{report.adminNotes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
} 