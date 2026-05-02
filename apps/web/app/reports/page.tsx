'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, Filter, Search, 
  UserRound, Heart, Activity, Thermometer, Wind,
  ChevronDown, RefreshCw, Printer, Share2,
  Clock, AlertCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../../lib/api';

interface Report {
  id: string;
  patientName: string;
  patientId: string;
  bedId: string;
  type: 'patient' | 'summary' | 'analytics';
  date: string;
  riskLevel: 'low' | 'medium' | 'critical';
  status: 'ready' | 'generating';
}

const riskColors = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const typeIcons = {
  patient: UserRound,
  summary: FileText,
  analytics: Activity
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/patients`);
        if (!response.ok) {
          setReports([]);
          return;
        }

        const payload = await response.json() as { patients?: Array<{ id: string; name: string; bedId: string; latestPrediction?: { riskLevel: Report['riskLevel'] } }> };
        setReports((payload.patients ?? []).map((patient) => ({
          id: `RPT-${patient.id}`,
          patientName: patient.name,
          patientId: patient.id,
          bedId: patient.bedId,
          type: 'patient',
          date: new Date().toISOString().slice(0, 10),
          riskLevel: patient.latestPrediction?.riskLevel ?? 'low',
          status: 'ready'
        })));
      } catch {
        setReports([]);
      }
    };

    void loadReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDownload = async (report: Report) => {
    setLoading(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-500" />
              <h1 className="text-lg font-semibold text-white">Reports</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Generate Report Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl border border-cyan-500/30 p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Generate New Report</h2>
              <p className="text-sm text-slate-400">
                Create patient summaries, ICU analytics, or export historical data
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors">
                <UserRound className="w-4 h-4" />
                Patient Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors">
                <FileText className="w-4 h-4" />
                ICU Summary
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white text-sm font-medium rounded-xl transition-colors">
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Types</option>
              <option value="patient">Patient Reports</option>
              <option value="summary">ICU Summaries</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Last 30 days</span>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
          {filteredReports.length === 0 && (
            <div className="px-4 py-10 text-center text-slate-400">No reports available yet.</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Report</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Risk</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const TypeIcon = typeIcons[report.type];
                  return (
                    <tr key={report.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{report.id}</p>
                            {report.type === 'patient' && (
                              <p className="text-xs text-slate-500">Bed {report.bedId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white">{report.patientName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded-md capitalize">
                          {report.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {report.date}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border ${riskColors[report.riskLevel]}`}>
                          {report.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {report.status === 'ready' ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-amber-400">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Generating
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDownload(report)}
                            disabled={report.status !== 'ready'}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Total Reports', value: '156', icon: FileText, color: 'cyan' },
            { label: 'Patient Reports', value: '142', icon: UserRound, color: 'emerald' },
            { label: 'ICU Summaries', value: '12', icon: Activity, color: 'purple' },
            { label: 'Avg. Generation', value: '2.3s', icon: Clock, color: 'amber' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/50 rounded-xl border border-slate-800 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
