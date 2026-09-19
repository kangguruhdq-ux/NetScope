import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SLAReport } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { NetScopeLogo } from '../components/common/NetScopeLogo';
import {
  BarChart3,
  Download,
  Printer,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [report, setReport] = useState<SLAReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSLAReport(period);
      setReport(data);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = async () => {
    const exportData = await api.getExportData(period);
    const headers = ['ID', 'Name', 'IP Address', 'Device Type', 'Location', 'Status', 'Uptime Hours'];
    const rows = exportData.devices.map((d: any) => [
      d.id,
      `"${d.name}"`,
      d.ip_address,
      d.device_type,
      `"${d.location}"`,
      d.status,
      d.uptime_hours,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NetScope_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = async () => {
    const exportData = await api.getExportData(period);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `NetScope_Audit_${period}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header with Export buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Network SLA &amp; Audit Reports
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Availability Analytics &bull; Mean Time to Repair (MTTR) &bull; Official Exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-black/40 border border-gray-800 rounded-lg p-0.5 text-xs font-mono">
            {(['24h', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md transition ${
                  period === p
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-200 text-xs font-mono transition"
            title="Print-Friendly PDF Export"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-emerald-500/40 text-gray-200 text-xs font-mono transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-purple-500/40 text-gray-200 text-xs font-mono transition"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="noc-card p-8 rounded-2xl border border-gray-800 space-y-6">
        {/* Document Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-5">
          <div>
            <NetScopeLogo size="md" showTagline={true} />
            <div className="text-xs font-mono text-gray-400 mt-2">
              Official Network Operations Audit Report &bull; Period: Last {period.toUpperCase()}
            </div>
          </div>
          <div className="text-right text-xs font-mono text-gray-400">
            <div>Generated: {report ? new Date(report.generated_at).toLocaleString() : '-'}</div>
            <div className="text-cyan-400 font-semibold">NetScope Engine Verified</div>
          </div>
        </div>

        {/* Top Metric Cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-xs font-mono text-gray-400 uppercase block mb-1">
                Overall Availability SLA
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {report.overall_sla_pct}%
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">
                Target Standard: 99.90%
              </span>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-xs font-mono text-gray-400 uppercase block mb-1">
                Total Outages Logged
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
                {report.outage_summary.total_outages}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">
                Threshold: 3 Consecutive Polls
              </span>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-xs font-mono text-gray-400 uppercase block mb-1">
                Mean Time to Repair (MTTR)
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
                {report.outage_summary.mean_time_to_repair_minutes}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">Minutes / Incident</span>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-xs font-mono text-gray-400 uppercase block mb-1">
                Avg Latency / Packet Loss
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {report.average_fleet_latency_ms} <span className="text-xs font-normal text-cyan-400">ms</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">
                Loss: {report.average_packet_loss_pct}%
              </span>
            </div>
          </div>
        )}

        {/* Top 5 Flapping Devices Section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold font-sans text-white border-b border-gray-800 pb-2">
            Top 5 Flapping / Unstable Hardware Nodes
          </h3>
          {report?.top_flapping_devices.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-gray-400 bg-black/30 rounded-xl border border-gray-800">
              Zero flapping nodes detected. All network devices exhibited stable link connectivity.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th className="py-2.5">Device Name</th>
                  <th className="py-2.5">IP Address</th>
                  <th className="py-2.5">State Flap Count</th>
                  <th className="py-2.5">Last Event</th>
                  <th className="py-2.5 text-right">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {report?.top_flapping_devices.map((f) => (
                  <tr key={f.device_id}>
                    <td className="py-2.5 font-bold text-white">{f.device_name}</td>
                    <td className="py-2.5 text-cyan-300">{f.ip_address}</td>
                    <td className="py-2.5 text-amber-400 font-bold">{f.flap_count} transitions</td>
                    <td className="py-2.5 text-gray-400">
                      {new Date(f.last_event_time).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 text-right">
                      <StatusBadge status={f.current_status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sign-off footer */}
        <div className="pt-6 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
          <span>NetScope Automated Telemetry Engine</span>
          <span>Verified &bull; Network Operations Center</span>
        </div>
      </div>
    </div>
  );
};
