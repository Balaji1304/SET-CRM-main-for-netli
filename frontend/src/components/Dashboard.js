import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock, CheckCircle2, Ticket, Users, DollarSign, Package, Briefcase, BarChart2, Settings, AlertTriangle, ShoppingCart, ListChecks, UserCheck, FileText, Users2, PackageSearch, UserCog, TrendingUp
} from 'lucide-react';
import axios from 'axios';

const formatNumber = (num) => {
  if (num === 'N/A' || num === undefined || num === null) return 'N/A';
  if (typeof num !== 'number') {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return num;
    num = parsed;
  }
  return num.toLocaleString('en-IN');
};

const Dashboard = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchCountRef = useRef(0);
  const initialAuthLoadingRef = useRef(authLoading);

  useEffect(() => {
    fetchCountRef.current = 0;
  }, [user, token]);

  useEffect(() => {
    if (authLoading) {
        setLoading(true);
        return;
    }
    if (initialAuthLoadingRef.current && !authLoading) {
        initialAuthLoadingRef.current = false;
    }

    const fetchDashboardData = async () => {
      if (!user || !token) {
        setLoading(false);
        setError('User not authenticated. Please login again.');
        return;
      }
      if (fetchCountRef.current > 0 && summaryData) {
        setLoading(false);
        return;
      }
      fetchCountRef.current += 1;
      try {
        setLoading(true);
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/dashboard/summary`, config);
        if (data.success) {
          setSummaryData(data.data);
          setError(null);
        } else {
          setError(data.message || 'Failed to fetch dashboard data.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'An error occurred while fetching dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    if (!initialAuthLoadingRef.current || !summaryData) {
        fetchDashboardData();
    }

  }, [user, token, authLoading, summaryData]);

  const renderCommonCard = (title, value, icon, subText = null, cardClassName = '') => (
    <div className={`rounded-lg border border-fourth bg-tertiary p-6 shadow-sm hover:shadow-md transition-shadow ${cardClassName}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {React.cloneElement(icon, { className: `h-6 w-6 ${icon.props.className || 'text-primary'}` })}
      </div>
      <p className="text-3xl font-bold text-secondary">{value === undefined || value === null ? 'N/A' : value}</p>
      {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
    </div>
  );

  const renderActivityItem = (item, index, arrayLength) => (
    <div key={index} className={`py-3 ${index !== arrayLength - 1 ? 'border-b border-fourth' : ''}`}>
      <p className="text-sm text-secondary">{item.message}</p>
      <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
    </div>
  );

  const renderPerformanceItem = (label, value) => (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-secondary">{value === undefined || value === null ? 'N/A' : value}</span>
    </div>
  );

  const renderSection = (title, icon, children, className = '') => (
    <div className={`rounded-lg border border-fourth bg-tertiary p-6 shadow-sm ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-secondary">{title}</h3>
            {React.cloneElement(icon, { className: `h-6 w-6 ${icon.props.className || 'text-primary'}` })}
        </div>
        {children}
    </div>
  );

  if (authLoading || (loading && fetchCountRef.current <=1) ) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary">
        <div className="text-xl font-semibold text-secondary">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-red-700 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600">{error}</p>
        <p className="text-gray-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  if (!summaryData || summaryData.message) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary text-center">
        <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-secondary">Welcome, {user?.name || 'User'}!</h3>
        <p className="text-gray-600">{summaryData?.message || 'No dashboard data available for your role at the moment.'}</p>
      </div>
    );
  }

  const renderProductHeadDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Customers', formatNumber(summaryData.totalCustomers), <Users />)}
        {renderCommonCard('Active Purchases', formatNumber(summaryData.activeOrders), <ShoppingCart />)}
        {renderCommonCard('Open Support Tickets', formatNumber(summaryData.openTickets), <Ticket />)}
        {renderCommonCard('Total Revenue (All Time)', `₹${formatNumber(summaryData.totalRevenue)}`, <DollarSign />)}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Quotations (Draft)', formatNumber(summaryData.quotationStats?.draft || 0), <FileText />)}
        {renderCommonCard('Quotations (Sent)', formatNumber(summaryData.quotationStats?.sent || 0), <FileText />)}
        {renderCommonCard('Quotations (Approved)', formatNumber(summaryData.quotationStats?.approved || 0), <FileText />)}
        {renderCommonCard('Low Stock Items', summaryData.lowStockItems, <PackageSearch className="text-red-500" />, 'Count of items below threshold')}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity.</p>}
          </div>
        )}
        {renderSection("Key Performance Indicators", <TrendingUp />, 
            <div className="space-y-2">
            {summaryData.performanceMetrics && renderPerformanceItem('Tasks Completed (Overall)', summaryData.performanceMetrics.tasksCompleted)}
            {summaryData.performanceMetrics && renderPerformanceItem('Customer Satisfaction Score', summaryData.performanceMetrics.customerSatisfaction)}
            {summaryData.supportTicketsSummary && renderPerformanceItem('Currently Open Support Tickets', formatNumber(summaryData.supportTicketsSummary.openTickets))}
            {summaryData.supportTicketsSummary && renderPerformanceItem('Avg. Ticket Response Time', summaryData.supportTicketsSummary.avgResponseTime)}
          </div>
        )}
      </div>
    </>
  );

  const renderCustomerDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('My Open Tickets', formatNumber(summaryData.myOpenTickets), <Ticket />)}
        {renderCommonCard('My Active Purchases', formatNumber(summaryData.myRecentOrdersCount), <ShoppingCart />)}
        {renderCommonCard('My Active Quotations', formatNumber(summaryData.myActiveQuotations), <FileText />)}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Recent Account Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity for your account.</p>}
          </div>
        )}
        {renderSection("My Statistics", <UserCheck />, 
            <div className="space-y-2">
            {summaryData.myStats && renderPerformanceItem('Total Purchases Made', formatNumber(summaryData.myStats.ordersPlaced))}
            {summaryData.myStats && renderPerformanceItem('Total Support Tickets Opened', formatNumber(summaryData.myStats.supportTicketsOpened))}
          </div>
        )}
        </div>
    </>
  );

  const renderSalesDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('My Leads Created', formatNumber(summaryData.myLeadsCreated), <Users2 />)}
        {renderCommonCard('My Quotations (Draft)', formatNumber(summaryData.myQuotationStats?.draft || 0), <FileText />)}
        {renderCommonCard('My Quotations (Approved)', formatNumber(summaryData.myQuotationStats?.approved || 0), <FileText />)}
        {renderCommonCard('Revenue (My Approved Quotes)', `₹${formatNumber(summaryData.revenueFromApprovedQuotations || 0)}`, <DollarSign />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("My Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity.</p>}
            </div>
        )}
        {renderSection("My Sales Performance", <BarChart2 />, 
          <div className="space-y-2">
            {summaryData.salesPerformance && renderPerformanceItem('Deals Closed (Approved Quotes)', formatNumber(summaryData.salesPerformance.closedDeals || 0))}
            {summaryData.salesPerformance && renderPerformanceItem('Lead to Deal Conversion Rate', summaryData.salesPerformance.conversionRate)}
              </div>
        )}
              </div>
    </>
  );

  const renderInventoryDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('Total Product Definitions', formatNumber(summaryData.totalProducts), <Package />)}
        {renderCommonCard('Low Stock Items', summaryData.lowStockItemsCount, <PackageSearch className="text-red-500" />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Low Stock Items", <AlertTriangle className="text-red-500" />,
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.lowStockItems?.length > 0 ? summaryData.lowStockItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-fourth">
                <span className="text-sm text-secondary">{item.name}</span>
                <span className="text-sm font-semibold text-red-500">
                  {item.quantity} / {item.reorderLevel}
                </span>
              </div>
            )) : <p className='text-sm text-gray-500'>No items are currently low on stock.</p>}
          </div>
        )}
        {renderSection("Inventory Key Stats", <BarChart2 />,
          <div className="space-y-2">
            {summaryData.inventoryStats && renderPerformanceItem('Items Below Reorder Level', summaryData.inventoryStats.itemsBelowReorderLevel)}
            {summaryData.inventoryStats && renderPerformanceItem('Stock Turnover Rate', summaryData.inventoryStats.stockTurnoverRate)}
            </div>
        )}
              </div>
    </>
  );

  const renderServiceEngineerDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-6">
        {renderCommonCard('My Active Assigned Tasks', formatNumber(summaryData.myAssignedCustomerTasks), <UserCog />)}
        {renderCommonCard('Avg. Task Resolution Time', summaryData.avgResolutionTime, <CheckCircle2 />)}
              </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("My Service Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.serviceActivity?.length > 0 ? summaryData.serviceActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent service activity.</p>}
            </div>
        )}
        {renderSection("My Service Performance", <BarChart2 />, 
          <div className="space-y-2">
            {summaryData.servicePerformance && renderPerformanceItem('Tasks Completed Today', formatNumber(summaryData.servicePerformance.tasksCompletedToday))}
            {summaryData.servicePerformance && renderPerformanceItem('First Call Resolution Rate', summaryData.servicePerformance.firstCallResolutionRate)}
          </div>
        )}
            </div>
    </>
  );

  const renderSalesHeadDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('Total Quotations', formatNumber(summaryData.totalQuotations), <FileText />)}
        {renderCommonCard('Total Quotations Value', `₹${formatNumber(summaryData.totalQuotationsValue)}`, <DollarSign />)}
        {renderCommonCard('Approved Deals', formatNumber(summaryData.approvedDeals), <CheckCircle2 />)}
      </div>
    </>
  );

  const renderDashboardByRole = () => {
    switch (user?.role) {
      case 'product_head': return renderProductHeadDashboard();
      case 'customer': return renderCustomerDashboard();
      case 'sales_person':
      case 'sales_representative': return renderSalesDashboard();
      case 'inventory_manager': return renderInventoryDashboard();
      case 'service_engineer': return renderServiceEngineerDashboard();
      case 'sales_head': return renderSalesHeadDashboard();
      default:
        return (
          <div className="text-center">
            <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg text-secondary">Welcome, {user?.name}! Dashboard for role '{user?.role}' is not yet configured or data is unavailable.</p>
              </div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-tertiary font-sans h-full">
      <div className="border-b border-fourth pb-5 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Dashboard</h1>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <Settings className="h-5 w-5 text-secondary" />
            <span>Role: {user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</span>
          </div>
        </div>
      </div>

        {renderDashboardByRole()}
    </div>
  );
};

export default Dashboard; 