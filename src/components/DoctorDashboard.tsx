import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner";
import { MedicalRecordForm } from "./MedicalRecordForm";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export function DoctorDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMedicalRecordForm, setShowMedicalRecordForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  const todayAppointments = useQuery(api.appointments.getTodayAppointments);
  const myAppointments = useQuery(api.appointments.getMyAppointments);
  const notifications = useQuery(api.notifications.getMyNotifications);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const lowStockItems = useQuery(api.inventory.getLowStockItems);
  const myInvoices = useQuery(api.billing.getMyInvoices);
  const inventoryItems = useQuery(api.inventory.getInventoryItems, {});
  
  const updateAppointmentStatus = useMutation(api.appointments.updateAppointmentStatus);
  const updateDoctorStatus = useMutation(api.users.updateDoctorStatus);

  const handleStatusUpdate = async (appointmentId: string, status: "confirmed" | "rejected") => {
    try {
      await updateAppointmentStatus({ appointmentId: appointmentId as any, status });
      toast.success(t.success);
    } catch (error) {
      toast.error(t.error);
    }
  };

  const toggleOnlineStatus = async (isOnline: boolean) => {
    try {
      await updateDoctorStatus({ isOnline });
      toast.success(t.success);
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handleCreateRecord = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowMedicalRecordForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
        {[
          { id: "dashboard", label: t.dashboard, icon: "📊" },
          { id: "appointments", label: t.myAppointments, icon: "📅" },
          { id: "analytics", label: "Analytics", icon: "📈" },
          { id: "inventory", label: "Inventory", icon: "📦", badge: lowStockItems?.length },
          { id: "billing", label: "Billing", icon: "💰" },
          { id: "notifications", label: t.notifications, icon: "🔔", badge: unreadCount },
          { id: "profile", label: t.profile, icon: "👤" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.todayAppointments}</h3>
              <p className="text-3xl font-bold text-blue-600">
                {todayAppointments?.length || 0}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.notifications}</h3>
              <p className="text-3xl font-bold text-orange-600">
                {unreadCount || 0}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">Low Stock Items</h3>
              <p className="text-3xl font-bold text-red-600">
                {lowStockItems?.length || 0}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.onlineStatus}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleOnlineStatus(true)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200"
                >
                  {t.online}
                </button>
                <button
                  onClick={() => toggleOnlineStatus(false)}
                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200"
                >
                  {t.offline}
                </button>
              </div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{t.todayAppointments}</h2>
            </div>
            <div className="p-6">
              {todayAppointments && todayAppointments.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">{appointment.patient?.fullName}</h3>
                        <p className="text-sm text-gray-600">
                          {appointment.appointmentTime} - {t[appointment.visitType as keyof typeof t]}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          appointment.status === "confirmed" ? "bg-green-100 text-green-800" :
                          appointment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {t[appointment.status as keyof typeof t]}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {appointment.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(appointment._id, "confirmed")}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              {t.confirm}
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(appointment._id, "rejected")}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              {t.reject}
                            </button>
                          </>
                        )}
                        {appointment.status === "confirmed" && (
                          <button
                            onClick={() => handleCreateRecord(appointment)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            📋 Record
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No appointments for today
                </p>
              )}
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems && lowStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Low Stock Alert</h3>
              <div className="space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item._id} className="flex justify-between items-center">
                    <span className="text-red-700">{item.name}</span>
                    <span className="text-red-600 font-medium">{item.quantity} left</span>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 5 && (
                <p className="text-red-600 text-sm mt-2">
                  +{lowStockItems.length - 5} more items need restocking
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && <AnalyticsDashboard />}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Inventory Management</h2>
            </div>
            <div className="p-6">
              {inventoryItems && inventoryItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-left py-2">Category</th>
                        <th className="text-left py-2">Quantity</th>
                        <th className="text-left py-2">Min Qty</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => (
                        <tr key={item._id} className="border-b">
                          <td className="py-2 font-medium">{item.name}</td>
                          <td className="py-2 capitalize">{item.category}</td>
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2">{item.minQuantity}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.status === "in_stock" ? "bg-green-100 text-green-800" :
                              item.status === "low_stock" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2">${item.unitPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No inventory items found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Billing & Invoices</h2>
            </div>
            <div className="p-6">
              {myInvoices && myInvoices.length > 0 ? (
                <div className="space-y-4">
                  {myInvoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600">
                          {invoice.otherUser?.fullName} - {invoice.issueDate}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          invoice.status === "paid" ? "bg-green-100 text-green-800" :
                          invoice.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${invoice.total}</p>
                        <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No invoices found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">{t.myAppointments}</h2>
          </div>
          <div className="p-6">
            {myAppointments && myAppointments.length > 0 ? (
              <div className="space-y-4">
                {myAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{appointment.otherUser?.fullName}</h3>
                      <p className="text-sm text-gray-600">
                        {appointment.appointmentDate} at {appointment.appointmentTime}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t[appointment.visitType as keyof typeof t]}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        appointment.status === "confirmed" ? "bg-green-100 text-green-800" :
                        appointment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        appointment.status === "completed" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {t[appointment.status as keyof typeof t]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(appointment._id, "confirmed")}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            {t.confirm}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(appointment._id, "rejected")}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            {t.reject}
                          </button>
                        </>
                      )}
                      {appointment.status === "confirmed" && (
                        <button
                          onClick={() => handleCreateRecord(appointment)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          📋 Create Record
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No appointments found
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">{t.notifications}</h2>
          </div>
          <div className="p-6">
            {notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 border rounded-lg ${
                      notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <h3 className="font-semibold">{notification.title}</h3>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No notifications
              </p>
            )}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">{t.profile}</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Profile settings coming soon...
            </p>
          </div>
        </div>
      )}

      {/* Medical Record Form Modal */}
      {showMedicalRecordForm && selectedAppointment && (
        <MedicalRecordForm
          patientId={selectedAppointment.patientId}
          appointmentId={selectedAppointment._id}
          onClose={() => {
            setShowMedicalRecordForm(false);
            setSelectedAppointment(null);
          }}
          onSuccess={() => {
            // Refresh appointments
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
