import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import CompaniesDrivesPage from './pages/CompaniesDrivesPage';
import OffersPage from './pages/OffersPage';
import PolicyEnginePage from './pages/PolicyEnginePage';
import PolicyReviewsPage from './pages/PolicyReviewsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DemoGuidePage from './pages/DemoGuidePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#070c18', color: 'white', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>NFSU PlacementGuard</div>
          <div style={{ fontSize: '13px', color: 'var(--cyan-bright)' }}>Authenticating secure session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleExportCsv = () => {
    window.location.href = '/api/stats/export-csv';
  };

  return (
    <div className="app-layout">
      {/* Dark Navy Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onRefresh={handleRefresh}
          onExportCsv={handleExportCsv}
        />

        {/* Dynamic Content Viewport */}
        <main className="content-viewport" key={refreshKey}>
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'students' && <StudentsPage />}
          {activeTab === 'companies' && <CompaniesDrivesPage />}
          {activeTab === 'offers' && <OffersPage />}
          {activeTab === 'policy' && <PolicyEnginePage />}
          {activeTab === 'reviews' && <PolicyReviewsPage />}
          {activeTab === 'audit' && <AuditLogsPage />}
          {activeTab === 'demo-guide' && <DemoGuidePage setActiveTab={setActiveTab} />}
        </main>
      </div>
    </div>
  );
}
