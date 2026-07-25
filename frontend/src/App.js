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
import PerformancePage from './app/performance/page';
import MaintenancePage from './app/maintenance/page';
import KnowledgeBasePage from './app/knowledge-base/page';
import QuotationsPage from './app/quotations/page';
import CustomersPage from './app/customers/page';
import AccountsApprovalsPage from './app/quotations/pending-approvals';
import ApprovedPaymentsPage from './app/quotations/approved-payments';
import CreateQuotationPage from './app/quotations/create/page';
import QuotationDetailsPage from './app/quotations/[id]/page';
import EditQuotationPage from './app/quotations/[id]/edit/page';
import PaymentStatusPage from './app/quotations/[id]/payment-status';
import PrivacyPolicyPage from './app/privacy-policy/page';
import PaymentsPage from './app/payments/page';
import RemainingPaymentPage from './app/payments/remaining/page';
import PaymentSuccessPage from './app/dashboard/payment-success/page';
import OrdersPage from './app/orders/page';
import MyProductsPage from './app/my-products/page';
import Leads from './components/dashboard/Leads';
import ProformaInvoicePage from './app/invoice/[id]/page';
import PackagesPage from './app/packages/page';
import BundlesPage from './app/bundles/page';
import EnquiryPage from './app/enquiry/page';
import SalesReportsPage from './app/sales-reports/page';
import ServiceReportsPage from './app/service-reports/page';
import LeadAssignmentPage from './app/lead-assignment/page';
import PurchaseOrdersPage from './app/purchase-orders/page';
import PurchaseOrderDetailPage from './app/purchase-orders/[id]/page';
import TicketQueuePage from './app/ticket-queue/page';
import InstallationDashboard from './app/installations/page';
import InstallationComplete from './app/installations/[id]/complete/page';
import InstallationCompletedSummary from './app/installations/[id]/completed/page';
import CustomerSignoff from './app/installations/[id]/signoff/page';
import UserManagementPage from './app/user-management/page';


function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          
          {/* Public routes */}
          <Route path="/quotations/:id/payment-status" element={<PaymentStatusPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
          {/* Protected Proforma Invoice Route (top level, similar to dashboard but not nested in its layout) */}
          <Route 
            path="/invoice/:id" 
            element={ 
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'admin', 'sales_head']}>
                <ProformaInvoicePage />
              </ProtectedRoute>
            }
          />
          
                    <Route 
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'accounts_department', 'admin']}>

                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            
            {/* Customer routes */}
            <Route path="payments" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="payments/remaining" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <RemainingPaymentPage />
              </ProtectedRoute>
            } />
            <Route path="payment-success" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <PaymentSuccessPage />
              </ProtectedRoute>
            } />
            <Route path="orders" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <OrdersPage />
              </ProtectedRoute>
            } />
            <Route path="my-products" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <MyProductsPage />
              </ProtectedRoute>
            } />
            <Route path="notifications" element={
              <ProtectedRoute allowedRoles={['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'accounts_department', 'admin']}>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="tickets" element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <TicketsPage />
              </ProtectedRoute>
            } />

            {/* Front Office Executive routes */}
            <Route path="enquiries" element={
              <ProtectedRoute allowedRoles={['front_office_executive', 'admin']}>
                <LeadAssignmentPage />
              </ProtectedRoute>
            } />
            <Route path="enquiries/create" element={
              <ProtectedRoute allowedRoles={['front_office_executive', 'admin']}>
                <EnquiryPage />
              </ProtectedRoute>
            } />
            <Route path="enquiry/:id/edit" element={
              <ProtectedRoute allowedRoles={['front_office_executive', 'admin']}>
                <EnquiryPage />
              </ProtectedRoute>
            } />

            {/* Other routes... */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="add-lead" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <LeadForm />
              </ProtectedRoute>
            } />
            <Route path="leads" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <Leads />
              </ProtectedRoute>
            } />
            <Route path="edit-lead/:id" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <LeadForm />
              </ProtectedRoute>
            } />
            <Route path="products" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <ProductListPage />
              </ProtectedRoute>
            } />
            <Route path="products/add" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <AddProductPage />
              </ProtectedRoute>
            } />
            <Route path="products/:id/edit" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <EditProductPage />
              </ProtectedRoute>
            } />
            <Route path="bundles" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="bundles/create" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="bundles/:id/edit" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <BundlesPage />
              </ProtectedRoute>
            } />
            <Route path="purchase-orders" element={
              <ProtectedRoute allowedRoles={['product_head', 'marketing_coordinator', 'admin']}>
                <PurchaseOrdersPage />
              </ProtectedRoute>
            } />
            <Route path="purchase-orders/:id" element={
              <ProtectedRoute allowedRoles={['product_head', 'marketing_coordinator', 'admin']}>
                <PurchaseOrderDetailPage />
              </ProtectedRoute>
            } />
            <Route path="ticket-queue" element={
              <ProtectedRoute allowedRoles={['front_office_executive', 'admin']}>
                <TicketQueuePage />
              </ProtectedRoute>
            } />
            <Route path="maintenance" element={
              <ProtectedRoute allowedRoles={['product_head', 'admin']}>
                <MaintenancePage />
              </ProtectedRoute>
            } />
            <Route path="cases" element={
              <ProtectedRoute allowedRoles={['service_engineer']}>
                <CasesPage />
              </ProtectedRoute>
            } />
            <Route path="installations" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'admin']}>
                <InstallationDashboard />
              </ProtectedRoute>
            } />
            <Route path="installations/:id/complete" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'admin']}>
                <InstallationComplete />
              </ProtectedRoute>
            } />
            <Route path="installations/:id/completed" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'admin']}>
                <InstallationCompletedSummary />
              </ProtectedRoute>
            } />
            <Route path="installations/:id/signoff" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'admin']}>
                <CustomerSignoff />
              </ProtectedRoute>
            } />
            <Route path="performance" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'admin']}>
                <PerformancePage />
              </ProtectedRoute>
            } />
            <Route path="quotations" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <QuotationsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/pending-approvals" element={
              <ProtectedRoute allowedRoles={['accounts_department', 'admin']}>
                <AccountsApprovalsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/approved-payments" element={
              <ProtectedRoute allowedRoles={['accounts_department', 'admin']}>
                <ApprovedPaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/create" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <CreateQuotationPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/:id" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <QuotationDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="quotations/:id/edit" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <EditQuotationPage />
              </ProtectedRoute>
            } />
            <Route path="customers" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <CustomersPage />
              </ProtectedRoute>
            } />
            <Route path="sales-reports" element={
              <ProtectedRoute allowedRoles={['sales_person', 'sales_head', 'marketing_coordinator', 'admin']}>
                <SalesReportsPage />
              </ProtectedRoute>
            } />
            <Route path="service-reports" element={
              <ProtectedRoute allowedRoles={['service_engineer', 'product_head']}>
                <ServiceReportsPage />
              </ProtectedRoute>
            } />
            <Route path="packages" element={
              <ProtectedRoute allowedRoles={['sales_head', 'admin']}>
                <PackagesPage />
              </ProtectedRoute>
            } />
            <Route path="user-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
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