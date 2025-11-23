import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BanquitoProvider } from './context/BanquitoContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

import Members from './pages/Members';

// Placeholders for other pages
import Payments from './pages/Payments';

import Activities from './pages/Activities';
import Loans from './pages/Loans';

function App() {
  return (
    <BanquitoProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/loans" element={<Loans />} />
          </Routes>
        </Layout>
      </Router>
    </BanquitoProvider>
  );
}

export default App;
