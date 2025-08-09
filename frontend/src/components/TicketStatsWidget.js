import React, { useEffect, useState } from 'react';
import { Ticket, Clock, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { getMyTickets, getAllTickets, getAssignedTickets } from '../services/ticketService';

const TicketStatsWidget = ({ userRole }) => {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgResponseTime: '0h',
    highPriority: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userRole]);

  const loadStats = async () => {
    try {
      let tickets = [];
      
      switch (userRole) {
        case 'customer':
          const customerRes = await getMyTickets();
          tickets = customerRes.data || [];
          break;
        case 'product_head':
          const adminRes = await getAllTickets();
          tickets = adminRes.data || [];
          break;
        case 'service_engineer':
          const engineerRes = await getAssignedTickets();
          tickets = engineerRes.data || [];
          break;
        default:
          tickets = [];
      }

      const total = tickets.length;
      const open = tickets.filter(t => ['open', 'reopened'].includes(t.status)).length;
      const inProgress = tickets.filter(t => ['assigned', 'in_progress', 'awaiting_customer'].includes(t.status)).length;
      const resolved = tickets.filter(t => t.status === 'resolved').length;
      const highPriority = tickets.filter(t => t.priority === 'high').length;

      // Calculate average response time (mock calculation for now)
      const avgResponseTime = tickets.length > 0 ? '2.5h' : '0h';

      setStats({
        total,
        open,
        inProgress,
        resolved,
        avgResponseTime,
        highPriority
      });
    } catch (error) {
      console.error('Failed to load ticket stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatCards = () => {
    const baseCards = [
      {
        title: 'Total Tickets',
        value: stats.total,
        icon: Ticket,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600'
      },
      {
        title: 'Open',
        value: stats.open,
        icon: AlertCircle,
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600'
      },
      {
        title: 'In Progress',
        value: stats.inProgress,
        icon: Clock,
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-600'
      },
      {
        title: 'Resolved',
        value: stats.resolved,
        icon: CheckCircle,
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-600'
      }
    ];

    if (userRole === 'product_head') {
      baseCards.push({
        title: 'High Priority',
        value: stats.highPriority,
        icon: TrendingUp,
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-600'
      });
    }

    if (userRole === 'service_engineer') {
      baseCards.push({
        title: 'Avg Response',
        value: stats.avgResponseTime,
        icon: Clock,
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-600'
      });
    }

    return baseCards;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {getStatCards().map((card, index) => (
        <div key={index} className={`${card.bgColor} p-4 rounded-lg shadow-sm border transition-all hover:shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`${card.color} p-2 rounded-lg`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketStatsWidget;

