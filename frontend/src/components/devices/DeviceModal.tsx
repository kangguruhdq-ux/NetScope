import React, { useState, useEffect } from 'react';
import { Device, DeviceType } from '../../types';
import { api } from '../../services/api';
import { X, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceData: any) => Promise<void>;
  initialDevice?: Device | null;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDevice,
}) => {
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('OTHER');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [monitoringInterval, setMonitoringInterval] = useState(30);
  const [protocols, setProtocols] = useState<string[]>(['ICMP']);
  const [snmpVersion, setSnmpVersion] = useState('v2c');
  const [snmpPort, setSnmpPort] = useState(161);
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [tcpPorts, setTcpPorts] = useState('80, 443, 22');
  const [httpUrl, setHttpUrl] = useState('');

  // Test Connectivity State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialDevice) {
      setName(initialDevice.name);
      setHostname(initialDevice.hostname || '');
      setIpAddress(initialDevice.ip_address);
      setDeviceType(initialDevice.device_type);
      setLocation(initialDevice.location || '');
      setDescription(initialDevice.description || '');
      setMonitoringInterval(initialDevice.monitoring_interval_seconds);
      setProtocols(initialDevice.protocols || ['ICMP']);
      setSnmpVersion(initialDevice.snmp_version || 'v2c');
      setSnmpPort(initialDevice.snmp_port || 161);
      setSnmpCommunity(initialDevice.snmp_community || 'public');
      setTcpPorts((initialDevice.tcp_check_ports || []).join(', '));
      setHttpUrl(initialDevice.http_health_url || '');
    } else {
      setName('');
      setHostname('');
      setIpAddress('');
      setDeviceType('ROUTER');
      setLocation('');
      setDescription('');
      setMonitoringInterval(30);
      setProtocols(['ICMP', 'SNMP']);
      setSnmpVersion('v2c');
      setSnmpPort(161);
      setSnmpCommunity('public');
      setTcpPorts('80, 443, 22, 8291');
      setHttpUrl('');
    }
    setTestResult(null);
    setErrorMsg('');
  }, [initialDevice, isOpen]);

  if (!isOpen) return null;

  const handleProtocolToggle = (proto: string) => {
    if (protocols.includes(proto)) {
      setProtocols(protocols.filter((p) => p !== proto));
    } else {
      setProtocols([...protocols, proto]);
    }
  };

  const handleTestConnectivity = async () => {
    if (!ipAddress) {
      setErrorMsg('Enter an IP address to test connectivity.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setErrorMsg('');

    try {
      const parsedPorts = tcpPorts
        .split(',')
        .map((p) => parseInt(p.trim()))
        .filter((p) => !isNaN(p) && p > 0 && p <= 65535);

      const res = await api.testConnectivity({
        ip_address: ipAddress,
        protocols,
        snmp_community: snmpCommunity,
        snmp_port: snmpPort,
        tcp_check_ports: parsedPorts,
        http_health_url: httpUrl || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connectivity test encountered an error.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ipAddress) {
      setErrorMsg('Name and IP Address are required.');
      return;
    }

    const parsedPorts = tcpPorts
      .split(',')
      .map((p) => parseInt(p.trim()))
      .filter((p) => !isNaN(p) && p > 0 && p <= 65535);

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        name,
        hostname: hostname || null,
        ip_address: ipAddress,
        device_type: deviceType,
        location: location || null,
        description: description || null,
        monitoring_interval_seconds: monitoringInterval,
        protocols,
        snmp_version: snmpVersion,
        snmp_port: snmpPort,
        snmp_community: snmpCommunity,
        tcp_check_ports: parsedPorts,
        http_health_url: httpUrl || null,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save device.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="noc-card rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0E1424]">
          <h2 className="text-lg font-bold font-sans text-white">
            {initialDevice ? 'Edit Monitored Device' : 'Add New Network Device'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-sm font-sans">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Device Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Switch Rack 1"
                required
                className="w-full noc-input px-3 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">IP Address *</label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                required
                className="w-full noc-input px-3 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Device Type</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="w-full noc-input px-3 py-2 rounded-lg text-sm"
              >
                <option value="ROUTER">ROUTER</option>
                <option value="SWITCH">SWITCH</option>
                <option value="ACCESS_POINT">ACCESS_POINT</option>
                <option value="SERVER">SERVER</option>
                <option value="PC">PC</option>
                <option value="PRINTER">PRINTER</option>
                <option value="FIREWALL">FIREWALL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Hostname / FQDN</label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="sw-core.school.net"
                className="w-full noc-input px-3 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Physical Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Server Room Rack A1"
                className="w-full noc-input px-3 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Polling Interval (seconds)</label>
              <input
                type="number"
                min="5"
                max="3600"
                value={monitoringInterval}
                onChange={(e) => setMonitoringInterval(parseInt(e.target.value) || 30)}
                className="w-full noc-input px-3 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          {/* Protocols selection */}
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">Enabled Monitoring Protocols</label>
            <div className="flex flex-wrap gap-2">
              {['ICMP', 'SNMP', 'TCP', 'HTTP'].map((proto) => {
                const active = protocols.includes(proto);
                return (
                  <button
                    type="button"
                    key={proto}
                    onClick={() => handleProtocolToggle(proto)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                        : 'bg-black/30 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {proto}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SNMP Settings if active */}
          {protocols.includes('SNMP') && (
            <div className="p-3.5 rounded-xl bg-black/30 border border-gray-800 space-y-3">
              <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider block">
                SNMP v2c Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Community String</label>
                  <input
                    type="text"
                    value={snmpCommunity}
                    onChange={(e) => setSnmpCommunity(e.target.value)}
                    className="w-full noc-input px-3 py-1.5 rounded text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">SNMP Port</label>
                  <input
                    type="number"
                    value={snmpPort}
                    onChange={(e) => setSnmpPort(parseInt(e.target.value) || 161)}
                    className="w-full noc-input px-3 py-1.5 rounded text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TCP / HTTP parameters */}
          {protocols.includes('TCP') && (
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">TCP Ports to Probe (comma-separated)</label>
              <input
                type="text"
                value={tcpPorts}
                onChange={(e) => setTcpPorts(e.target.value)}
                placeholder="80, 443, 22, 8291"
                className="w-full noc-input px-3 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          )}

          {protocols.includes('HTTP') && (
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">HTTP Health Check URL</label>
              <input
                type="text"
                value={httpUrl}
                onChange={(e) => setHttpUrl(e.target.value)}
                placeholder="http://192.168.1.20/health"
                className="w-full noc-input px-3 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          )}

          {/* Inline Connectivity Test Button & Result Box */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestConnectivity}
              disabled={isTesting || !ipAddress}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-cyan-400" />}
              <span>Test Connectivity Now</span>
            </button>

            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  testResult.icmp_reachable
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.icmp_reachable ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>Status: {testResult.overall_status}</span>
                </div>
                <div>ICMP RTT: {testResult.icmp_latency_ms != null ? `${testResult.icmp_latency_ms} ms` : 'Unreachable'} ({testResult.icmp_packet_loss}% loss)</div>
                {testResult.snmp_responsive && (
                  <div className="text-cyan-300">SNMP OK: {testResult.snmp_sys_descr || 'Responding'}</div>
                )}
                {Object.keys(testResult.tcp_results).length > 0 && (
                  <div>
                    TCP Ports:{' '}
                    {Object.entries(testResult.tcp_results)
                      .map(([p, ok]) => `${p}:${ok ? 'OPEN' : 'CLOSED'}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-mono transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.4)] transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialDevice ? 'Update Device' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
