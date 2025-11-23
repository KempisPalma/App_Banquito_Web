import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BanquitoProvider } from './context/BanquitoContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminUsers from './pages/AdminUsers';
import ProtectedRoute from './components/ProtectedRoute';

import Members from './pages/Members';
import Payments from './pages/Payments';
import Activities from './pages/Activities';
import Loans from './pages/Loans';

function App() {
  return (
    <BanquitoProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

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
            <ProtectedRoute requiredPermission="manage_payments">
              <Layout>
                <Payments />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/activities" element={
            <ProtectedRoute requiredPermission="manage_activities">
              <Layout>
                <Activities />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/loans" element={
            <ProtectedRoute requiredPermission="manage_loans">
              <Layout>
                <Loans />
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
        </Routes>
      </Router>
    </BanquitoProvider>
  );
}

export default App;
