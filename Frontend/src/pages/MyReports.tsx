import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { FileText, CheckCircle, Clock, AlertCircle, Award } from "lucide-react";
import api from "@/services/api";

interface Report {
  _id: string;
  type: string;
  status: string;
  location: {
    address: string;
  };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  resolved: "bg-green-100 text-green-800",
  "in-progress": "bg-blue-100 text-blue-800",
  verified: "bg-yellow-100 text-yellow-800",
  pending: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  resolved: <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />,
  "in-progress": <Clock className="w-4 h-4 text-blue-500 inline mr-1" />,
  verified: <Award className="w-4 h-4 text-yellow-500 inline mr-1" />,
  pending: <AlertCircle className="w-4 h-4 text-gray-500 inline mr-1" />,
};

const MyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        setLoading(true);
        const response = await api.get("/reports/user/me");
        setReports(response.data.data);
      } catch (error) {
        console.error("Error fetching user reports:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserReports();
    }
  }, [user]);

  const resolved = reports.filter(
    (r: Report) => r.status === "resolved"
  ).length;
  const inProgress = reports.filter(
    (r: Report) => r.status === "in-progress"
  ).length;
  const verified = reports.filter(
    (r: Report) => r.status === "verified"
  ).length;
  const pending = reports.filter((r: Report) => r.status === "pending").length;

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col items-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <Card className="w-full max-w-2xl mb-8 shadow-xl relative z-10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            My Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300 w-20">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300 w-20">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="pothole">Pothole</option>
                <option value="crack">Crack</option>
                <option value="waterlogged">Waterlogged</option>
                <option value="debris">Debris</option>
                <option value="signage">Signage</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300 w-20">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300 w-20">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center">
              <FileText className="w-6 h-6 text-blue-500 mb-1" />
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                {reports.length}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                {resolved}
              </div>
              <div className="text-xs text-gray-500">Resolved</div>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-6 h-6 text-blue-500 mb-1" />
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                {inProgress}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="flex flex-col items-center">
              <Award className="w-6 h-6 text-yellow-500 mb-1" />
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                {verified}
              </div>
              <div className="text-xs text-gray-500">Verified</div>
            </div>
          </div>
          {reports.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-300 py-8">
              You have not submitted any reports yet.
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading your reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-300 py-8">
                  You have not submitted any reports yet.
                </div>
              ) : (
                reports
                  .filter((r) =>
                    statusFilter === "all" ? true : r.status === statusFilter
                  )
                  .filter((r) =>
                    typeFilter === "all" ? true : r.type === typeFilter
                  )
                  .filter((r) => {
                    if (!dateFrom && !dateTo) return true;
                    const ts = new Date(r.createdAt).getTime();
                    const fromOk = dateFrom
                      ? ts >= new Date(dateFrom).getTime()
                      : true;
                    const toOk = dateTo
                      ? ts <= new Date(dateTo).getTime()
                      : true;
                    return fromOk && toOk;
                  })
                  .map((report: Report) => (
                    <div
                      key={report._id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          {report.type}
                        </div>
                        <div className="text-gray-500 dark:text-gray-300 text-sm">
                          {report.location.address}
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end mt-2 md:mt-0">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded mb-1 flex items-center gap-1 ${
                            statusColors[report.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {statusIcons[report.status]}
                          {report.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyReports;
