'use client';

import { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDashboard from './admin/page';
import UserDashboard from './user/page';

export default function DashboardPage() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin (for now, all authenticated users are admins)
    // In a real app, you'd check user groups or permissions
    if (user) {
      setIsAdmin(true);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Dashboard Toggle */}
        {isAdmin && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <span className="text-sm font-medium">Switch View:</span>
                  <Button 
                    variant={isAdminView ? "outline" : "default"}
                    onClick={() => setIsAdminView(false)}
                    size="sm"
                  >
                    User Dashboard
                  </Button>
                  <Button 
                    variant={isAdminView ? "default" : "outline"}
                    onClick={() => setIsAdminView(true)}
                    size="sm"
                  >
                    Admin Dashboard
                  </Button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {isAdminView 
                    ? "Viewing admin dashboard - manage all reported links and user reports"
                    : "Viewing user dashboard - see your own links and reports"
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Render appropriate dashboard */}
        <div className="dashboard-content">
          {isAdminView ? <AdminDashboard /> : <UserDashboard />}
        </div>
      </div>
    </div>
  );
} 