export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export type DeviceType = 
  | 'ROUTER' 
  | 'SWITCH' 
  | 'ACCESS_POINT' 
  | 'SERVER' 
  | 'PC' 
  | 'PRINTER' 
  | 'FIREWALL' 
  | 'OTHER';

export type DeviceStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE' | 'UNKNOWN';

export interface DeviceInterface {
  id: number;
  device_id: number;
  if_index: number;
  name: string;
  mac_address?: string | null;
  oper_status: 'UP' | 'DOWN';
  speed_bps: number;
  prev_in_octets: number;
  curr_in_octets: number;
  prev_out_octets: number;
  curr_out_octets: number;
  rx_bps: number;
  tx_bps: number;
  errors_in: number;
  errors_out: number;
  updated_at: string;
}

export interface Device {
  id: number;
  name: string;
  hostname?: string | null;
  ip_address: string;
  device_type: DeviceType;
  location?: string | null;
  description?: string | null;
  is_monitored: boolean;
  monitoring_interval_seconds: number;
  protocols: string[];
  snmp_version: string;
  snmp_port: number;
  snmp_community: string;
  tcp_check_ports: number[];
  http_health_url?: string | null;
  status: DeviceStatus;
  uptime_seconds: number;
  consecutive_failures: number;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
  interfaces: DeviceInterface[];
  current_latency_ms?: number | null;
  current_packet_loss_pct?: number | null;
}

export interface LiveDashboardMetrics {
  total_devices: number;
  devices_up: number;
  devices_degraded: number;
  devices_down: number;
  devices_maintenance: number;
  sla_uptime_pct: number;
  fleet_avg_latency_ms: number;
  global_packet_loss_pct: number;
  total_rx_bps: number;
  total_tx_bps: number;
  active_critical_alerts_count: number;
  demo_mode: boolean;
}

export interface MonitoringSample {
  id: number;
  device_id: number;
  timestamp: string;
  status: string;
  latency_ms: number | null;
  packet_loss_pct: number;
  cpu_usage_pct: number | null;
  memory_usage_pct: number | null;
  rx_bps_total: number;
  tx_bps_total: number;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'RECOVERY';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'MUTED';

export interface Alert {
  id: number;
  device_id: number;
  device_name?: string;
  device_ip?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface AlertThresholdsConfig {
  consecutive_failures_down: number;
  high_latency_threshold_ms: number;
  high_packet_loss_pct: number;
  high_cpu_threshold_pct: number;
  high_memory_threshold_pct: number;
}

export interface TopologyNode {
  id: number;
  device_id: number;
  pos_x: number;
  pos_y: number;
  label: string;
  device_name?: string;
  device_type?: DeviceType;
  ip_address?: string;
  status?: DeviceStatus;
}

export interface TopologyConnection {
  id: number;
  source_node_id: number;
  target_node_id: number;
  source_interface?: string | null;
  target_interface?: string | null;
  link_type: 'ETHERNET' | 'FIBER' | 'WIRELESS';
  link_status: string;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  connections: TopologyConnection[];
}

export interface DiscoveredDevice {
  ip_address: string;
  hostname?: string | null;
  is_alive: boolean;
  latency_ms?: number | null;
  open_ports: number[];
  suggested_type: DeviceType;
  already_monitored: boolean;
}

export interface DiagnosticStep {
  step_id: string;
  title: string;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'SKIPPED';
  duration_ms: number;
  message: string;
  details: Record<string, any>;
}

export interface TroubleshootingReport {
  device_id: number;
  device_name: string;
  ip_address: string;
  executed_at: string;
  overall_verdict: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  steps: DiagnosticStep[];
  root_cause_analysis: string;
  recommendations: string[];
}

export interface SLAReport {
  period: string;
  generated_at: string;
  overall_sla_pct: number;
  total_monitored_devices: number;
  healthy_devices_count: number;
  unhealthy_devices_count: number;
  outage_summary: {
    total_outages: number;
    mean_time_to_repair_minutes: number;
    longest_outage_minutes: number;
  };
  top_flapping_devices: {
    device_id: number;
    device_name: string;
    ip_address: string;
    flap_count: number;
    last_event_time: string;
    current_status: string;
  }[];
  average_fleet_latency_ms: number;
  average_packet_loss_pct: number;
}

export type WebStatus = 'ONLINE' | 'DEGRADED' | 'DOWN';

export interface WebCheckResult {
  id: number;
  target_id: number;
  timestamp: string;
  status: WebStatus;
  http_status?: number | null;
  response_time_ms?: number | null;
  dns_lookup_ms?: number | null;
  content_length?: number | null;
  server_header?: string | null;
  ssl_valid?: boolean | null;
  ssl_issuer?: string | null;
  ssl_expires_at?: string | null;
  ssl_days_remaining?: number | null;
  security_score?: string | null;
  security_headers?: Record<string, any> | null;
  threat_indicators?: string[] | null;
  recommendations?: string[] | null;
  error_message?: string | null;
  resolved_ip?: string | null;
  tls_version?: string | null;
  cipher_suite?: string | null;
  http_version?: string | null;
  redirect_chain?: string[] | null;
  raw_headers?: Record<string, string> | null;
  payload_size_kb?: number | null;
}

export interface WebTarget {
  id: number;
  user_id?: string | null;
  name: string;
  url: string;
  resolved_ip?: string | null;
  check_interval_seconds: number;
  is_active: boolean;
  expected_status_code: number;
  timeout_seconds: number;
  created_at: string;
  latest_result?: WebCheckResult | null;
  history?: WebCheckResult[] | null;
}

export interface WebScanReport {
  url: string;
  is_online: boolean;
  status: WebStatus;
  http_status?: number | null;
  response_time_ms?: number | null;
  dns_lookup_ms?: number | null;
  content_length?: number | null;
  server_header?: string | null;
  ssl_valid?: boolean | null;
  ssl_issuer?: string | null;
  ssl_expires_at?: string | null;
  ssl_days_remaining?: number | null;
  security_score: string;
  security_headers: Record<string, any>;
  threat_indicators: string[];
  recommendations: string[];
  error_message?: string | null;
  resolved_ip?: string | null;
  tls_version?: string | null;
  cipher_suite?: string | null;
  http_version?: string | null;
  redirect_chain?: string[] | null;
  raw_headers?: Record<string, string> | null;
  payload_size_kb?: number | null;
}

export interface StorageInfo {
  db_size_mb: number;
  samples_count: number;
  alerts_count: number;
  resolved_alerts_count: number;
  events_count: number;
  audit_logs_count: number;
  devices_count: number;
  web_targets_count: number;
}

export interface SystemActionResponse {
  success: boolean;
  message: string;
  deleted_count: number;
  freed_bytes?: number | null;
}

// Diagnostics Suite Types
export interface TracerouteHop {
  hop: number;
  ip_address?: string | null;
  hostname?: string | null;
  rtt_ms?: number | null;
  packet_loss_pct: number;
  status: 'REACHABLE' | 'TIMEOUT' | 'ANOMALY';
}

export interface TracerouteReport {
  target: string;
  target_ip?: string | null;
  total_hops: number;
  destination_reached: boolean;
  total_time_ms: number;
  hops: TracerouteHop[];
  verdict: string;
}

export interface DNSRecordItem {
  record_type: string;
  values: string[];
  ttl?: number | null;
}

export interface DNSResolverBenchmark {
  resolver_name: string;
  resolver_ip: string;
  latency_ms?: number | null;
  status: 'HEALTHY' | 'SLOW' | 'UNREACHABLE';
  resolved_ip?: string | null;
}

export interface DNSBenchmarkReport {
  domain: string;
  canonical_ip?: string | null;
  query_timestamp: string;
  records: DNSRecordItem[];
  resolver_benchmarks: DNSResolverBenchmark[];
  anti_spoofing_status: 'VERIFIED' | 'MISMATCH_DETECTED' | 'WARNING';
  notes: string[];
}

export interface SpeedtestReport {
  download_mbps: number;
  upload_mbps: number;
  latency_ms: number;
  jitter_ms: number;
  bufferbloat_grade: string;
  bytes_transferred_mb: number;
  duration_seconds: number;
  isp_rating: string;
}

export interface InterfaceStat {
  interface_name: string;
  bytes_sent_rate_kbps: number;
  bytes_recv_rate_kbps: number;
  packets_sent_rate_pps: number;
  packets_recv_rate_pps: number;
  drop_in_total: number;
  drop_out_total: number;
  error_in_total: number;
  error_out_total: number;
  is_up: boolean;
  storm_detected: boolean;
  storm_severity?: 'WARNING' | 'CRITICAL' | null;
}

export interface InterfaceStatsReport {
  timestamp: string;
  total_interfaces: number;
  active_interfaces: number;
  interfaces: InterfaceStat[];
  global_storm_alert: boolean;
}

// Security Hub Types
export interface VulnerabilityItem {
  port: number;
  service_name: string;
  is_open: boolean;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  cve_reference?: string | null;
  vulnerability_title: string;
  description: string;
  remediation_steps: string;
}

export interface PortAuditReport {
  target: string;
  target_ip: string;
  scan_timestamp: string;
  duration_seconds: number;
  total_ports_scanned: number;
  open_ports_count: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  security_score: number;
  overall_verdict: 'SECURE' | 'WARNING' | 'AT_RISK' | 'COMPROMISED';
  vulnerabilities: VulnerabilityItem[];
  hardening_advisories: string[];
}

export interface ConfigBackup {
  id: number;
  backup_name: string;
  device_id?: number | null;
  device_name: string;
  config_content: string;
  file_size_bytes: number;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface ConfigDiffResponse {
  backup_a_name: string;
  backup_b_name: string;
  diff_lines: string[];
  added_lines_count: number;
  removed_lines_count: number;
  identical: boolean;
}

export interface HostSystemStats {
  cpu_percent: number;
  cpu_cores_count: number;
  ram_total_mb: number;
  ram_used_mb: number;
  ram_free_mb: number;
  ram_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_percent: number;
  os_name: string;
  host_uptime_seconds: number;
  net_bytes_sent_rate_kbps: number;
  net_bytes_recv_rate_kbps: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: string | null;
  username?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  logs: AuditLogItem[];
  total: number;
}
