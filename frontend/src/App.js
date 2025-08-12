import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LeadForm from './components/dashboard/LeadForm';
import DashboardLayout from './components/dashboard/DashboardLayout';
import { ToastContainer } from './components/Toast';

import ProductListPage from './app/products/page';
import AddProductPage from './app/products/add/page';
import ProductDetailsPage from './app/products/[id]/page';
import EditProductPage from './app/products/[id]/edit/page';
import ProductBrochurePage from './app/products/[id]/brochure/page';
import NotificationsPage from './app/notifications/page';
import CasesPage from './app/cases/page';
import ReportsPage from './app/reports/page';
import TicketsPage from './app/tickets/page';
import ServiceCustomersPage from './app/service-customers/page';
import PerformancePage from './app/performance/page';
import MaintenancePage from './app/maintenance/page';
import KnowledgeBasePage from './app/knowledge-base/page';
import QuotationsPage from './app/quotations/page';
import AccountsApprovalsPage from './app/quotations/pending-approvals';
import ApprovedPaymentsPage from './app/quotations/approved-payments';
import CreateQuotationPage from './app/quotations/create/page';
import QuotationDetailsPage from './app/quotations/[id]/page';
import EditQuotationPage from './app/quotations/[id]/edit/page';
import PaymentStatusPage from './app/quotations/[id]/payment-status';
import PaymentsPage from './app/payments/page';
import RemainingPaymentPage from './app/payments/remaining/page';
import PaymentSuccessPage from './app/dashboard/payment-success/page';
import OrdersPage from './app/orders/page';
import MyProductsPage from './app/my-products/page';
import Leads from './components/dashboard/Leads';
import InvoicePage from './app/invoice/[id]/page';
import PackagesPage from './app/packages/page';
import BundlesPage from './app/bundles/page';
import EnquiryPage from './app/enquiry/page';
import LeadAssignmentPage from './app/lead-assignment/page';
import PurchaseOrdersPage from './app/purchase-orders/page';
import PurchaseOrderDetailPage from './app/purchase-orders/[id]/page';
import TicketQueuePage from './app/ticket-queue/page';


function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          
          {/* Public routes */}
          <Route path="/quotations/:id/payment-status" element={<PaymentStatusPage />} />
          
          {/* Protected Invoice Route (top level, similar to dashboard but not nested in its layout) */}
          <Route 
            path="/invoice/:id" 
            element={ 
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'admin', 'sales_head']}>
                <InvoicePage />
              </ProtectedRoute>
            }
          />
          
                    <Route 
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'accounts_department']}>

                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            
            {/* Customer routes */}
            <Route path="payments" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="payments/remaining" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <RemainingPaymentPage />
              </ProtectedRoute>
            } />
            <Route path="payment-success" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <PaymentSuccessPage />
              </ProtectedRoute>
            } />
            <Route path="orders" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <OrdersPage />
              </ProtectedRoute>
            } />
            <Route path="my-products" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyProductsPage />
              </ProtectedRoute>
            } />
            <Route path="notifications" element={
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'inventory_manager', 'product_head', 'service_engineer', 'sales_head', 'accounts_department']}>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="tickets" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <TicketsPage />
              </ProtectedRoute>
            } />

            {/* Front Office Executive routes */}
            <Route path="enquiry" element={
              <ProtectedRoute allowedRoles={['front_office_executive']}>
                <EnquiryPage />
              </ProtectedRoute>
            } />
            <Route path="lead-assignment" element={
              <ProtectedRoute allowedRoles={['front_office_executive']}>
                <LeadAssignmentPage />
              </ProtectedRoute>
            } />

            {/* Other routes... */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="add-lead" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <LeadForm />
              </ProtectedRoute>
            } />
            <Route path="leads" element={
              <ProtectedRoute allowedRoles={['sales_person', 'front_office_executive', 'sales_head']}>
                <Leads />
              </ProtectedRoute>
            } />
            <Route path="edit-lead/:id" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <LeadForm />
              </ProtectedRoute>
            } />
            <Route path="products" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <ProductListPage />
              </ProtectedRoute>
            } />
            <Route path="products/add" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <AddProductPage />
              </ProtectedRoute>
            } />
            <Route path="products/:id/edit" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <EditProductPage />
              </ProtectedRoute>
            } />
            <Route path="bundles" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="bundles/create" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="bundles/:id/edit" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="purchase-orders" element={
              <ProtectedRoute allowedRoles={['product_head', 'marketing_coordinator']}>
                <PurchaseOrdersPage />
              </ProtectedRoute>
            } />
            <Route path="purchase-orders/:id" element={
              <ProtectedRoute allowedRoles={['product_head', 'marketing_coordinator']}>
                <PurchaseOrderDetailPage />
              </ProtectedRoute>
            } />
            <Route path="ticket-queue" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <TicketQueuePage />
              </ProtectedRoute>
            } />
            <Route path="maintenance" element={
              <ProtectedRoute allowedRoles={['product_head']}>
                <MaintenancePage />
              </ProtectedRoute>
            } />
            <Route path="cases" element={
              <ProtectedRoute allowedRoles={['service_engineer']}>
                <CasesPage />
              </ProtectedRoute>
            } />
            <Route path="service-customers" element={
              <ProtectedRoute allowedRoles={['service_engineer']}>
                <ServiceCustomersPage />
              </ProtectedRoute>
            } />
            <Route path="performance" element={
              <ProtectedRoute allowedRoles={['service_engineer']}>
                <PerformancePage />
              </ProtectedRoute>
            } />
            <Route path="quotations" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <QuotationsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/pending-approvals" element={
              <ProtectedRoute allowedRoles={['accounts_department']}>
                <AccountsApprovalsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/approved-payments" element={
              <ProtectedRoute allowedRoles={['accounts_department']}>
                <ApprovedPaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/create" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <CreateQuotationPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/:id" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <QuotationDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/:id/edit" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head']}>
                <EditQuotationPage />
              </ProtectedRoute>
            } />
            <Route path="packages" element={
              <ProtectedRoute allowedRoles={['sales_head']}>
                <PackagesPage />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;