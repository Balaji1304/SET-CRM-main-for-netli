import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock, CheckCircle2, Ticket, Users, IndianRupee, Package, Briefcase, BarChart2, Settings, AlertTriangle, ShoppingCart, ListChecks, UserCheck, FileText, Users2, PackageSearch, UserCog, TrendingUp, UserPlus, Building2, Globe, MapPin, Calendar, Timer, Zap, Search, PieChart, Truck, CalendarDays, Target, Star, TrendingDown
} from 'lucide-react';
import axios from 'axios';
import TicketStatsWidget from './TicketStatsWidget';
import TrackingWidget from './TrackingWidget';
import NotificationWidget from './NotificationWidget';
import { formatNumber } from '../utils/formatNumber';

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
    <div className={`rounded-lg border border-fourth bg-tertiary p-6 shadow-sm hover:shadow-md transition-shadow w-full max-w-full overflow-hidden ${cardClassName}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600 truncate pr-2 flex-1 min-w-0">{title}</p>
        {React.cloneElement(icon, { className: `h-6 w-6 flex-shrink-0 ${icon.props.className || 'text-primary'}` })}
      </div>
      <p className="text-3xl font-bold text-secondary truncate">{value === undefined || value === null ? 'N/A' : value}</p>
      {subText && <p className="text-xs text-gray-500 mt-1 truncate">{subText}</p>}
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
    <div className={`rounded-lg border border-fourth bg-tertiary p-6 shadow-sm w-full max-w-full overflow-hidden ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-secondary truncate pr-2">{title}</h3>
            {React.cloneElement(icon, { className: `h-6 w-6 flex-shrink-0 ${icon.props.className || 'text-primary'}` })}
        </div>
        <div className="w-full max-w-full overflow-hidden">
            {children}
        </div>
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
      <TicketStatsWidget userRole={user?.role} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Customers', formatNumber(summaryData.totalCustomers), <Users />)}
        {renderCommonCard('Active Purchases', formatNumber(summaryData.activeOrders), <ShoppingCart />)}
        {renderCommonCard('Open Support Tickets', formatNumber(summaryData.openTickets), <Ticket />)}
        {renderCommonCard('Total Revenue (All Time)', `₹${formatNumber(summaryData.totalRevenue)}`, <IndianRupee />)}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Quotations (Draft)', formatNumber(summaryData.quotationStats?.draft || 0), <FileText />)}
        {renderCommonCard('Quotations (Sent)', formatNumber(summaryData.quotationStats?.sent || 0), <FileText />)}
        {renderCommonCard('Quotations (Approved)', formatNumber(summaryData.quotationStats?.approved || 0), <FileText />)}
        {renderCommonCard('Low Stock Items', summaryData.lowStockItems, <PackageSearch className="text-red-500" />, 'Count of items below threshold')}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('Total Products', formatNumber(summaryData.totalProducts), <Package />)}
        {renderCommonCard('Items Below Reorder Level', summaryData.lowStockItemsCount, <AlertTriangle className="text-red-500" />)}
        {renderCommonCard('Stock Turnover Rate', summaryData.inventoryStats?.stockTurnoverRate || 'N/A', <BarChart2 />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderSection("Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity.</p>}
          </div>
        )}
        {renderSection("Low Stock Items", <AlertTriangle className="text-red-500" />,
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.lowStockItemsList?.length > 0 ? summaryData.lowStockItemsList.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-fourth">
                <span className="text-sm text-secondary">{item.name}</span>
                <span className="text-sm font-semibold text-red-500">
                  {item.quantity} / {item.reorderLevel}
                </span>
              </div>
            )) : <p className='text-sm text-gray-500'>No items are currently low on stock.</p>}
          </div>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
        {renderSection("Key Performance Indicators", <TrendingUp />, 
            <div className="space-y-2">
            {summaryData.performanceMetrics && renderPerformanceItem('Tasks Completed (Overall)', summaryData.performanceMetrics.tasksCompleted)}
            {summaryData.performanceMetrics && renderPerformanceItem('Customer Satisfaction Score', summaryData.performanceMetrics.customerSatisfaction)}
            {summaryData.supportTicketsSummary && renderPerformanceItem('Currently Open Support Tickets', formatNumber(summaryData.supportTicketsSummary.openTickets))}
            {summaryData.supportTicketsSummary && renderPerformanceItem('Avg. Ticket Response Time', summaryData.supportTicketsSummary.avgResponseTime)}
            {summaryData.inventoryStats && renderPerformanceItem('Items Below Reorder Level', summaryData.inventoryStats.itemsBelowReorderLevel)}
          </div>
        )}
      </div>
    </>
  );

  const renderCustomerDashboard = () => (
    <>
      <TicketStatsWidget userRole={user?.role} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('My Open Tickets', formatNumber(summaryData.myOpenTickets), <Ticket />)}
        {renderCommonCard('My Active Purchases', formatNumber(summaryData.myRecentOrdersCount), <ShoppingCart />)}
        {renderCommonCard('My Active Quotations', formatNumber(summaryData.myActiveQuotations), <FileText />)}
            </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-6">
        <TrackingWidget />
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
        {renderCommonCard('Revenue (My Approved Quotes)', `₹${formatNumber(summaryData.revenueFromApprovedQuotations || 0)}`, <IndianRupee />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
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
        <NotificationWidget userRole="sales_person" />
              </div>
    </>
  );

  const renderServiceEngineerDashboard = () => (
    <>
      <TicketStatsWidget userRole={user?.role} />
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
        {renderCommonCard('Total Quotations Value', `₹${formatNumber(summaryData.totalQuotationsValue)}`, <IndianRupee />)}
        {renderCommonCard('Approved Deals', formatNumber(summaryData.approvedDeals), <CheckCircle2 />)}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {renderSection("Team Performance", <TrendingUp />, 
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-fourth">
              <span className="text-sm text-secondary">Team Quotations This Month</span>
              <span className="text-sm font-semibold text-primary">{summaryData.teamQuotationsThisMonth || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-fourth">
              <span className="text-sm text-secondary">Team Conversion Rate</span>
              <span className="text-sm font-semibold text-green-600">{summaryData.teamConversionRate || '0%'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-secondary">Active Team Members</span>
              <span className="text-sm font-semibold text-blue-600">{summaryData.activeTeamMembers || 0}</span>
            </div>
          </div>
        )}
        {renderSection("Recent Team Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.teamActivity?.length > 0 ? summaryData.teamActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent team activity.</p>}
          </div>
        )}
        <NotificationWidget userRole="sales_head" />
      </div>
    </>
  );

  const renderFrontOfficeExecutiveDashboard = () => (
    <>
      {/* Main KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Enquiries', formatNumber(summaryData.totalEnquiries || 0), <FileText />, 'All time')}
        {renderCommonCard('Enquiries Today', formatNumber(summaryData.enquiriesToday || 0), <UserPlus />, 'Created today')}
        {renderCommonCard('Pending Assignments', formatNumber(summaryData.pendingAssignments || 0), <Clock className="text-orange-500" />, 'Awaiting assignment')}
        {renderCommonCard('Converted Today', formatNumber(summaryData.leadsAssignedToday || 0), <CheckCircle2 className="text-green-500" />, 'Assigned to leads')}
      </div>

      {/* Lead Source Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('IndiaMART Leads', formatNumber(summaryData.leadSourceStats?.indiamart || 0), <Building2 className="text-blue-500" />)}
        {renderCommonCard('Website Enquiries', formatNumber(summaryData.leadSourceStats?.website || 0), <Globe className="text-green-500" />)}
        {renderCommonCard('Referral Leads', formatNumber(summaryData.leadSourceStats?.referral || 0), <Users className="text-purple-500" />)}
        {renderCommonCard('Walk-in Customers', formatNumber(summaryData.leadSourceStats?.walk_in || 0), <MapPin className="text-red-500" />)}
      </div>

      {/* Assignment Performance */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {renderCommonCard('This Week Assignments', formatNumber(summaryData.weeklyAssignments || 0), <Users2 />, 'Leads assigned this week')}
        {renderCommonCard('This Month Total', formatNumber(summaryData.monthlyEnquiries || 0), <Calendar />, 'Enquiries this month')}
        {renderCommonCard('Average Response Time', summaryData.avgResponseTime || 'N/A', <Timer className="text-blue-500" />, 'From enquiry to assignment')}
      </div>

      {/* Main Content Sections */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        {/* Quick Actions */}
        {renderSection("Quick Actions", <Zap className="text-yellow-500" />, 
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/dashboard/enquiry'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Create New Enquiry
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/lead-assignment'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Users className="w-4 h-4" />
              Assign Leads
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/enquiry?filter=pending'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              View Pending
            </button>
          </div>
        )}

        {/* Recent Activity */}
        {renderSection("Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity.</p>}
          </div>
        )}

        {/* Today's Performance */}
        {renderSection("Today's Performance", <BarChart2 />, 
          <div className="space-y-2">
            {renderPerformanceItem('Enquiries Captured', summaryData.enquiriesToday || 0)}
            {renderPerformanceItem('Successfully Assigned', summaryData.leadsAssignedToday || 0)}
            {renderPerformanceItem('Pending Assignment', summaryData.pendingAssignments || 0)}
            {renderPerformanceItem('Conversion Rate', summaryData.todayConversionRate || '0%')}
          </div>
        )}
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        {/* Lead Sources Breakdown */}
        {renderSection("Lead Sources Overview", <PieChart className="text-blue-500" />, 
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {summaryData.leadSourceBreakdown?.length > 0 ? summaryData.leadSourceBreakdown.map((source, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-fourth last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    source.source === 'indiamart' ? 'bg-blue-500' :
                    source.source === 'website' ? 'bg-green-500' :
                    source.source === 'referral' ? 'bg-purple-500' :
                    source.source === 'walk_in' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-sm text-secondary capitalize">{source.source.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-secondary">{source.count}</span>
                  <span className="text-xs text-gray-500 ml-1">({source.percentage}%)</span>
                </div>
              </div>
            )) : <p className='text-sm text-gray-500'>No lead source data available.</p>}
          </div>
        )}

        {/* Assignment Status Overview */}
        {renderSection("Assignment Status", <Users className="text-green-500" />, 
          <div className="space-y-2">
            {summaryData.assignmentStats && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-fourth">
                  <span className="text-sm text-secondary">Total Enquiries</span>
                  <span className="text-sm font-semibold text-secondary">{summaryData.assignmentStats.total || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-fourth">
                  <span className="text-sm text-secondary">Pending Assignment</span>
                  <span className="text-sm font-semibold text-orange-600">{summaryData.assignmentStats.pending || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-fourth">
                  <span className="text-sm text-secondary">Assigned</span>
                  <span className="text-sm font-semibold text-blue-600">{summaryData.assignmentStats.assigned || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-secondary">Converted to Leads</span>
                  <span className="text-sm font-semibold text-green-600">{summaryData.assignmentStats.converted || 0}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notifications */}
        <NotificationWidget userRole="front_office_executive" />
      </div>

      {/* Recent Enquiries Table */}
      <div className="grid gap-6 md:grid-cols-1 mb-6">
        {renderSection("Recent Enquiries", <FileText />, 
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.recentEnquiries?.length > 0 ? summaryData.recentEnquiries.slice(0, 5).map((enquiry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{enquiry.customerName}</div>
                      <div className="text-sm text-gray-500">{enquiry.phone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{enquiry.leadSource?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        enquiry.status === 'pending_assignment' ? 'bg-yellow-100 text-yellow-800' :
                        enquiry.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {enquiry.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {enquiry.createdAt}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {enquiry.status === 'pending_assignment' && (
                        <button 
                          onClick={() => window.location.href = `/dashboard/lead-assignment?enquiry=${enquiry.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      No recent enquiries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {summaryData.recentEnquiries?.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => window.location.href = '/dashboard/lead-assignment'}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All Enquiries →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  const renderMarketingCoordinatorDashboard = () => (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Primary KPIs - Purchase Order Management */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Purchase Orders', formatNumber(summaryData.totalPurchaseOrders || 0), <Package />, 'All active orders')}
        {renderCommonCard('Ready to Dispatch', formatNumber(summaryData.readyToDispatch || 0), <Truck className="text-blue-500" />, 'Awaiting date allocation')}
        {renderCommonCard('Dates Allocated Today', formatNumber(summaryData.dateAllocatedToday || 0), <CalendarDays className="text-green-500" />, 'Installation dates set')}
        {renderCommonCard('Upcoming Installations', formatNumber(summaryData.upcomingInstallations || 0), <Calendar className="text-orange-500" />, 'Next 7 days')}
      </div>

      {/* Installation & Service Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('This Week Installations', formatNumber(summaryData.installationsThisWeek || 0), <CalendarDays />)}
        {renderCommonCard('Active Customers', formatNumber(summaryData.totalCustomers || 0), <Users />)}
        {renderCommonCard('New Customers (Month)', formatNumber(summaryData.newCustomersThisMonth || 0), <UserPlus className="text-green-500" />)}
        {renderCommonCard('Monthly Revenue', `₹${formatNumber(summaryData.monthlyRevenue || 0)}`, <IndianRupee className="text-green-600" />)}
      </div>

      {/* Secondary Permissions Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderCommonCard('Total Leads', formatNumber(summaryData.totalLeads || 0), <Target />)}
        {renderCommonCard('Active Leads', formatNumber(summaryData.activeLeads || 0), <Target className="text-blue-500" />)}
        {renderCommonCard('Total Quotations', formatNumber(summaryData.totalQuotations || 0), <FileText />)}
        {renderCommonCard('Pending Quotations', formatNumber(summaryData.pendingQuotations || 0), <FileText className="text-orange-500" />)}
      </div>

      {/* Main Content Sections */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        {/* Quick Actions */}
        {renderSection("Quick Actions", <Zap className="text-yellow-500" />, 
          <div className="space-y-3 w-full">
            <button
              onClick={() => window.location.href = '/dashboard/purchase-orders'}
              className="w-full flex items-center gap-2 px-3 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm md:text-base min-h-[44px]"
            >
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left md:text-center">
                <span className="block sm:hidden">Purchase Orders</span>
                <span className="hidden sm:block">Manage Purchase Orders</span>
              </span>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/customers'}
              className="w-full flex items-center gap-2 px-3 py-3 bg-secondary text-white rounded-lg hover:opacity-90 transition-opacity text-sm md:text-base min-h-[44px]"
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left md:text-center">
                <span className="block sm:hidden">Customers</span>
                <span className="hidden sm:block">View Customers</span>
              </span>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/leads'}
              className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base min-h-[44px]"
            >
              <Target className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left md:text-center">
                <span className="block sm:hidden">Leads</span>
                <span className="hidden sm:block">Manage Leads</span>
              </span>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/quotations'}
              className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base min-h-[44px]"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left md:text-center">
                <span className="block sm:hidden">Quotations</span>
                <span className="hidden sm:block">View Quotations</span>
              </span>
            </button>
          </div>
        )}

        {/* Recent Activity */}
        {renderSection("Recent Activity", <Clock />, 
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {summaryData.recentActivity?.length > 0 ? summaryData.recentActivity.map((item, idx, arr) => renderActivityItem(item, idx, arr.length)) : <p className='text-sm text-gray-500'>No recent activity.</p>}
          </div>
        )}

        {/* Today's Performance */}
        {renderSection("Performance Metrics", <BarChart2 />, 
          <div className="space-y-2">
            {renderPerformanceItem('Orders Ready to Dispatch', summaryData.readyToDispatch || 0)}
            {renderPerformanceItem('Dates Allocated Today', summaryData.dateAllocatedToday || 0)}
            {renderPerformanceItem('Upcoming Installations', summaryData.upcomingInstallations || 0)}
            {renderPerformanceItem('Customer Satisfaction', summaryData.customerSatisfactionRate || 'N/A')}
          </div>
        )}
      </div>

      {/* Service Task Status Breakdown */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        {/* Service Task Status Overview */}
        {renderSection("Service Task Status", <Truck className="text-blue-500" />, 
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {summaryData.serviceTaskBreakdown && Object.keys(summaryData.serviceTaskBreakdown).length > 0 ? Object.entries(summaryData.serviceTaskBreakdown).map(([status, count], idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-fourth last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'pending_assignment' ? 'bg-yellow-500' :
                    status === 'ready_to_dispatch' ? 'bg-blue-500' :
                    status === 'installation_date_allocated' ? 'bg-orange-500' :
                    status === 'assigned' ? 'bg-green-500' :
                    status === 'completed' ? 'bg-emerald-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-sm text-secondary capitalize">{status.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-semibold text-secondary">{count}</span>
              </div>
            )) : <p className='text-sm text-gray-500'>No service task data available.</p>}
          </div>
        )}

        {/* Revenue Analytics */}
        {renderSection("Revenue Overview", <IndianRupee className="text-green-500" />, 
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-fourth">
              <span className="text-sm text-secondary">Total Revenue</span>
              <span className="text-sm font-semibold text-secondary">₹{formatNumber(summaryData.totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-fourth">
              <span className="text-sm text-secondary">Monthly Revenue</span>
              <span className="text-sm font-semibold text-green-600">₹{formatNumber(summaryData.monthlyRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-fourth">
              <span className="text-sm text-secondary">Active Purchase Orders</span>
              <span className="text-sm font-semibold text-blue-600">{summaryData.activePurchaseOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-secondary">Avg Installation Time</span>
              <span className="text-sm font-semibold text-orange-600">{summaryData.avgInstallationTime || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Notifications */}
        <NotificationWidget userRole="marketing_coordinator" />
      </div>

      {/* Recent Purchase Orders Table */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-6">
        {renderSection("Recent Purchase Orders", <Package />, 
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.recentPurchaseOrders?.length > 0 ? summaryData.recentPurchaseOrders.slice(0, 5).map((order, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.purchaseID}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'pending_assignment' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'ready_to_dispatch' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'installation_date_allocated' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'assigned' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      ₹{formatNumber(order.totalAmount)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      No recent purchase orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {summaryData.recentPurchaseOrders?.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => window.location.href = '/dashboard/purchase-orders'}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All Purchase Orders →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Installations */}
        {renderSection("Upcoming Installations", <CalendarDays className="text-orange-500" />, 
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.upcomingInstallationsList?.length > 0 ? summaryData.upcomingInstallationsList.slice(0, 5).map((installation, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{installation.installationDate}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{installation.customerName}</div>
                      <div className="text-xs text-gray-500">{installation.purchaseID}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{installation.engineerName}</div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                      No upcoming installations scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {summaryData.upcomingInstallationsList?.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => window.location.href = '/dashboard/purchase-orders'}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All Installations →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboardByRole = () => {
    switch (user?.role) {
      case 'product_head': return renderProductHeadDashboard();
      case 'customer': return renderCustomerDashboard();
      case 'sales_person':
      case 'sales_representative': return renderSalesDashboard();
      case 'front_office_executive': return renderFrontOfficeExecutiveDashboard();
      case 'service_engineer': return renderServiceEngineerDashboard();
      case 'sales_head': return renderSalesHeadDashboard();
      case 'marketing_coordinator': return renderMarketingCoordinatorDashboard();
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
    <div className="flex flex-col flex-1 min-h-0 bg-tertiary font-sans h-full w-full overflow-x-hidden">
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
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