import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { User, Bell, Shield, Trash2, Save, Crown, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

interface UserProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { subscription, hasActivePlan } = useSubscription();
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // If no profile exists, use user email
        setProfile({
          full_name: '',
          email: user?.email || '',
          phone: ''
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch profile data.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (confirmed) {
      toast({
        title: 'Account Deletion',
        description: 'Please contact support to delete your account.',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={loading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive notifications from SSBGPT
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your test results and progress
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new features and reminders
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription Details
            </CardTitle>
            <CardDescription>
              Your current subscription plan and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActivePlan() && subscription ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Plan Name</Label>
                    <p className="text-base">{subscription.plan_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <p className="text-base capitalize">{subscription.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(subscription.starts_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Expiry Date</Label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Amount Paid</Label>
                  <p className="text-base">
                    {subscription.currency || 'INR'} {subscription.amount}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="mb-4">
                  <Crown className="w-12 h-12 mx-auto text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  You don't have an active subscription plan
                </p>
                <Button onClick={() => window.location.href = '/subscription'}>
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control your privacy settings and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Data Sharing for Improvement</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anonymous data sharing to help improve our AI assessments
                </p>
              </div>
              <Switch
                checked={dataSharing}
                onCheckedChange={setDataSharing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Account deletion will permanently remove all your data. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;