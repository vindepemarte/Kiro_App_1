'use client';

// Demo component to test authentication functionality

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, RefreshCw } from 'lucide-react';

export function AuthDemo() {
  const { user, loading, error, signOut, reauthenticate, initializeAuth } = useAuth();

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>Loading authentication state...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Authentication Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={initializeAuth} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Authentication
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Not Authenticated</CardTitle>
          <CardDescription>No user is currently signed in</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={initializeAuth} className="w-full">
            Initialize Authentication
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Authentication Status
        </CardTitle>
        <CardDescription>Current user information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {user.uid.substring(0, 8)}...
            </code>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Type:</span>
            <Badge variant={user.isAnonymous ? "secondary" : "default"}>
              {user.isAnonymous ? "Anonymous" : "Authenticated"}
            </Badge>
          </div>

          {user.customClaims && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom Claims:</span>
              <Badge variant="outline">Yes</Badge>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={signOut} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          
          <Button 
            onClick={() => reauthenticate()} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-auth
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}