import React from 'react';
import { ActivityLogDeck } from '../components/dashboard/ActivityLogDeck';
import { History, ShieldCheck, Database, Layers } from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
                Platform Activity &amp; Audit Logs
              </h1>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">
                Real-Time System Audit Trail, User Operations &amp; Forensic Deletion Records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-gray-400 bg-black/40 border border-gray-800 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Audit Engine: <strong className="text-emerald-400">Active</strong></span>
          <span className="text-gray-600">//</span>
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Storage: <strong className="text-cyan-400">SQLite DB</strong></span>
        </div>
      </div>

      {/* Main Activity Log Component */}
      <ActivityLogDeck />
    </div>
  );
};
