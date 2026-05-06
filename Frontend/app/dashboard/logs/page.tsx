"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";

interface LogEntry {
  id: number;
  user: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // 🌟 FIXED ROUTE: Direct call without extra /api
      const response = await api.get("/audit-logs/");
      setLogs(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to load logs. You might not have admin permissions.");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md">CREATE</span>;
      case "UPDATE":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">UPDATE</span>;
      case "DELETE":
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-md">DELETE</span>;
      case "LOGIN":
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-md">LOGIN</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-md">{action}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">System Audit Logs 🕵️‍♂️</h1>
        <p className="text-gray-500 mt-2 font-medium">Track all user and AI activities across your ERP system.</p>
      </div>

      {error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User / Agent</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Module</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                            {log.user.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                        {log.module}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No activity logs found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}