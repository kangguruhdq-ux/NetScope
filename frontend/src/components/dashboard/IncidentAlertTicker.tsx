import React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../types';
import { AlertTriangle, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface IncidentAlertTickerProps {
  alerts: Alert[];
}

export const IncidentAlertTicker: React.FC<IncidentAlertTickerProps> = ({ alerts }) => {
  const activeAlerts = alerts.filter(
    (a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'
  );

  return (
    <div className="noc-card p-5 rounded-xl flex flex-col justify-between h-[320px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {activeAlerts.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                activeAlerts.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Recent Critical Incidents
          </span>
        </div>
        <Link
          to="/alerts"
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
        {activeAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mb-2" />
            <span className="text-sm font-mono text-gray-300">All Systems Nominal</span>
            <span className="text-xs font-mono text-gray-400 mt-0.5">
              Zero active critical or degraded incidents
            </span>
          </div>
        ) : (
          activeAlerts.slice(0, 5).map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 transition ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                }`}
              >
                {isCritical ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate text-white">
                      {alert.title}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-gray-800 text-[11px] font-mono text-gray-400 flex items-center justify-between">
        <span>Active Incidents: {activeAlerts.length}</span>
        <span className="text-cyan-400">Threshold: 3 Fails Auto-Trigger</span>
      </div>
    </div>
  );
};
