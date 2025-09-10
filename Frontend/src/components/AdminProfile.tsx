import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "../hooks/useAuth";
import {
  Shield,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  BarChart3,
  Settings,
  MapPin,
} from "lucide-react";
import api from "@/services/api";
import {
  getBestImageUrl,
  createFallbackImageUrl,
} from "@/utils/imageOptimizer";
import { getSocket } from "@/services/socket";

interface AdminData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    picture?: string;
    role: string;
  };
  role: string;
  permissions: string[];
  assignedRegions: Array<{
    city: string;
    state: string;
    zipCodes: string[];
  }>;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  stats?: {
    totalReportsManaged: number;
    reportsResolved: number;
    reportsInProgress: number;
    reportsPending: number;
    usersManaged: number;
    averageResolutionTime: number;
    efficiencyScore: number;
  };
}

const AdminProfile = () => {
  const { user: authUser, role } = useAuth();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>("");

  const fetchAdminProfile = async () => {
    if (!authUser || role !== "admin") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 Fetching admin profile data for:", authUser?.email);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        // Silently use auth user data if no token
        setAdminData({ user: authUser } as AdminData);
        return;
      }

      const response = await api.get("/auth/admin-profile");
      console.log("✅ Admin profile data received:", response.data);

      if (response.data && response.data.data) {
        setAdminData(response.data.data);
        console.log("📊 Updated admin stats:", response.data.data.stats);
      } else {
        // Silently fallback to basic admin data
        setAdminData({ user: authUser } as AdminData);
      }
    } catch (err: unknown) {
      console.error("❌ Error fetching admin profile:", err);
      // Silently fallback to basic admin data without showing error
      setAdminData({ user: authUser } as AdminData);
    } finally {
      setLoading(false);
    }
  };

  const loadImage = async () => {
    if (authUser?.picture && authUser?.name) {
      try {
        const optimizedUrl = await getBestImageUrl(
          authUser.picture,
          authUser.name,
          112
        );
        setImageUrl(optimizedUrl);
      } catch (err) {
        console.error("Error loading image:", err);
        // Silently fallback to empty image URL
        setImageUrl("");
      }
    }
  };

  useEffect(() => {
    fetchAdminProfile();
    loadImage();

    // Set up real-time data refresh every 15 seconds for faster updates
    const refreshInterval = setInterval(() => {
      if (authUser && role === "admin") {
        fetchAdminProfile();
      }
    }, 15000); // 15 seconds

    // Listen for report status updates via WebSocket
    const socket = getSocket();

    const handleReportStatus = (updatedReport) => {
      console.log("🔄 Report status update received:", updatedReport?.status);
      fetchAdminProfile();
    };

    const handleAdminStatsUpdate = () => {
      console.log("📊 Admin stats update received");
      fetchAdminProfile();
    };

    const handleNewReport = () => {
      console.log("📝 New report received");
      fetchAdminProfile();
    };

    const handleContractorAssign = () => {
      console.log("👷 Contractor assignment received");
      fetchAdminProfile();
    };

    socket.on("report:status", handleReportStatus);
    socket.on("admin:stats:update", handleAdminStatsUpdate);
    socket.on("report:new", handleNewReport);
    socket.on("contractor:assign", handleContractorAssign);

    // Cleanup interval and socket listeners on unmount
    return () => {
      clearInterval(refreshInterval);
      socket.off("report:status", handleReportStatus);
      socket.off("admin:stats:update", handleAdminStatsUpdate);
      socket.off("report:new", handleNewReport);
      socket.off("contractor:assign", handleContractorAssign);
    };
  }, [authUser, role]);

  if (!authUser || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Admin access required to view this profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading admin profile...
          </p>
        </div>
      </div>
    );
  }

  const currentAdmin = adminData || { user: authUser };
  const permissions = (currentAdmin as AdminData)?.permissions || [];
  const regions = (currentAdmin as AdminData)?.assignedRegions || [];

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col items-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      <Card className="w-full max-w-4xl mb-8 shadow-xl relative z-10">
        <CardHeader className="flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl text-white font-bold mb-4 overflow-hidden">
            {adminData?.user?.picture ? (
              <img
                src={adminData.user.picture}
                alt="admin avatar"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div style={{ width: "100%", height: "100%" }}></div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            {currentAdmin.user?.name}
          </CardTitle>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentAdmin.user?.email}
          </div>
          <div className="mt-2 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {(currentAdmin as AdminData)?.role === "super_admin"
              ? "Super Administrator"
              : "Administrator"}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Admin Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-8 h-8 text-blue-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {(currentAdmin as AdminData)?.stats?.totalReportsManaged || 0}
              </div>
              <div className="text-xs text-gray-500">Reports Managed</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {(currentAdmin as AdminData)?.stats?.reportsResolved || 0}
              </div>
              <div className="text-xs text-gray-500">Resolved</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {(currentAdmin as AdminData)?.stats?.reportsInProgress || 0}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Users className="w-8 h-8 text-purple-500 mb-2" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {(currentAdmin as AdminData)?.stats?.usersManaged || 0}
              </div>
              <div className="text-xs text-gray-500">Users Managed</div>
            </div>
          </div>

          {/* Admin Performance Metrics */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Efficiency Score
                  </span>
                  <span className="font-semibold text-blue-600">
                    {(currentAdmin as AdminData)?.stats?.efficiencyScore || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Avg Resolution Time
                  </span>
                  <span className="font-semibold text-green-600">
                    {(currentAdmin as AdminData)?.stats
                      ?.averageResolutionTime || 0}{" "}
                    days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Pending Reports
                  </span>
                  <span className="font-semibold text-orange-600">
                    {(currentAdmin as AdminData)?.stats?.reportsPending || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Admin Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {permissions.map((permission, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {permission.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Regions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Assigned Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regions.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {regions.map((region, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {region.city}, {region.state}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ZIP Codes: {region.zipCodes.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No specific regions assigned. Managing all areas.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Admin Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(currentAdmin as AdminData)?.isActive
                      ? "Active"
                      : "Inactive"}
                  </div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(currentAdmin as AdminData)?.role === "super_admin"
                      ? "Super Admin"
                      : "Admin"}
                  </div>
                  <div className="text-xs text-gray-500">Role Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {permissions.length}
                  </div>
                  <div className="text-xs text-gray-500">Permissions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-gray-600 dark:text-gray-300 text-sm mt-8">
            <Shield className="w-4 h-4 inline mr-2" />
            This is your administrator profile. You have elevated privileges to
            manage the NagrikSetu system.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfile;
