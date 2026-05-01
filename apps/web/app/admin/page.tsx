'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, Activity, Database, Clock, AlertTriangle, 
  Search, Filter, Download, RefreshCw, CheckCircle, XCircle,
  UserPlus, Settings, FileText, ChevronRight
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin';
  active: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  createdAt: string;
}

type TabValue = 'users' | 'roles' | 'logs';

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      
      const [usersRes, logsRes] = await Promise.all([
        fetch(`${apiUrl}/api/users`).catch(() => ({ ok: false })),
        fetch(`${apiUrl}/api/audit/logs`).catch(() => ({ ok: false }))
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users ?? []);
      } else {
        // Fallback demo data
        setUsers([
          { id: 'user_doctor_maya', email: 'dr.carter@icu.local', name: 'Dr. Maya Carter', role: 'doctor', active: true, createdAt: new Date().toISOString() },
          { id: 'user_nurse_lee', email: 'nurse.lee@icu.local', name: 'Nurse Daniel Lee', role: 'nurse', active: true, createdAt: new Date().toISOString() },
          { id: 'user_admin_ops', email: 'admin@icu.local', name: 'Operations Admin', role: 'admin', active: true, createdAt: new Date().toISOString() }
        ]);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs ?? []);
      } else {
        setLogs([
          { id: 'log_1', actorId: 'user_doctor_maya', actorRole: 'doctor', action: 'patient.read', resource: 'patient', createdAt: new Date().toISOString() },
          { id: 'log_2', actorId: 'user_nurse_lee', actorRole: 'nurse', action: 'alert.acknowledge', resource: 'alert', createdAt: new Date().toISOString() }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    doctor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    nurse: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-cyan-500" />
              <h1 className="text-lg font-semibold text-white">Administration</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'cyan' },
            { label: 'Active Sessions', value: users.filter(u => u.active).length, icon: Activity, color: 'emerald' },
            { label: 'Doctors', value: users.filter(u => u.role === 'doctor').length, icon: Shield, color: 'purple' },
            { label: 'Audit Events', value: logs.length, icon: FileText, color: 'amber' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4"
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

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 mb-6 w-fit">
          {(['users', 'roles', 'logs'] as TabValue[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
            >
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-lg transition-colors">
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">User</th>
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Role</th>
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Created</th>
                      <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{user.name}</p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${roleColors[user.role]}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.active ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-400">
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'roles' && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Role Permissions</h3>
                <div className="space-y-4">
                  {[
                    { role: 'admin', description: 'Full system access', permissions: ['All permissions'], color: 'purple' },
                    { role: 'doctor', description: 'Clinical care team', permissions: ['patient:read', 'patient:write', 'vitals:read', 'alert:write', 'analytics:read', 'report:export'], color: 'cyan' },
                    { role: 'nurse', description: 'Bedside care', permissions: ['patient:read', 'vitals:read', 'alert:write'], color: 'emerald' }
                  ].map((roleConfig) => (
                    <div key={roleConfig.role} className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border bg-${roleConfig.color}-500/20 text-${roleConfig.color}-400 border-${roleConfig.color}-500/30`}>
                          {roleConfig.role}
                        </span>
                        <span className="text-sm text-slate-400">{roleConfig.description}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {roleConfig.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Database className="w-4 h-4" />
                  <span>{logs.length} audit events</span>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No audit logs found
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="px-4 py-3 hover:bg-slate-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{log.action}</p>
                            <p className="text-xs text-slate-400">
                              {log.actorRole} • {log.resource}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
