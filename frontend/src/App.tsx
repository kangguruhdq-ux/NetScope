import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';
import { TopologyPage } from './pages/TopologyPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { TroubleshootingPage } from './pages/TroubleshootingPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { WebSentinelPage } from './pages/WebSentinelPage';
import { SecurityHubPage } from './pages/SecurityHubPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-cyan-400 font-mono text-sm">
        Initializing NetScope NOC Environment...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <ToastProvider>
            <Routes>
              {/* Unified 3D Animated Auth Routes */}
              <Route path="/login" element={<AuthPage initialMode="login" />} />
              <Route path="/register" element={<AuthPage initialMode="register" />} />

              {/* Protected NOC Application Shell (100% Live Production Mode) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell demoMode={false} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="devices" element={<DevicesPage />} />
                <Route path="devices/:id" element={<DeviceDetailPage />} />
                <Route path="topology" element={<TopologyPage />} />
                <Route path="discovery" element={<DiscoveryPage />} />
                <Route path="troubleshooting" element={<TroubleshootingPage />} />
                <Route path="security-hub" element={<SecurityHubPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="web-sentinel" element={<WebSentinelPage />} />
                <Route path="reports" element={<ReportsPage />} />

                {/* Safeguard 4: /profile is accessible by all roles and NEVER redirects to /dashboard */}
                <Route path="profile" element={<ProfilePage />} />

                {/* Global Settings (Admin Only) */}
                <Route
                  path="settings"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
