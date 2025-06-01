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
    console.log('Dashboard useEffect triggered. AuthLoading:', authLoading, 'User:', !!user, 'Token:', !!token, 'InitialAuthLoading:', initialAuthLoadingRef.current);

    if (authLoading) {
        console.log('Auth is loading, dashboard will wait...');
        setLoading(true);
        return;
    }
    if (initialAuthLoadingRef.current && !authLoading) {
        initialAuthLoadingRef.current = false;
        console.log('Auth loading finished.');
    }

    const fetchDashboardData = async () => {
      if (!user || !token) {
        console.log('User or token not available. Dashboard fetch aborted.');
        setLoading(false);
        setError('User not authenticated. Please login again.');
        return;
      }

      if (fetchCountRef.current > 0) {
        console.log('Dashboard data already fetched or fetch in progress for this session. Aborting new fetch.', fetchCountRef.current);
        setLoading(false);
        return;
      }
      
      fetchCountRef.current += 1;
      console.log(`Attempting to fetch dashboard data (Attempt: ${fetchCountRef.current})`);

      try {
        setLoading(true);
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/dashboard/summary`, config);
        console.log('Dashboard data received:', data);
        if (data.success) {
          setSummaryData(data.data);
          setError(null);
        } else {
          setError(data.message || 'Failed to fetch dashboard data.');
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.response?.data?.message || err.message || 'An error occurred while fetching dashboard data.');
      } finally {
        setLoading(false);
        console.log('Fetch dashboard data finished.');
      }
    };

    if (!initialAuthLoadingRef.current) {
        fetchDashboardData();
    }

  }, [user, token, authLoading]);

  const renderCommonCard = (title, value, icon, subText = null, cardClassName = '') => (
    <div className={`rounded-lg border bg-white p-4 shadow hover:shadow-lg transition-shadow ${cardClassName}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {React.cloneElement(icon, { className: `h-5 w-5 ${icon.props.className || 'text-orange-500'}` })}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value === undefined || value === null ? 'N/A' : value}</p>
      {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
    </div>
  );

  const renderActivityItem = (item, index, arrayLength) => (
    <div key={index} className={`py-3 ${index !== arrayLength - 1 ? 'border-b border-gray-200' : ''}`}>
      <p className="text-sm font-medium text-gray-700">{item.message}</p>
      <p className="text-xs text-gray-500">{item.time}</p>
    </div>
  );

  const renderPerformanceItem = (label, value) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value === undefined || value === null ? 'N/A' : value}</span>
    </div>
  );

  const renderSection = (title, icon, children, className = '') => (
    <div className={`rounded-lg border bg-white p-4 shadow-md ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
            {React.cloneElement(icon, { className: `h-5 w-5 ${icon.props.className || 'text-gray-400'}` })}
        </div>
        {children}
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-gray-50 p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-red-700 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600">{error}</p>
        <p className="text-gray-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  if (!summaryData || summaryData.message) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center bg-gray-50 p-4 text-center">
        <Briefcase className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">Welcome, {user?.name || 'User'}!</h3>
        <p className="text-gray-600">{summaryData?.message || 'No dashboard data available for your role at the moment.'}</p>
      </div>
    );
  }

  const renderProductHeadDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Customers', formatNumber(summaryData.totalCustomers), <Users />)}
        {renderCommonCard('Active Purchases', formatNumber(summaryData.activeOrders), <ShoppingCart />)}
        {renderCommonCard('Open Support Tickets', formatNumber(summaryData.openTickets), <Ticket />)}
        {renderCommonCard('Total Revenue (All Time)', `₹${formatNumber(summaryData.totalRevenue)}`, <DollarSign />)}
      </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Quotations (Draft)', formatNumber(summaryData.quotationStats?.draft || 0), <FileText className="text-blue-500" />)}
        {renderCommonCard('Quotations (Sent)', formatNumber(summaryData.quotationStats?.sent || 0), <FileText className="text-yellow-500" />)}
        {renderCommonCard('Quotations (Approved)', formatNumber(summaryData.quotationStats?.approved || 0), <FileText className="text-green-500" />)}
        {renderCommonCard('Low Stock Items', summaryData.lowStockItems, <PackageSearch className="text-red-500" />, 'Count of items below threshold')}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('My Open Tickets', formatNumber(summaryData.myOpenTickets), <Ticket />)}
        {renderCommonCard('My Active Purchases', formatNumber(summaryData.myRecentOrdersCount), <ShoppingCart />)}
        {renderCommonCard('My Active Quotations', formatNumber(summaryData.myActiveQuotations), <FileText />)}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Recent Account Activity", <Clock />, 
          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('My Leads Created', formatNumber(summaryData.myLeadsCreated), <Users2 />)}
        {renderCommonCard('My Quotations (Draft)', formatNumber(summaryData.myQuotationStats?.draft || 0), <FileText className="text-blue-500" />)}
        {renderCommonCard('My Quotations (Approved)', formatNumber(summaryData.myQuotationStats?.approved || 0), <FileText className="text-green-500" />)}
        {renderCommonCard('Revenue (My Approved Quotes)', `₹${formatNumber(summaryData.revenueFromApprovedQuotations || 0)}`, <DollarSign className="text-green-600" />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("My Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('Total Product Definitions', formatNumber(summaryData.totalProducts), <Package />)}
        {renderCommonCard('Low Stock Items', summaryData.lowStockItemsCount, <PackageSearch className="text-red-500" /> ,'Requires inventory tracking module')}
        {renderCommonCard('Recent Product Updates', summaryData.recentProductUpdatesCount, <ListChecks />, 'Based on definition changes')}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Inventory Activity Log", <Clock />, 
          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
            {summaryData.inventoryActivity?.length > 0 ? summaryData.inventoryActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent inventory activity.</p>}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
        {renderCommonCard('My Active Assigned Tasks', formatNumber(summaryData.myAssignedCustomerTasks), <UserCog />)}
        {renderCommonCard('Avg. Task Resolution Time', summaryData.avgResolutionTime, <CheckCircle2 />)}
              </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("My Service Activity", <Clock />, 
          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
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

  const renderDashboardByRole = () => {
    switch (user?.role) {
      case 'product_head': return renderProductHeadDashboard();
      case 'customer': return renderCustomerDashboard();
      case 'sales_person':
      case 'sales_representative': return renderSalesDashboard();
      case 'inventory_manager': return renderInventoryDashboard();
      case 'service_engineer': return renderServiceEngineerDashboard();
      default:
        return (
          <div className="text-center py-10">
            <Briefcase className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-lg text-gray-700">Welcome, {user?.name}! Dashboard for role '{user?.role}' is not yet configured or data is unavailable.</p>
              </div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">Dashboard</h2>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <Settings className="h-5 w-5" />
            <span>Role: {user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {renderDashboardByRole()}
      </div>
    </div>
  );
};

export default Dashboard; 