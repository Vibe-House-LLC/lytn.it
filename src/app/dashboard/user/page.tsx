'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export default function UserDashboard() {
  const { user } = useAuthenticator();
  const [links, setLinks] = useState<UserLink[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'reports'>('links');

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
          <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.signInDetails?.loginId || user.username}!</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{links.length}</div>
            <div className="text-sm text-gray-600">Total Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {links.filter(l => l.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {links.filter(l => l.status === 'reported').length}
            </div>
            <div className="text-sm text-gray-600">Reported Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {links.filter(l => l.deletedAt).length}
            </div>
            <div className="text-sm text-gray-600">Deleted Links</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('links')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'links'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Links ({links.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
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
          className="max-w-md"
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
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {link.id}
                      {link.deletedAt && (
                        <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                          DELETED
                        </span>
                      )}
                    </CardTitle>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                      {link.status || 'N/A'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium text-sm">Destination:</span>
                    <div className="text-sm text-gray-600 break-all">{link.destination}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2 text-gray-600">{formatDate(link.createdAt)}</span>
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
                        <div key={report.id} className="text-yellow-700 mb-1">
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
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      Report for: {report.shortId || 'Unknown'}
                    </CardTitle>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status || 'pending'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium text-sm">Destination:</span>
                    <div className="text-sm text-gray-600 break-all">{report.destinationUrl}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Reason:</span>
                      <span className="ml-2 text-gray-600">{formatReason(report.reason)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Reported:</span>
                      <span className="ml-2 text-gray-600">{formatDate(report.createdAt)}</span>
                    </div>
                  </div>

                  {report.adminNotes && (
                    <div className="text-sm bg-blue-50 p-3 rounded">
                      <div className="font-medium text-blue-800 mb-2">Admin Notes:</div>
                      <div className="text-blue-700 whitespace-pre-wrap">{report.adminNotes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
} 