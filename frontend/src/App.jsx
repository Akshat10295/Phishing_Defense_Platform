import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/ui/Layout';
import Dashboard from './pages/Dashboard';
import URLScanner from './pages/URLScanner';
import EmailScanner from './pages/EmailScanner';
import IncidentLogs from './pages/IncidentLogs';
import AttackHeatmap from './pages/AttackHeatmap';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';
import useAppStore from './store/useAppStore';

// Simple Route Guard to protect sensitive internal dashboards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Shell Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="url-scanner" element={<URLScanner />} />
          <Route path="email-scanner" element={<EmailScanner />} />
          <Route path="history" element={<IncidentLogs />} />
          <Route path="heatmap" element={<AttackHeatmap />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
