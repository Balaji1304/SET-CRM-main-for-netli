import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LeadForm from './components/dashboard/LeadForm';

import ProductListPage from './app/products/page';
import AddProductPage from './app/products/add/page';
import ProductDetailsPage from './app/products/[id]/page';
import { useParams } from 'react-router-dom';
// import { Input } from '../../components/ui/input';
// import { Button } from '../../components/ui/button';
// import { Label } from '../../components/ui/label';
// import { Textarea } from '../../components/ui/textarea';

import Leads from './components/dashboard/Leads';
import EditProductPage from './app/products/[id]/edit/page';
import ProductBrochurePage from './app/products/[id]/brochure/page';
import NotificationsPage from './app/notifications/page';
import ReportsPage from './app/reports/page';
import TicketsPage from './app/tickets/page';
import SchedulePage from './app/schedule/page';
import ServiceCustomersPage from './app/service-customers/page';
import PerformancePage from './app/performance/page';
import MaintenancePage from './app/maintenance/page';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'sales_representative', 'inventory_manager', 'product_head', 'service_engineer']}>
                <Dashboard />
              </ProtectedRoute>
            }
          >

            <Route path="leads" element={<Leads />} />
            <Route path="add-lead" element={<LeadForm />} />
            <Route path="edit-lead/:id" element={<LeadForm />} />

            <Route path="products" element={<ProductListPage />} />
            <Route path="products/add" element={<AddProductPage />} />
            <Route path="products/:id/edit" element={<EditProductPage />} />
            <Route path="products/:id/brochure" element={<ProductBrochurePage />} />
            <Route path="products/:id" element={<ProductDetailsPage />} />

            <Route path='add-lead' element={<LeadForm />} />
            <Route path="leads" element={<Leads />} />
            <Route path="edit-lead/:id" element={<LeadForm />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="service-customers" element={<ServiceCustomersPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="maintenance" element={<MaintenancePage />} />

          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 