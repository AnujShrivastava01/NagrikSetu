import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { User, FileText, CheckCircle, Award, Clock, AlertCircle, Star, TrendingUp, MapPin, Calendar } from 'lucide-react';
import api from '@/services/api';
import { getBestImageUrl, createFallbackImageUrl } from '@/utils/imageOptimizer';
import { getSocket } from '@/services/socket';

const UserProfile = () => {
  const { user: authUser, role } = useAuth();
  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

  const fetchProfile = async () => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Fetching user profile data for:', authUser?.email);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // Silently use auth user data if no token
        setUser(authUser);
        return;
      }
      
      const response = await api.get('/auth/profile');
      console.log('✅ User profile data received:', response.data);
      
      if (response.data && response.data.data) {
        // Ensure the data has proper structure
        const profileData = response.data.data;
        
        // Ensure stats object exists
        if (!profileData.stats) {
          profileData.stats = {
            reportsSubmitted: 0,
            reportsResolved: 0,
            reportsInProgress: 0,
            reportsPending: 0,
            reportsVerified: 0,
            points: 0,
            level: 'Bronze'
          };
        }
        
        // Ensure reports array exists
        if (!profileData.reports) {
          profileData.reports = [];
        }
        
        setUser(profileData);
        setError(null);
      } else {
        console.warn('⚠️ No profile data in response, using auth user data');
        setUser(authUser);
      }
    } catch (err: unknown) {
      // Silently fallback to auth user data without showing error
      setUser(authUser);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const loadImage = async () => {
    if (authUser?.picture && authUser?.name) {
      try {
        const optimizedUrl = await getBestImageUrl(authUser.picture, authUser.name, 112);
        setImageUrl(optimizedUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        // Silently fallback to empty image URL
        setImageUrl('');
      }
    }
  };



  useEffect(() => {
    fetchProfile();
    loadImage();

    // Set up real-time data refresh every 15 seconds for faster updates
    const refreshInterval = setInterval(() => {
      if (authUser) {
        fetchProfile();
      }
    }, 15000); // 15 seconds

    // Listen for report status updates via WebSocket
    const socket = getSocket();
    socket.on('report:status', (updatedReport) => {
      // Immediately refresh profile when report status changes
      fetchProfile();
    });
    
    socket.on('user:stats:update', (data) => {
      // Immediately refresh profile when user stats update
      if (data.userId === authUser?._id) {
        fetchProfile();
      }
    });
    
    socket.on('report:new', (newReport) => {
      // Immediately refresh profile when new report is created
      if (newReport.reporter === authUser?._id) {
        fetchProfile();
      }
    });
    
    socket.on('contractor:assign', (data) => {
      // Immediately refresh profile when contractor is assigned to user's report
      fetchProfile();
    });

    // Cleanup interval and socket listeners on unmount
    return () => {
      clearInterval(refreshInterval);
      socket.off('report:status');
      socket.off('user:stats:update');
      socket.off('report:new');
      socket.off('contractor:assign');
    };
  }, [authUser]);

  // Ensure we have user data
  const currentUser = user || authUser;
  const reports = currentUser?.reports || [];
  const resolved = reports.filter((r) => r.status === 'resolved').length;

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        <div className="text-center">
          <User className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Safety check - if we still don't have user data after loading
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Failed to load user data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col items-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      <Card className="w-full max-w-2xl mb-8 shadow-xl relative z-10">
        <CardHeader className="flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-4xl text-white font-bold mb-4 overflow-hidden">
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt="user avatar"
                className="w-full h-full rounded-full object-cover"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div style={{ width: '100%', height: '100%' }}></div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            {currentUser.name}
          </CardTitle>
          <div className="text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</div>
          <div className="mt-2 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />
            Community Member
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          
          {/* User Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-8 h-8 text-blue-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {currentUser?.stats?.reportsSubmitted || reports.length}
              </div>
              <div className="text-xs text-gray-500">Total Reports</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {currentUser?.stats?.reportsResolved || resolved}
              </div>
              <div className="text-xs text-gray-500">Resolved</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {currentUser?.stats?.reportsInProgress || 0}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertCircle className="w-8 h-8 text-orange-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {currentUser?.stats?.reportsPending || 0}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
          
          {/* User Stats */}
          {currentUser?.stats && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Your Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentUser.stats.points || 0}</div>
                    <div className="text-xs text-gray-500">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{currentUser.stats.level || 'Bronze'}</div>
                    <div className="text-xs text-gray-500">Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{currentUser.stats.reportsResolved || 0}</div>
                    <div className="text-xs text-gray-500">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentUser.stats.reportsSubmitted > 0 
                        ? Math.round((currentUser.stats.reportsResolved / currentUser.stats.reportsSubmitted) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>
                
                {/* Additional Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Resolution Rate</div>
                      <div className="text-lg font-bold text-green-600">
                        {currentUser.stats.reportsSubmitted > 0 
                          ? Math.round((currentUser.stats.reportsResolved / currentUser.stats.reportsSubmitted) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Active Reports</div>
                      <div className="text-lg font-bold text-blue-600">
                        {(currentUser.stats.reportsInProgress || 0) + (currentUser.stats.reportsPending || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Community Impact</div>
                      <div className="text-lg font-bold text-purple-600">
                        {currentUser.stats.reportsResolved > 0 ? 'High' : currentUser.stats.reportsSubmitted > 0 ? 'Medium' : 'New'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Achievements */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Achievements & Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentUser?.stats?.reportsSubmitted >= 1 ? 'First Report' : 'First Report'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentUser?.stats?.reportsSubmitted >= 1 ? '✅ Earned' : '🔒 Locked'}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Problem Solver
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentUser?.stats?.reportsResolved >= 5 ? '✅ Earned' : '🔒 Locked'}
                  </div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentUser?.stats?.level || 'Bronze'}
                  </div>
                  <div className="text-xs text-gray-500">Current Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length > 0 ? (
                  reports.slice(0, 3).map((report, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${
                        report.status === 'resolved' ? 'bg-green-500' :
                        report.status === 'in-progress' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {report.type} Report
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">
                        {report.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reports submitted yet</p>
                    <p className="text-sm">Start by reporting your first road issue!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center text-gray-600 dark:text-gray-300 text-sm mt-8">
            <User className="w-4 h-4 inline mr-2" />
            This is your community member profile. Keep reporting issues to earn points and badges!
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile; 