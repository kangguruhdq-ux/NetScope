import React, { useState } from 'react';
import { api } from '../services/api';
import { DiscoveredDevice } from '../types';
import { DeviceTypeIcon } from '../components/common/DeviceTypeIcon';
import { Radio, Search, PlusCircle, Check, Loader2, AlertCircle } from 'lucide-react';

export const DiscoveryPage: React.FC = () => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredDevice[]>([]);
  const [selectedIps, setSelectedIps] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subnet) return;

    setIsScanning(true);
    setDiscoveredList([]);
    setMessage('');
    setErrorMessage('');
    setSelectedIps(new Set());

    try {
      const results = await api.scanSubnet(subnet);
      setDiscoveredList(results);
      if (results.length === 0) {
        setMessage('Scan completed. No active responsive hosts found on this subnet.');
      } else {
        setMessage(`Discovered ${results.length} active hosts on subnet ${subnet}.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Subnet scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelect = (ip: string) => {
    const next = new Set(selectedIps);
    if (next.has(ip)) {
      next.delete(ip);
    } else {
      next.add(ip);
    }
    setSelectedIps(next);
  };

  const handleImportSelected = async () => {
    const toImport = discoveredList.filter((d) => selectedIps.has(d.ip_address));
    if (toImport.length === 0) return;

    setImporting(true);
    try {
      const res = await api.bulkAddDevices(toImport);
      setMessage(res.message);
      // Mark as already monitored
      setDiscoveredList((prev) =>
        prev.map((d) => (selectedIps.has(d.ip_address) ? { ...d, already_monitored: true } : d))
      );
      setSelectedIps(new Set());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import devices.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Network Subnet Discovery
        </h1>
        <p className="text-xs font-mono text-cyan-400 mt-0.5">
          Non-Blocking Subnet Sweep &bull; Concurrency-Limited Safe Port Probing
        </p>
      </div>

      {/* Subnet Input Bar */}
      <div className="noc-card p-5 rounded-xl border border-gray-800">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Radio className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="e.g. 192.168.1.0/24"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl noc-input text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning Subnet (16 Workers)...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Start Subnet Scan</span>
              </>
            )}
          </button>
        </form>

        {message && (
          <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Discovered Hosts Table */}
      {discoveredList.length > 0 && (
        <div className="noc-card rounded-xl overflow-hidden border border-gray-800">
          <div className="p-4 bg-[#0E1424] border-b border-gray-800 flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-semibold">
              Discovered Hosts ({discoveredList.length})
            </span>

            {selectedIps.size > 0 && (
              <button
                onClick={handleImportSelected}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-950 font-bold hover:bg-emerald-400 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Import Selected ({selectedIps.size})</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">Select</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">Type Guess</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Open Ports</th>
                  <th className="py-3 px-4 text-right">Monitoring Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {discoveredList.map((dev) => {
                  const isSelected = selectedIps.has(dev.ip_address);
                  return (
                    <tr key={dev.ip_address} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={dev.already_monitored}
                          onChange={() => handleToggleSelect(dev.ip_address)}
                          className="rounded bg-[#0B0F19] border-gray-700 text-cyan-500 focus:ring-cyan-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-cyan-300 font-bold">{dev.ip_address}</td>
                      <td className="py-3 px-4 text-gray-300">{dev.hostname || 'None'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-200">
                          <DeviceTypeIcon type={dev.suggested_type} className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{dev.suggested_type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {dev.latency_ms != null ? `${dev.latency_ms} ms` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {dev.open_ports.length === 0 ? (
                            <span className="text-gray-400">None detected</span>
                          ) : (
                            dev.open_ports.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded bg-black/50 border border-gray-800 text-cyan-300 text-[10px]"
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dev.already_monitored ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Monitored
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedIps(new Set([dev.ip_address]));
                              handleImportSelected();
                            }}
                            className="px-2.5 py-1 rounded border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-[11px] transition"
                          >
                            Add to Monitoring
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
