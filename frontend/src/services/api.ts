import {
  User,
  Device,
  LiveDashboardMetrics,
  MonitoringSample,
  Alert,
  AlertThresholdsConfig,
  TopologyGraph,
  DiscoveredDevice,
  TroubleshootingReport,
  SLAReport,
  WebTarget,
  WebCheckResult,
  WebScanReport,
  StorageInfo,
  SystemActionResponse,
  TracerouteReport,
  DNSBenchmarkReport,
  SpeedtestReport,
  InterfaceStatsReport,
  PortAuditReport,
  ConfigBackup,
  ConfigDiffResponse,
  HostSystemStats,
  AuditLogItem,
  AuditLogListResponse,
} from '../types';

const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('netscope_access_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // If unauthorized and not already on login/register, clear token and trigger auth event
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('netscope_access_token');
        localStorage.removeItem('netscope_user');
        window.dispatchEvent(new Event('netscope-unauthorized'));
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      let errMsg = `Request failed (${res.status}): ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (typeof errJson.detail === 'string') {
          errMsg = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          errMsg = errJson.detail
            .map((item: any) => (typeof item === 'object' ? item.msg || JSON.stringify(item) : String(item)))
            .join(', ');
        } else if (errJson.message && typeof errJson.message === 'string') {
          errMsg = errJson.message;
        } else if (errJson.detail) {
          errMsg = JSON.stringify(errJson.detail);
        }
      } catch (_) {}
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Avatar Upload
  async uploadAvatar(file: File): Promise<User> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/users/profile/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Upload failed (${res.status}): ${res.statusText}`;
      try {
        const errJson = await res.json();
        errMsg = typeof errJson.detail === 'string' ? errJson.detail : errJson.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Auth
  async login(username_or_email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
  }

  async register(data: { full_name: string; username: string; email: string; password: string }) {
    return this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  // Users & Profile
  async getProfile() {
    return this.request<User>('/users/profile');
  }

  async updateProfile(data: { full_name?: string; email?: string }) {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { old_password: string; new_password: string }) {
    return this.request<{ message: string }>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listUsers() {
    return this.request<User[]>('/users');
  }

  async createUser(data: { username: string; email: string; full_name: string; role: string; password: string }) {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(userId: string, data: { full_name?: string; email?: string; role?: string; is_active?: boolean }) {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string) {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteUsers(ids: string[]) {
    return this.request<SystemActionResponse>('/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async resetUserPassword(userId: string, new_password: string) {
    return this.request<{ message: string }>(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password }),
    });
  }

  // Devices
  async listDevices(params?: { device_type?: string; status?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.device_type) q.append('device_type', params.device_type);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Device[]>(`/devices${qs}`);
  }

  async getDevice(id: number) {
    return this.request<Device>(`/devices/${id}`);
  }

  async createDevice(data: any) {
    return this.request<Device>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDevice(id: number, data: any) {
    return this.request<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDevice(id: number) {
    return this.request<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteDevices(ids: number[]) {
    return this.request<SystemActionResponse>('/devices/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async toggleMaintenance(id: number) {
    return this.request<Device>(`/devices/${id}/toggle-maintenance`, {
      method: 'POST',
    });
  }

  async testConnectivity(data: any) {
    return this.request<any>('/devices/test-connectivity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async livePing(deviceId: number) {
    return this.request<any>(`/devices/${deviceId}/live-ping`, {
      method: 'POST',
    });
  }

  // Monitoring
  async getDashboardMetrics() {
    return this.request<LiveDashboardMetrics>('/monitoring/dashboard-metrics');
  }

  async getDeviceSamples(deviceId: number, range: '1h' | '6h' | '24h' | '7d' = '1h') {
    return this.request<MonitoringSample[]>(`/monitoring/samples/${deviceId}?range_str=${range}`);
  }

  async getThroughputHistory() {
    return this.request<any[]>('/monitoring/throughput-history');
  }

  async getNetworkEvents(deviceId?: number) {
    const qs = deviceId ? `?device_id=${deviceId}` : '';
    return this.request<any[]>(`/monitoring/events${qs}`);
  }

  // Alerts
  async listAlerts(params?: { severity?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.severity) q.append('severity', params.severity);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Alert[]>(`/alerts${qs}`);
  }

  async acknowledgeAlert(id: number, note?: string) {
    return this.request<Alert>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async resolveAlert(id: number) {
    return this.request<Alert>(`/alerts/${id}/resolve`, {
      method: 'POST',
    });
  }

  async muteAlert(id: number) {
    return this.request<Alert>(`/alerts/${id}/mute`, {
      method: 'POST',
    });
  }

  async deleteAlert(id: number) {
    return this.request<SystemActionResponse>(`/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteAlerts(ids: number[]) {
    return this.request<SystemActionResponse>('/alerts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async purgeResolvedAlerts() {
    return this.request<SystemActionResponse>('/alerts/purge-resolved', {
      method: 'DELETE',
    });
  }

  async getAlertThresholds() {
    return this.request<AlertThresholdsConfig>('/alerts/thresholds');
  }

  async updateAlertThresholds(data: AlertThresholdsConfig) {
    return this.request<AlertThresholdsConfig>('/alerts/thresholds', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Topology
  async getTopology() {
    return this.request<TopologyGraph>('/topology');
  }

  async saveTopologyLayout(nodes: { id: number; pos_x: number; pos_y: number }[]) {
    return this.request<{ message: string }>('/topology/save-layout', {
      method: 'POST',
      body: JSON.stringify({ nodes }),
    });
  }

  async createConnection(data: any) {
    return this.request<any>('/topology/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteConnection(id: number) {
    return this.request<any>(`/topology/connections/${id}`, {
      method: 'DELETE',
    });
  }

  // Discovery
  async scanSubnet(subnet: string, scan_ports?: number[], timeout_seconds?: number) {
    return this.request<DiscoveredDevice[]>('/discovery/scan', {
      method: 'POST',
      body: JSON.stringify({ subnet, scan_ports, timeout_seconds }),
    });
  }

  async bulkAddDevices(devices: DiscoveredDevice[]) {
    return this.request<{ message: string }>('/discovery/bulk-add', {
      method: 'POST',
      body: JSON.stringify({ devices }),
    });
  }

  // Troubleshooting
  async runTroubleshooting(deviceId: number) {
    return this.request<TroubleshootingReport>('/troubleshooting/run', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  }

  // Reports
  async getSLAReport(period: '24h' | '7d' | '30d' = '24h') {
    return this.request<SLAReport>(`/reports/sla?period=${period}`);
  }

  async getExportData(period: string = '24h') {
    return this.request<any>(`/reports/export?period=${period}`);
  }

  // System Storage Maintenance
  async getStorageInfo() {
    return this.request<StorageInfo>('/system/storage-info');
  }

  async purgeSamples(daysOlderThan: number = 7, purgeAll: boolean = false) {
    return this.request<SystemActionResponse>('/system/purge-samples', {
      method: 'POST',
      body: JSON.stringify({ days_older_than: daysOlderThan, purge_all: purgeAll }),
    });
  }

  async purgeAlerts(onlyResolved: boolean = true, daysOlderThan?: number) {
    return this.request<SystemActionResponse>('/system/purge-alerts', {
      method: 'POST',
      body: JSON.stringify({ only_resolved: onlyResolved, days_older_than: daysOlderThan }),
    });
  }

  async purgeEvents(daysOlderThan: number = 14) {
    return this.request<SystemActionResponse>('/system/purge-events', {
      method: 'POST',
      body: JSON.stringify({ days_older_than: daysOlderThan }),
    });
  }

  async vacuumDatabase() {
    return this.request<SystemActionResponse>('/system/vacuum', {
      method: 'POST',
    });
  }

  // Web Sentinel & Cyber Security
  async listWebTargets() {
    return this.request<WebTarget[]>('/web-sentinel/targets');
  }

  async getWebTarget(id: number) {
    return this.request<WebTarget>(`/web-sentinel/targets/${id}`);
  }

  async createWebTarget(data: {
    name: string;
    url: string;
    check_interval_seconds?: number;
    expected_status_code?: number;
    timeout_seconds?: number;
  }) {
    return this.request<WebTarget>('/web-sentinel/targets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebTarget(id: number, data: Partial<WebTarget>) {
    return this.request<WebTarget>(`/web-sentinel/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebTarget(id: number) {
    return this.request<{ message: string }>(`/web-sentinel/targets/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteWebTargets(ids: number[]) {
    return this.request<SystemActionResponse>('/web-sentinel/targets/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async probeWebTarget(id: number) {
    return this.request<WebCheckResult>(`/web-sentinel/targets/${id}/probe`, {
      method: 'POST',
    });
  }

  async scanUrlLive(url: string) {
    return this.request<WebScanReport>('/web-sentinel/scan', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // --- Advanced Diagnostics & Telemetry ---
  async runTraceroute(target: string, max_hops: number = 30) {
    return this.request<TracerouteReport>('/diagnostics/traceroute', {
      method: 'POST',
      body: JSON.stringify({ target, max_hops }),
    });
  }

  async runDNSBenchmark(domain: string = 'google.com') {
    return this.request<DNSBenchmarkReport>('/diagnostics/dns-benchmark', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  async runSpeedtest() {
    return this.request<SpeedtestReport>('/diagnostics/speedtest', {
      method: 'POST',
    });
  }

  async getInterfaceStats() {
    return this.request<InterfaceStatsReport>('/diagnostics/interface-stats');
  }

  async getHostSystemStats() {
    return this.request<HostSystemStats>('/monitoring/host-system-stats');
  }

  // --- Security Hub & Config Auditor ---
  async auditDevicePorts(target: string, custom_ports?: number[]) {
    return this.request<PortAuditReport>('/security/port-audit', {
      method: 'POST',
      body: JSON.stringify({ target, custom_ports }),
    });
  }

  async listConfigBackups(deviceId?: number) {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.request<ConfigBackup[]>(`/security/config-backups${query}`);
  }

  async createConfigBackup(data: {
    backup_name: string;
    device_id?: number;
    device_name?: string;
    config_content: string;
    description?: string;
  }) {
    return this.request<ConfigBackup>('/security/config-backups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConfigBackup(id: number) {
    return this.request<ConfigBackup>(`/security/config-backups/${id}`);
  }

  async deleteConfigBackup(id: number) {
    return this.request<{ message: string }>(`/security/config-backups/${id}`, {
      method: 'DELETE',
    });
  }

  async diffConfigBackups(backup_id_a: number, backup_id_b: number) {
    return this.request<ConfigDiffResponse>('/security/config-backups/diff', {
      method: 'POST',
      body: JSON.stringify({ backup_id_a, backup_id_b }),
    });
  }

  // System Audit & Activity Logs
  async listAuditLogs(search?: string, action?: string, limit = 100, offset = 0) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (action) params.append('action', action);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request<AuditLogListResponse>(`/system/audit-logs?${params.toString()}`);
  }

  async deleteAuditLog(logId: number) {
    return this.request<SystemActionResponse>(`/system/audit-logs/${logId}`, {
      method: 'DELETE',
    });
  }

  async clearAuditLogs(daysOlderThan?: number) {
    const query = daysOlderThan !== undefined ? `?days_older_than=${daysOlderThan}` : '';
    return this.request<SystemActionResponse>(`/system/audit-logs${query}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
