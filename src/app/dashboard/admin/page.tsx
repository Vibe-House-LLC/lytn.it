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
import UserManagement from '@/components/admin/user-management';
import LinkImporter from '@/components/admin/link-importer';

const client = generateClient<Schema>({ authMode: 'userPool' });

// Define proper types based on the schema
type ReportedLinkStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
type ReportReason = 'spam' | 'malware' | 'phishing' | 'inappropriate_content' | 'copyright_violation' | 'fraud' | 'harassment' | 'other';
type AdminActionType = 'status_change' | 'soft_delete' | 'restore' | 'add_note' | 'update_fields';

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
  lastAdminAction?: AdminActionType | null;
  lastAdminEmail?: string | null;
  adminNotes?: string | null;
  shortenedUrlId?: string | null; // Added for relationship
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

interface ActionModal {
  isOpen: boolean;
  report: ReportedLink | null;
  actionType: 'status_change' | 'soft_delete' | 'restore' | 'add_note';
  newStatus?: ReportedLinkStatus;
}

interface AdminLog {
  id: string;
  reportedLinkId?: string | null;
  actionType?: AdminActionType | null;
  adminEmail?: string | null;
  adminUserId?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'import'>('reports');
  const [allReportedLinks, setAllReportedLinks] = useState<ReportedLink[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ReportedLink | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>({ isOpen: false, report: null, actionType: 'add_note' });
  const [actionNotes, setActionNotes] = useState('');
  
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
      const result = await client.models.ReportedLink.list({
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

  const fetchAdminLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const result = await client.models.AdminActionLog.list({
        limit: 50,
        authMode: 'userPool',
      });
      
      if (result.data) {
        setAdminLogs(result.data as AdminLog[]);
      }
    } catch (err) {
      console.error('Error fetching admin logs:', err);
    } finally {
      setLogsLoading(false);
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

  const openActionModal = (report: ReportedLink, actionType: ActionModal['actionType'], newStatus?: ReportedLinkStatus) => {
    setActionModal({ isOpen: true, report, actionType, newStatus });
    setActionNotes('');
  };

  const closeActionModal = () => {
    setActionModal({ isOpen: false, report: null, actionType: 'add_note' });
    setActionNotes('');
  };

  const handleActionSubmit = useCallback(async () => {
    if (!actionModal.report) return;

    const report = actionModal.report;
    setLoadingStates(prev => ({ ...prev, [`${report.id}-${actionModal.actionType}`]: true }));

    try {
      const updateData: Partial<ReportedLink> = {};

      if (actionModal.actionType === 'status_change') {
        if (!actionModal.newStatus) return;
        updateData.status = actionModal.newStatus;
      } else if (actionModal.actionType === 'soft_delete') {
        updateData.deletedAt = new Date().toISOString();
        updateData.deletedReason = 'admin_action';
        
        // Update the underlying ShortenedUrl status to inactive
        if (report.shortenedUrlId) {
          try {
            await client.models.ShortenedUrl.update({
              id: report.shortenedUrlId,
              status: 'inactive'
            });
            console.log('Updated ShortenedUrl status to inactive for:', report.shortenedUrlId);
            
            // 🔧 FIX: Update ALL ReportedLink records for this shortened URL
            const relatedReports = await client.models.ReportedLink.list({
              filter: { shortenedUrlId: { eq: report.shortenedUrlId } }
            });
            
            if (relatedReports.data) {
              const updatePromises = relatedReports.data.map(relatedReport => 
                client.models.ReportedLink.update({
                  id: relatedReport.id,
                  deletedAt: updateData.deletedAt,
                  deletedReason: updateData.deletedReason,
                  updatedAt: new Date().toISOString(),
                })
              );
              
              await Promise.all(updatePromises);
              console.log(`Updated ${relatedReports.data.length} related reports for soft delete`);
            }
          } catch (urlError) {
            console.error('Failed to update ShortenedUrl status or related reports:', urlError);
            throw new Error('Failed to deactivate the shortened URL and related reports');
          }
        }
      } else if (actionModal.actionType === 'restore') {
        updateData.deletedAt = null;
        updateData.deletedReason = null;
        
        // Update the underlying ShortenedUrl status to active
        if (report.shortenedUrlId) {
          try {
            await client.models.ShortenedUrl.update({
              id: report.shortenedUrlId,
              status: 'active'
            });
            console.log('Updated ShortenedUrl status to active for:', report.shortenedUrlId);
            
            // 🔧 FIX: Update ALL ReportedLink records for this shortened URL
            const relatedReports = await client.models.ReportedLink.list({
              filter: { shortenedUrlId: { eq: report.shortenedUrlId } }
            });
            
            if (relatedReports.data) {
              const updatePromises = relatedReports.data.map(relatedReport => 
                client.models.ReportedLink.update({
                  id: relatedReport.id,
                  deletedAt: null,
                  deletedReason: null,
                  updatedAt: new Date().toISOString(),
                })
              );
              
              await Promise.all(updatePromises);
              console.log(`Updated ${relatedReports.data.length} related reports for restore`);
            }
          } catch (urlError) {
            console.error('Failed to update ShortenedUrl status or related reports:', urlError);
            throw new Error('Failed to reactivate the shortened URL and related reports');
          }
        }
      } else if (actionModal.actionType === 'add_note') {
        if (!actionNotes.trim()) return;
        updateData.adminNotes = actionNotes.trim();
        
        // For add_note, only update the specific report
        await client.models.ReportedLink.update({
          id: report.id,
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      }

      // For status_change, only update the specific report
      if (actionModal.actionType === 'status_change') {
        if (Object.keys(updateData).length === 0) return;
        
        await client.models.ReportedLink.update({
          id: report.id,
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      }

      // Log the admin action
      if (user?.signInDetails?.loginId) {
        await client.models.AdminActionLog.create({
          reportedLinkId: report.id,
          actionType: actionModal.actionType,
          adminEmail: user.signInDetails.loginId,
          adminUserId: user.userId,
          notes: actionNotes || '',
          createdAt: new Date().toISOString(),
        });
      }

      // 🔧 FIX: Update local state for ALL related reports when soft deleting/restoring
      if (actionModal.actionType === 'soft_delete' || actionModal.actionType === 'restore') {
        setAllReportedLinks(prev =>
          prev.map(link => {
            // Update all reports that share the same shortenedUrlId
            if (link.shortenedUrlId === report.shortenedUrlId) {
              return {
                ...link,
                deletedAt: updateData.deletedAt,
                deletedReason: updateData.deletedReason,
                updatedAt: new Date().toISOString()
              };
            }
            return link;
          })
        );

        // Update selected report if it's related to the same shortened URL
        if (selectedReport?.shortenedUrlId === report.shortenedUrlId) {
          setSelectedReport(prev => prev ? {
            ...prev,
            deletedAt: updateData.deletedAt,
            deletedReason: updateData.deletedReason,
            updatedAt: new Date().toISOString()
          } : null);
        }
      } else {
        // For other actions, only update the specific report
        setAllReportedLinks(prev =>
          prev.map(link =>
            link.id === report.id
              ? { ...link, ...updateData, updatedAt: new Date().toISOString() }
              : link
          )
        );

        // Update selected report if it's the one being updated
        if (selectedReport?.id === report.id) {
          setSelectedReport(prev => prev ? { ...prev, ...updateData, updatedAt: new Date().toISOString() } : null);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Failed to perform action. Please try again.');
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[`${report.id}-${actionModal.actionType}`];
        return newState;
      });
      closeActionModal();
    }
  }, [actionModal, actionNotes, selectedReport, user]);

  const isLinkDeleted = (link: ReportedLink): boolean => {
    return link.deletedAt !== null && link.deletedReason !== null;
  };

  useEffect(() => {
    if (user) {
      fetchAllReportedLinks();
      fetchAdminLogs();
    }
  }, [user, fetchAllReportedLinks, fetchAdminLogs]);

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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage reported links and review user reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reported Links
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Import Links
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' ? (
        <>
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

      {/* Admin Action Logs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading admin logs...</p>
            </div>
          ) : adminLogs.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No admin actions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {adminLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {log.actionType?.replace('_', ' ').toUpperCase()} by {log.adminEmail}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {formatDate(log.createdAt)} • Report ID: {log.reportedLinkId?.substring(0, 8)}...
                      </div>
                      {log.notes && (
                        <div className="text-sm text-gray-700 mt-2 bg-white p-2 rounded">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {adminLogs.length > 5 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  +{adminLogs.length - 5} more actions
                </div>
              )}
            </div>
          )}
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
                    <tr key={link.id} className={`hover:bg-gray-50 ${isLinkDeleted(link) ? 'bg-red-50' : ''}`}>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(link.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {link.shortId || 'N/A'}
                          {isLinkDeleted(link) && (
                            <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                              DELETED
                            </span>
                          )}
                        </div>
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
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {/* Status Changes */}
                              <DropdownMenuItem onClick={() => openActionModal(link, 'status_change', 'pending')}>
                                Mark as Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionModal(link, 'status_change', 'reviewed')}>
                                Mark as Reviewed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionModal(link, 'status_change', 'resolved')}>
                                Mark as Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionModal(link, 'status_change', 'dismissed')}>
                                Mark as Dismissed
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {/* Link Management */}
                              {isLinkDeleted(link) ? (
                                <DropdownMenuItem onClick={() => openActionModal(link, 'restore')}>
                                  Restore Link
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => openActionModal(link, 'soft_delete')}>
                                  Soft Delete Link
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              {/* Notes */}
                              <DropdownMenuItem onClick={() => openActionModal(link, 'add_note')}>
                                Add Note
                              </DropdownMenuItem>
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

      {/* Action Modal */}
      {actionModal.isOpen && actionModal.report && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {actionModal.actionType === 'status_change' && `Change Status to ${getStatusDisplayName(actionModal.newStatus)}`}
                {actionModal.actionType === 'soft_delete' && 'Soft Delete Link'}
                {actionModal.actionType === 'restore' && 'Restore Link'}
                {actionModal.actionType === 'add_note' && 'Add Admin Note'}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Link:</strong> {actionModal.report.shortId || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Destination:</strong> {actionModal.report.destinationUrl || 'N/A'}
                </p>
                
                <label className="block text-sm font-medium mb-2">
                  {actionModal.actionType === 'add_note' ? 'Note' : 'Reason/Notes'} {actionModal.actionType === 'add_note' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={3}
                  placeholder={
                    actionModal.actionType === 'add_note' 
                      ? 'Enter your note...' 
                      : 'Enter reason for this action...'
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeActionModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleActionSubmit}
                  disabled={actionModal.actionType === 'add_note' && !actionNotes.trim()}
                >
                  {actionModal.actionType === 'status_change' && 'Update Status'}
                  {actionModal.actionType === 'soft_delete' && 'Delete Link'}
                  {actionModal.actionType === 'restore' && 'Restore Link'}
                  {actionModal.actionType === 'add_note' && 'Add Note'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    {isLinkDeleted(selectedReport) && (
                      <div className="text-red-600 font-medium">
                        <span className="font-medium">⚠️ DELETED:</span>
                        <span className="ml-2">{formatDate(selectedReport.deletedAt)}</span>
                      </div>
                    )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <h3 className="font-semibold mb-2 text-gray-700">Admin Actions</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Last Action:</span>
                      <span className="ml-2">{selectedReport.lastAdminAction || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Admin User:</span>
                      <span className="ml-2">{selectedReport.lastAdminEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedReport.adminNotes && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-gray-700">Admin Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{selectedReport.adminNotes}</pre>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Report ID: {selectedReport.id}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      closeDetailModal();
                      openActionModal(selectedReport, 'add_note');
                    }}
                    variant="outline"
                  >
                    Add Note
                  </Button>
                  <Button variant="outline" onClick={closeDetailModal}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      ) : activeTab === 'users' ? (
        <UserManagement />
      ) : (
        <LinkImporter />
      )}
    </div>
  );
} 