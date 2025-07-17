'use client';

import { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { updatePassword } from 'aws-amplify/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Mail, Calendar, LayoutDashboard, Settings } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuthenticator((context) => [context.user]);
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long'
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage({ type: null, text: '' });

    try {
      await updatePassword({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordMessage({
        type: 'success',
        text: 'Password updated successfully!'
      });
      
      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      setPasswordMessage({
        type: 'error',
        text: error.message || 'Failed to update password. Please try again.'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <p className="text-gray-600">Please sign in to access your profile.</p>
        </div>
      </div>
    );
  }

  // Get user details
  const email = user.signInDetails?.loginId || '';
  const username = user.username || '';
  const userId = user.userId || '';

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-gray-600">Manage your account settings and security</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-mono">{email}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-mono">{username}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-mono text-gray-600">{userId.substring(0, 8)}...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <p className="text-sm text-gray-600">
              Update your password to keep your account secure
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                  Current Password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ 
                    ...prev, 
                    currentPassword: e.target.value 
                  }))}
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ 
                      ...prev, 
                      newPassword: e.target.value 
                    }))}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ 
                      ...prev, 
                      confirmPassword: e.target.value 
                    }))}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character</li>
                </ul>
              </div>

              {/* Status Message */}
              {passwordMessage.text && (
                <div className={`p-3 rounded-md text-sm ${
                  passwordMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isChangingPassword}
                className="w-full md:w-auto"
              >
                {isChangingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Additional Security Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Security Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>Account Security:</strong> Your account is protected by AWS Cognito with enterprise-grade security.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Passwords are encrypted and never stored in plain text</li>
                <li>Session tokens are automatically rotated</li>
                <li>All authentication requests are logged for security monitoring</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 