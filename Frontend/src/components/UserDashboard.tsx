import React, { useState, useEffect } from "react";
import {
  Plus,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { getSocket } from "@/services/socket";

interface UserReport {
  _id: string;
  type: string;
  severity: string;
  status: string;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  createdAt: string;
  resolvedAt?: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [allReports, setAllReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters for All Reports
  const [allStatus, setAllStatus] = useState<string>("all");
  const [allSeverity, setAllSeverity] = useState<string>("all");
  const [allCategory, setAllCategory] = useState<string>("all");
  const [allType, setAllType] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const requests: Promise<any>[] = [];
        if (user) {
          requests.push(api.get("/reports/user/me", { params: { limit: 0 } }));
        }
        requests.push(
          api.get("/reports", {
            params: { limit: 0, sort: "createdAt", order: "desc" },
          })
        );

        const [userRes, allRes] = await Promise.all([
          user ? requests[0] : Promise.resolve({ data: { data: [] } }),
          user ? requests[1] : requests[0],
        ]);

        if (user) setUserReports(userRes.data.data || []);
        // /reports returns { reports, pagination }
        const all = allRes.data.data?.reports || allRes.data.data || [];
        setAllReports(all);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // Join user room
    socket.emit("join-user", user._id);

    // Listen for report status updates
    socket.on("report:status", (updatedReport) => {
      setUserReports((prev) =>
        prev.map((report) =>
          report._id === updatedReport._id ? updatedReport : report
        )
      );
      setAllReports((prev) =>
        prev.map((report) =>
          report._id === updatedReport._id ? updatedReport : report
        )
      );
    });

    // Listen for new reports
    socket.on("report:new", (newReport) => {
      if (newReport.reporter === user._id) {
        setUserReports((prev) => [newReport, ...prev]);
      }
      setAllReports((prev) => [newReport, ...prev]);
    });

    // Listen for contractor assignments
    socket.on("contractor:assign", (data) => {
      console.log("👷 Contractor assignment received:", data);
      setUserReports((prev) =>
        prev.map((report) =>
          report._id === data.reportId
            ? { ...report, contractor: data.contractor }
            : report
        )
      );
      setAllReports((prev) =>
        prev.map((report) =>
          report._id === data.reportId
            ? { ...report, contractor: data.contractor }
            : report
        )
      );
    });

    return () => {
      socket.off("report:status");
      socket.off("report:new");
      socket.off("contractor:assign");
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "verified":
        return "bg-orange-100 text-orange-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "low":
        return <AlertTriangle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const nextLevelPoints = 2500;
  const progressPercentage =
    ((user?.stats?.points || 0) / nextLevelPoints) * 100;

  // Derived filtered list for All Reports based on filters
  const filteredAllReports = allReports.filter((r: any) => {
    if (allStatus !== "all" && r.status !== allStatus) return false;
    if (allSeverity !== "all" && r.severity !== allSeverity) return false;
    if (allCategory !== "all" && (r.category || "other") !== allCategory)
      return false;
    if (allType !== "all" && (r.type || "other") !== allType) return false;
    return true;
  });

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500 py-12 overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.name || "User"}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Track your reports and see your community impact
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <Link to="/report">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Report New Issue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {user?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("") || "U"}
                      </span>
                    </div>
                  )}
                  {user?.name || "User"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Level
                    </span>
                    <Badge className="bg-orange-100 text-orange-800">
                      <Trophy className="w-3 h-3 mr-1" />
                      {user?.stats?.level || "Bronze"}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Points
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {(user?.stats?.points || 0).toLocaleString()} /{" "}
                        {nextLevelPoints.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {(
                        nextLevelPoints - (user?.stats?.points || 0)
                      ).toLocaleString()}{" "}
                      points to Silver level
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {user?.stats?.reportsSubmitted || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Reports Submitted
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {user?.stats?.reportsResolved || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Issues Resolved
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Your Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-blue-900">
                          Community Rank
                        </div>
                        <div className="text-xs text-blue-600">
                          Among all contributors
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      #{user?.stats?.rank || 0}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {user?.stats?.reportsSubmitted
                        ? (
                            (user.stats.reportsResolved /
                              user.stats.reportsSubmitted) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-green-700">
                      Resolution Rate
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Above average!
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports List */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {activeTab === "my"
                      ? `My Reports (${userReports.length})`
                      : `All Reports (${allReports.length})`}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={activeTab === "my" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("my")}
                    >
                      My Reports
                    </Button>
                    <Button
                      variant={activeTab === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("all")}
                    >
                      All Reports
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading reports...</p>
                    </div>
                  ) : activeTab === "my" ? (
                    userReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No reports found. Start by reporting an issue!</p>
                      </div>
                    ) : (
                      userReports.map((report: UserReport) => (
                        <div
                          key={report._id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getSeverityIcon(report.severity)}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {report.type}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {report.location.address}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                report.status
                              )} capitalize`}
                            >
                              {report.status.replace("-", " ")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Submitted:{" "}
                              {new Date(report.createdAt).toLocaleDateString()}
                            </div>
                            {report.resolvedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Resolved:{" "}
                                {new Date(
                                  report.resolvedAt
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {report.status === "resolved" && (
                            <div className="mt-3 p-2 bg-green-50 rounded-md">
                              <p className="text-sm text-green-800 font-medium">
                                Issue resolved! Thank you for making your
                                community safer.
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )
                  ) : (
                    <div className="max-h-[54rem] overflow-y-auto pr-1 space-y-4 p-2">
                      {/* Filters for All Reports */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Select value={allType} onValueChange={setAllType}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="pothole">Potholes</SelectItem>
                            <SelectItem value="streetlight">
                              Malfunctioning streetlights
                            </SelectItem>
                            <SelectItem value="garbage">
                              Overflowing trash bins
                            </SelectItem>
                            <SelectItem value="waterlogged">
                              Water-logging
                            </SelectItem>
                            <SelectItem value="cleanliness">
                              Cleanliness
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={allCategory}
                          onValueChange={setAllCategory}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="roads">Potholes</SelectItem>
                            <SelectItem value="lighting">
                              Street Light issues
                            </SelectItem>
                            <SelectItem value="sanitation">
                              Trash Bin
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={allSeverity}
                          onValueChange={setAllSeverity}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={allStatus} onValueChange={setAllStatus}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="in-progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {filteredAllReports.map((report: any) => (
                          <div
                            key={report._id}
                            className="border rounded-lg hover:shadow-md transition-shadow bg-white flex flex-col min-h-[12rem] overflow-visible"
                          >
                            {report.images && report.images.length > 0 ? (
                              <img
                                src={report.images[0].url}
                                alt="Report"
                                className="w-full h-36 object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                                No image available
                              </div>
                            )}
                            <div className="p-3 flex-1 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">
                                  {report.type?.toString().replace("-", " ") ||
                                    "Issue"}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(
                                    report.status
                                  )}`}
                                >
                                  {report.status
                                    ?.toString()
                                    .replace("-", " ") || "pending"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {getSeverityIcon(report.severity)}
                                <span className="capitalize text-gray-600">
                                  {report.severity || "unknown"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 break-words">
                                {report.location?.address ||
                                  "Location not available"}
                              </p>
                              <p className="text-sm text-gray-600 break-words whitespace-pre-wrap">
                                {report.description ||
                                  "No description provided."}
                              </p>
                              <div className="text-xs text-gray-500 mt-2">
                                {new Date(
                                  report.createdAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/report">
                    <Button
                      variant="outline"
                      className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Report Another Issue
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
