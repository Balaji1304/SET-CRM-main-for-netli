import React from 'react';
import { Search, Phone, Mail, MoreHorizontal } from 'lucide-react';

const ServiceCustomersPage = () => {
  const customers = [
    {
      id: "C-1001",
      name: "Alice Johnson",
      company: "Tech Solutions Inc.",
      email: "alice@techsolutions.com",
      phone: "+1 (555) 123-4567",
      status: "Active",
    },
    {
      id: "C-1002",
      name: "Bob Smith",
      company: "Innovate Systems",
      email: "bob@innovatesystems.com",
      phone: "+1 (555) 987-6543",
      status: "Active",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service Customers</h2>
          <p className="text-muted-foreground mt-1">Manage service customer information</p>
        </div>
        <button className="px-4 py-2 bg-[#FF7300] text-white rounded-lg hover:bg-orange-600">
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search customers..."
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-input">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-[#FF7300] hover:text-orange-600 mx-2">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button className="text-[#FF7300] hover:text-orange-600 mx-2">
                      <Mail className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-500 mx-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceCustomersPage; 