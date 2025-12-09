
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BanquitoProvider } from './context/BanquitoContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Activities from './pages/Activities';
import Loans from './pages/Loans';
import AdminUsers from './pages/AdminUsers';
import GeneralReport from './pages/GeneralReport';
import MemberRegister from './pages/MemberRegister';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BanquitoProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<MemberRegister />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/members" element={
              <ProtectedRoute requiredPermission="manage_members">
                <Layout>
                  <Members />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments" element={
              <ProtectedRoute>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/activities" element={
              <ProtectedRoute>
                <Layout>
                  <Activities />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/loans" element={
              <ProtectedRoute>
                <Layout>
                  <Loans />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/report" element={
              <ProtectedRoute>
                <Layout>
                  <GeneralReport />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredPermission="admin">
                <Layout>
                  <AdminUsers />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BanquitoProvider>
    </ErrorBoundary>
  );
}

export default App;
