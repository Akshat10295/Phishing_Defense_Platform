import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/ui/Layout';
import Dashboard from './pages/Dashboard';
import URLScanner from './pages/URLScanner';
import EmailScanner from './pages/EmailScanner';
import IncidentLogs from './pages/IncidentLogs';
import AttackHeatmap from './pages/AttackHeatmap';
import Login from './pages/Login';
import useAppStore from './store/useAppStore';

// Simple Route Guard to protect sensitive internal dashboards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Placeholder page elements for auxiliary layout screens
const PlaceholderScreen = ({ title }) => (
  <div className="space-y-4">
    <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
    <div className="glass-panel p-8 rounded-xl text-center space-y-3">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center mx-auto text-cyber-muted font-bold text-lg font-mono">i</div>
      <h3 className="font-bold text-base">Module Provisioning Pending</h3>
      <p className="text-sm text-cyber-muted max-w-md mx-auto">This security component is mapped in the system design schema and will be fully active in subsequent phases.</p>
    </div>
  </div>
);

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
          <Route path="settings" element={<PlaceholderScreen title="SentinelAI Engine Configuration" />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
