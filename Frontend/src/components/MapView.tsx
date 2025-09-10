import React, { useState, useEffect, useRef } from "react";
import {
  Filter,
  MapPin,
  AlertTriangle,
  Droplets,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Eye,
  Zap,
  Shield,
  Target,
  Navigation,
  Layers,
  RefreshCw,
  Maximize2,
  Minimize2,
  Settings,
  Bell,
  X,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import LiveMap from "./LiveMap";
import api from "@/services/api";

interface Report {
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
  description: string;
  upvotes: Array<{ user: string }>;
  createdAt: string;
  reporter?: {
    name: string;
    email: string;
  };
}

const MapView = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [issues, setIssues] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);

  // Creative features
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [mapLayers, setMapLayers] = useState(["issues", "traffic"]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [showNotifications, setShowNotifications] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

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

  // Fetch data from backend
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/map/data", {
          params: {
            limit: 100,
            timeRange: selectedTimeRange,
          },
        });

        setIssues(response.data.data.reports);
        setStats(response.data.data.stats);

        // Show notification for new issues
        if (showNotifications && response.data.data.reports.length > 0) {
          showNotification(
            `${response.data.data.reports.length} issues updated`
          );
        }
      } catch (error) {
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();

    // Auto-refresh setup
    if (autoRefresh && isLiveMode) {
      refreshIntervalRef.current = setInterval(
        fetchMapData,
        refreshInterval * 1000
      );
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [
    autoRefresh,
    refreshInterval,
    selectedTimeRange,
    isLiveMode,
    showNotifications,
  ]);

  // Notification system
  const showNotification = (message: string) => {
    if (notificationRef.current) {
      notificationRef.current.textContent = message;
      notificationRef.current.classList.add("show");
      setTimeout(() => {
        notificationRef.current?.classList.remove("show");
      }, 3000);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle layer toggle
  const toggleLayer = (layer: string) => {
    setMapLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  const filteredIssues = issues.filter((issue: Report) => {
    if (selectedFilter !== "all" && issue.type !== selectedFilter) return false;
    if (selectedSeverity !== "all" && issue.severity !== selectedSeverity)
      return false;
    return true;
  });

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
  };

  const handleClosePopup = () => {
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500 pb-8">
      {/* Simple Header */}
      <div className="bg-white dark:bg-gray-900 transition-colors duration-500 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 animate-fade-in-up">
                Live Civic Issues Map
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Real-time tracking of reported civic issues across the city
              </p>
            </div>

            {/* Live Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">LIVE</span>
              </div>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simple Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Select onValueChange={setSelectedFilter} defaultValue="all">
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pothole">Potholes</SelectItem>
              <SelectItem value="streetlight">Malfunctioning streetlights</SelectItem>
              <SelectItem value="garbage">Overflowing trash bins</SelectItem>
              <SelectItem value="waterlogged">Water-logging</SelectItem>
              <SelectItem value="cleanliness">Cleanliness</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedSeverity} defaultValue="all">
            <SelectTrigger className="w-40">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <div className="relative">
              {/* Simple Map Controls */}
              <div className="absolute top-2 right-12 z-10 flex gap-2">
                <Button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  variant="outline"
                  size="sm"
                  className={`bg-white/95 hover:bg-white dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-600 ${
                    showHeatmap
                      ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-400"
                      : ""
                  }`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Heatmap
                </Button>

                <Button
                  onClick={() => setShowTraffic(!showTraffic)}
                  variant="outline"
                  size="sm"
                  className={`bg-white/95 hover:bg-white dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-600 ${
                    showTraffic
                      ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-400"
                      : ""
                  }`}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Traffic
                </Button>
              </div>

              <LiveMap
                reports={filteredIssues}
                onReportClick={handleReportClick}
                selectedReport={selectedReport}
                onClosePopup={handleClosePopup}
                showHeatmap={showHeatmap}
                showTraffic={showTraffic}
              />
            </div>
          </div>

          {/* Simple Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card className="shadow-lg border-0 bg-white dark:bg-[#111827] text-gray-900 dark:text-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Today's Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-100 dark:bg-[#1f2937] rounded-lg shadow-sm text-gray-900 dark:text-white">
                    <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                      {stats.total}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Total Issues
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-100 dark:bg-[#1f2937] rounded-lg shadow-sm text-gray-900 dark:text-white">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.resolved}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Resolved
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-100 dark:bg-[#1f2937] rounded-lg shadow-sm text-gray-900 dark:text-white">
                    <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                      {stats.inProgress}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      In Progress
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-100 dark:bg-[#1f2937] rounded-lg shadow-sm text-gray-900 dark:text-white">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {stats.critical}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Critical
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Issues */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Issues ({filteredIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading issues...</p>
                    </div>
                  ) : filteredIssues.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No issues found with current filters
                    </div>
                  ) : (
                    filteredIssues.map((issue: Report) => (
                      <div
                        key={issue._id}
                        className="border rounded-lg p-3 hover:bg-[#23293a] hover:text-white transition-all duration-200 cursor-pointer transform"
                        onClick={() => handleReportClick(issue)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getSeverityColor(
                                issue.severity
                              )}`}
                            ></div>
                            <span className="font-medium text-sm capitalize">
                              {issue.type.replace("-", " ")}
                            </span>
                          </div>
                          <Badge
                            className={`text-xs ${getStatusColor(
                              issue.status
                            )}`}
                          >
                            {issue.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {issue.location.address}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {issue.upvotes?.length || 0} upvotes
                          </div>
                          <div className="capitalize">
                            {issue.severity} priority
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
