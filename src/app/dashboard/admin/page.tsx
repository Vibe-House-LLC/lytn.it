'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const client = generateClient<Schema>({ authMode: 'userPool' });

// Define proper types based on the schema
type ReportedLinkStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
type ReportReason = 'spam' | 'malware' | 'phishing' | 'inappropriate_content' | 'copyright_violation' | 'fraud' | 'harassment' | 'other';

interface ReportedLink {
  id: string;
  lytnUrl?: string | null;
  shortId?: string | null;
  destinationUrl?: string | null;
  reason?: ReportReason | null;
  reporterEmail?: string | null;
  reporterIp?: string | null;
  status?: ReportedLinkStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  deletedReason?: 'spam' | 'inappropriate_content' | 'copyright_violation' | 'user_request' | 'admin_action' | 'resolved' | null;
  source?: 'user_reported' | 'admin_reported' | 'automated_scan' | 'external_api' | null;
  owner?: string | null;
}

interface LoadingStates {
  [key: string]: boolean;
}

interface Filters {
  status: ReportedLinkStatus | 'all';
  reason: ReportReason | 'all';
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface Statistics {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  todayCount: number;
}

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [allReportedLinks, setAllReportedLinks] = useState<ReportedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ReportedLink | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    reason: 'all',
    search: '',
    dateRange: 'all'
  });

  const fetchAllReportedLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allLinks: ReportedLink[] = [];
      let nextToken: string | undefined;
      
      do {
        const result = await client.models.reportedLink.list({
          limit: 100,
          nextToken,
        });
        
        if (result.data) {
          allLinks.push(...(result.data as ReportedLink[]));
          nextToken = result.nextToken || undefined;
        }
      } while (nextToken);
      
      setAllReportedLinks(allLinks);
    } catch (err) {
      console.error('Error fetching reported links:', err);
      setError('Failed to load reported links. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics
  const statistics = useMemo((): Statistics => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: allReportedLinks.length,
      pending: allReportedLinks.filter(link => link.status === 'pending' || !link.status).length,
      reviewed: allReportedLinks.filter(link => link.status === 'reviewed').length,
      resolved: allReportedLinks.filter(link => link.status === 'resolved').length,
      dismissed: allReportedLinks.filter(link => link.status === 'dismissed').length,
      todayCount: allReportedLinks.filter(link => {
        if (!link.createdAt) return false;
        const linkDate = new Date(link.createdAt);
        return linkDate >= today;
      }).length
    };
  }, [allReportedLinks]);

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = [...allReportedLinks];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(link => (link.status || 'pending') === filters.status);
    }

    if (filters.reason !== 'all') {
      filtered = filtered.filter(link => link.reason === filters.reason);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(link => 
        link.shortId?.toLowerCase().includes(searchLower) ||
        link.destinationUrl?.toLowerCase().includes(searchLower) ||
        link.reporterEmail?.toLowerCase().includes(searchLower) ||
        link.lytnUrl?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      };
      
      const cutoffDate = ranges[filters.dateRange];
      filtered = filtered.filter(link => {
        if (!link.createdAt) return false;
        return new Date(link.createdAt) >= cutoffDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
        case 'createdAt':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        case 'updatedAt':
          aValue = a.updatedAt || '';
          bValue = b.updatedAt || '';
          break;
        case 'status':
          aValue = a.status || 'pending';
          bValue = b.status || 'pending';
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [allReportedLinks, filters, sortBy, sortOrder]);

  // Paginate results
  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedLinks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedLinks, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedLinks.length / PAGE_SIZE);

  const updateStatus = useCallback(async (id: string, newStatus: ReportedLinkStatus) => {
    const validStatuses: ReportedLinkStatus[] = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(newStatus)) {
      setError('Invalid status value');
      return;
    }

    setLoadingStates(prev => ({ ...prev, [`${id}-${newStatus}`]: true }));
    
    try {
      await client.models.reportedLink.update({
        id,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      
      // Update local state
      setAllReportedLinks(prev =>
        prev.map(link =>
          link.id === id 
            ? { ...link, status: newStatus, updatedAt: new Date().toISOString() } 
            : link
        )
      );
      
      // Update selected report if it's the one being updated
      if (selectedReport?.id === id) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[`${id}-${newStatus}`];
        return newState;
      });
    }
  }, [selectedReport]);

  const resetFilters = () => {
    setFilters({
      status: 'all',
      reason: 'all',
      search: '',
      dateRange: 'all'
    });
    setCurrentPage(1);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const openDetailModal = (report: ReportedLink) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    if (user) {
      fetchAllReportedLinks();
    }
  }, [user, fetchAllReportedLinks]);

  const getStatusColor = (status: string | null | undefined): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string | null | undefined): string => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
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

  const formatReason = (reason: string | null | undefined): string => {
    if (!reason) return 'N/A';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{statistics.reviewed}</div>
            <div className="text-sm text-gray-600">Reviewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{statistics.resolved}</div>
            <div className="text-sm text-gray-600">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{statistics.dismissed}</div>
            <div className="text-sm text-gray-600">Dismissed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{statistics.todayCount}</div>
            <div className="text-sm text-gray-600">Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{statistics.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.status === 'all' ? 'All Statuses' : getStatusDisplayName(filters.status)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'reviewed' }))}>
                    Reviewed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'resolved' }))}>
                    Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'dismissed' }))}>
                    Dismissed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reason Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.reason === 'all' ? 'All Reasons' : formatReason(filters.reason)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Reason</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, reason: 'all' }))}>
                    All Reasons
                  </DropdownMenuItem>
                  {(['spam', 'malware', 'phishing', 'inappropriate_content', 'copyright_violation', 'fraud', 'harassment', 'other'] as const).map(reason => (
                    <DropdownMenuItem key={reason} onClick={() => setFilters(prev => ({ ...prev, reason }))}>
                      {formatReason(reason)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.dateRange === 'all' ? 'All Time' : filters.dateRange.charAt(0).toUpperCase() + filters.dateRange.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}>
                    All Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateRange: 'today' }))}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateRange: 'week' }))}>
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateRange: 'month' }))}>
                    This Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search links, emails, URLs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button onClick={resetFilters} variant="outline" size="sm">
              Reset Filters
            </Button>
            <div className="text-sm text-gray-600 flex items-center ml-auto">
              Showing {paginatedLinks.length} of {filteredAndSortedLinks.length} results
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && allReportedLinks.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading reported links...</p>
            </div>
          ) : filteredAndSortedLinks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No reported links found with current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        Created
                        {sortBy === 'createdAt' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium">Short URL</th>
                    <th className="text-left p-4 font-medium">Destination</th>
                    <th className="text-left p-4 font-medium">Reason</th>
                    <th className="text-left p-4 font-medium">Reporter</th>
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        Status
                        {sortBy === 'status' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(link.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{link.shortId || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{link.lytnUrl || 'N/A'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm max-w-xs truncate" title={link.destinationUrl || 'N/A'}>
                          {link.destinationUrl || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {formatReason(link.reason)}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{link.reporterEmail || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{link.reporterIp || 'N/A'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                          {getStatusDisplayName(link.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailModal(link)}
                          >
                            View Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                Change Status
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(['pending', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => {
                                const isCurrentStatus = (link.status || 'pending') === status;
                                const isLoading = loadingStates[`${link.id}-${status}`];
                                
                                return (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => !isCurrentStatus && !isLoading && updateStatus(link.id, status)}
                                    disabled={isCurrentStatus || isLoading}
                                    className={isCurrentStatus ? 'bg-gray-100' : ''}
                                  >
                                    {isLoading ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Updating...</span>
                                      </div>
                                    ) : (
                                      <span>
                                        {isCurrentStatus ? '✓ ' : ''}
                                        Mark as {getStatusDisplayName(status)}
                                      </span>
                                    )}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Report Details</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-700">Link Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Short ID:</span>
                      <span className="ml-2">{selectedReport.shortId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Short URL:</span>
                      <span className="ml-2 break-all">{selectedReport.lytnUrl || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Destination URL:</span>
                      <span className="ml-2 break-all">{selectedReport.destinationUrl || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Owner:</span>
                      <span className="ml-2">{selectedReport.owner || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-gray-700">Report Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Reason:</span>
                      <span className="ml-2">{formatReason(selectedReport.reason)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Source:</span>
                      <span className="ml-2">{selectedReport.source?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Reporter Email:</span>
                      <span className="ml-2">{selectedReport.reporterEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Reporter IP:</span>
                      <span className="ml-2">{selectedReport.reporterIp || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-700">Status & Dates</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedReport.status)}`}>
                        {getStatusDisplayName(selectedReport.status)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">{formatDate(selectedReport.createdAt)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>
                      <span className="ml-2">{formatDate(selectedReport.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-gray-700">Deletion Info</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Deleted At:</span>
                      <span className="ml-2">{formatDate(selectedReport.deletedAt)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Deletion Reason:</span>
                      <span className="ml-2">{selectedReport.deletedReason?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Report ID: {selectedReport.id}
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(['pending', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => {
                        const isCurrentStatus = (selectedReport.status || 'pending') === status;
                        const isLoading = loadingStates[`${selectedReport.id}-${status}`];
                        
                        return (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => !isCurrentStatus && !isLoading && updateStatus(selectedReport.id, status)}
                            disabled={isCurrentStatus || isLoading}
                            className={isCurrentStatus ? 'bg-gray-100' : ''}
                          >
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <span>
                                {isCurrentStatus ? '✓ ' : ''}
                                Mark as {getStatusDisplayName(status)}
                              </span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" onClick={closeDetailModal}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 