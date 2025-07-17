'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface UserAttribute {
  Name: string;
  Value: string;
}

interface Group {
  groupName: string;
}

interface ResetPasswordData {
  password: string;
  temporary: boolean;
}

interface UserDetailsResponse {
  data: {
    user: User;
    groups: Group[];
    profile: UserProfile;
  };
}

interface User {
  username: string;
  email: string;
  emailVerified: boolean;
  status: string;
  enabled: boolean;
  createdDate: string;
  lastModifiedDate: string;
  attributes?: UserAttribute[];
}

interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: string;
  linksCreated: number;
  reportsSubmitted: number;
}

interface UserWithProfile extends User {
  groups: string[];
  profile?: UserProfile;
}

interface CreateUserModal {
  isOpen: boolean;
  email: string;
  password: string;
  displayName: string;
  temporary: boolean;
}

interface ResetPasswordModal {
  isOpen: boolean;
  user: UserWithProfile | null;
  password: string;
  temporary: boolean;
}

const PAGE_SIZE = 20;

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  
  const [createModal, setCreateModal] = useState<CreateUserModal>({
    isOpen: false,
    email: '',
    password: '',
    displayName: '',
    temporary: true,
  });

  const [resetPasswordModal, setResetPasswordModal] = useState<ResetPasswordModal>({
    isOpen: false,
    user: null,
    password: '',
    temporary: true,
  });

  const fetchUsers = useCallback(async (reset = false) => {
    try {
      console.log('[UserManagement] Starting fetchUsers, reset:', reset);
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
      });

      if (!reset && nextToken) {
        params.append('nextToken', nextToken);
        console.log('[UserManagement] Using nextToken:', nextToken);
      }

      if (searchTerm) {
        params.append('filter', `email ^= "${searchTerm}"`);
        console.log('[UserManagement] Using filter:', searchTerm);
      }

      // Use real endpoint now that Lambda is deployed
      const url = `/api/admin/users?${params}`;
      console.log('[UserManagement] Fetching from URL:', url);

      const response = await fetch(url);
      console.log('[UserManagement] Response status:', response.status);
      console.log('[UserManagement] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[UserManagement] Response data:', data);

      if (!response.ok) {
        console.error('[UserManagement] API error:', data);
        throw new Error(data.error || `HTTP ${response.status}: Failed to fetch users`);
      }

      if (!data || !data.data) {
        console.error('[UserManagement] Invalid response structure:', data);
        throw new Error('Invalid response format from server');
      }

      const users = data.data.users || [];
      console.log('[UserManagement] Fetched users count:', users.length);

      if (reset) {
        setUsers(users);
        setCurrentPage(1);
        console.log('[UserManagement] Reset users list');
      } else {
        setUsers(prev => {
          const newUsers = [...prev, ...users];
          console.log('[UserManagement] Appended users, total:', newUsers.length);
          return newUsers;
        });
      }

      setNextToken(data.nextToken);
      console.log('[UserManagement] Set nextToken:', data.nextToken);

    } catch (err) {
      console.error('[UserManagement] Error fetching users:', err);
      console.error('[UserManagement] Error stack:', err instanceof Error ? err.stack : 'No stack');
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      console.log('[UserManagement] fetchUsers completed');
    }
  }, [nextToken, searchTerm]);

  const fetchUserDetails = async (userId: string): Promise<UserWithProfile | null> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json() as UserDetailsResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user details');
      }

      return {
        ...data.data.user,
        groups: data.data.groups.map((g: Group) => g.groupName),
        profile: data.data.profile,
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  };

  const handleUserAction = async (userId: string, action: string, additionalData?: ResetPasswordData) => {
    setLoadingStates(prev => ({ ...prev, [`${userId}-${action}`]: true }));

    try {
      let response;
      
      switch (action) {
        case 'enable':
        case 'disable':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: action === 'enable' }),
          });
          break;
        
        case 'delete':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });
          break;
        
        case 'reset-password':
          response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(additionalData),
          });
          break;
        
        default:
          throw new Error('Invalid action');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      // Refresh user list
      if (action === 'delete') {
        setUsers(prev => prev.filter(user => user.username !== userId));
      } else {
        // Refresh the specific user's data
        const updatedUser = await fetchUserDetails(userId);
        if (updatedUser) {
          setUsers(prev => prev.map(user => 
            user.username === userId ? updatedUser : user
          ));
        }
      }

      setError(null);
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[`${userId}-${action}`];
        return newState;
      });
    }
  };

  const handleCreateUser = async () => {
    if (!createModal.email) {
      setError('Email is required');
      return;
    }

    setLoadingStates(prev => ({ ...prev, 'create-user': true }));

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createModal.email,
          password: createModal.password || undefined,
          temporary: createModal.temporary,
          attributes: createModal.displayName ? { name: createModal.displayName } : {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Reset form and close modal
      setCreateModal({
        isOpen: false,
        email: '',
        password: '',
        displayName: '',
        temporary: true,
      });

      // Refresh user list
      await fetchUsers(true);
      setError(null);

    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState['create-user'];
        return newState;
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal.user || !resetPasswordModal.password) {
      setError('Password is required');
      return;
    }

    await handleUserAction(
      resetPasswordModal.user.username, 
      'reset-password',
      {
        password: resetPasswordModal.password,
        temporary: resetPasswordModal.temporary,
      }
    );

    setResetPasswordModal({
      isOpen: false,
      user: null,
      password: '',
      temporary: true,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'enabled' && user.enabled) ||
      (statusFilter === 'disabled' && !user.enabled);

    return matchesSearch && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(0, currentPage * PAGE_SIZE);

  const loadMore = () => {
    if (paginatedUsers.length < filteredUsers.length) {
      setCurrentPage(prev => prev + 1);
    } else if (nextToken) {
      fetchUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, [searchTerm, fetchUsers]);

  const formatDate = (dateString: string): string => {
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

  const getStatusColor = (enabled: boolean, status: string): string => {
    if (!enabled) return 'bg-red-100 text-red-800';
    if (status === 'CONFIRMED') return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (enabled: boolean, status: string): string => {
    if (!enabled) return 'Disabled';
    return status || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              console.log('[CHECK-USER] Checking user status...');
              try {
                const response = await fetch('/api/admin/check-user');
                const data = await response.json();
                console.log('[CHECK-USER] User status:', data);
                
                if (data.needsAdminGroup) {
                  alert(`You need to be added to the 'admins' group!\n\nRun this command:\n${data.instructions.addToGroupCommand}`);
                } else if (data.user?.isAdmin) {
                  alert('✅ You are properly set up as an admin!');
                } else {
                  alert('❌ You are not logged in or there was an error. Check console.');
                }
              } catch (err) {
                console.error('[CHECK-USER] User check failed:', err);
                alert('User check failed. Check console.');
              }
            }}
            variant="outline"
            size="sm"
          >
            Check Admin Status
          </Button>
          <Button 
            onClick={async () => {
              console.log('[DEBUG] Testing debug endpoint...');
              try {
                const response = await fetch('/api/admin/debug');
                const data = await response.json();
                console.log('[DEBUG] Debug response:', data);
                alert('Debug info logged to console. Check browser dev tools.');
              } catch (err) {
                console.error('[DEBUG] Debug endpoint failed:', err);
                alert('Debug test failed. Check console.');
              }
            }}
            variant="outline"
            size="sm"
          >
            Debug Test
          </Button>
          <Button onClick={() => setCreateModal(prev => ({ ...prev, isOpen: true }))}>
            Create User
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.enabled).length}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.groups?.includes('admins')).length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => !u.enabled).length}
            </div>
            <div className="text-sm text-gray-600">Disabled</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search users by email or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {statusFilter === 'all' ? 'All Status' : 
                   statusFilter === 'enabled' ? 'Enabled' : 'Disabled'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('enabled')}>
                  Enabled Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('disabled')}>
                  Disabled Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => fetchUsers(true)} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium mb-1">Error Loading Users</div>
              <div className="text-sm">{error}</div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm underline">
                  Technical Details (click to expand)
                </summary>
                <div className="mt-2 text-xs font-mono bg-red-50 p-2 rounded">
                  <div>Timestamp: {new Date().toISOString()}</div>
                  <div>Error: {error}</div>
                  <div>Check browser console for more details</div>
                </div>
              </details>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No users found with current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Groups</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Last Modified</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedUsers.map((user) => (
                    <tr key={user.username} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            {user.username}
                            {user.emailVerified && (
                              <span className="ml-2 text-green-600">✓ Verified</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.enabled, user.status)}`}>
                          {getStatusText(user.enabled, user.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {user.groups?.map((group) => (
                            <span key={group} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {group}
                            </span>
                          ))}
                          {(!user.groups || user.groups.length === 0) && (
                            <span className="text-gray-500 text-sm">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(user.createdDate)}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(user.lastModifiedDate)}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {user.enabled ? (
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.username, 'disable')}
                                disabled={loadingStates[`${user.username}-disable`]}
                              >
                                Disable User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.username, 'enable')}
                                disabled={loadingStates[`${user.username}-enable`]}
                              >
                                Enable User
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => setResetPasswordModal({
                                isOpen: true,
                                user,
                                password: '',
                                temporary: true,
                              })}
                            >
                              Reset Password
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />                            
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                  handleUserAction(user.username, 'delete');
                                }
                              }}
                              disabled={loadingStates[`${user.username}-delete`]}
                              className="text-red-600"
                            >
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More Button */}
      {(paginatedUsers.length < filteredUsers.length || nextToken) && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline" disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Create User Modal */}
      {createModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={createModal.email}
                    onChange={(e) => setCreateModal(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name (Optional)</label>
                  <Input
                    value={createModal.displayName}
                    onChange={(e) => setCreateModal(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Password (Optional)</label>
                  <Input
                    type="password"
                    value={createModal.password}
                    onChange={(e) => setCreateModal(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave empty for auto-generated"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="temporary"
                    checked={createModal.temporary}
                    onChange={(e) => setCreateModal(prev => ({ ...prev, temporary: e.target.checked }))}
                  />
                  <label htmlFor="temporary" className="text-sm">
                    Require password change on first login
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setCreateModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={loadingStates['create-user'] || !createModal.email}
                >
                  {loadingStates['create-user'] ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.isOpen && resetPasswordModal.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Reset password for: <strong>{resetPasswordModal.user.email}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <Input
                    type="password"
                    value={resetPasswordModal.password}
                    onChange={(e) => setResetPasswordModal(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="temporary-reset"
                    checked={resetPasswordModal.temporary}
                    onChange={(e) => setResetPasswordModal(prev => ({ ...prev, temporary: e.target.checked }))}
                  />
                  <label htmlFor="temporary-reset" className="text-sm">
                    Require password change on next login
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setResetPasswordModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  disabled={!resetPasswordModal.password}
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}