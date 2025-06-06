import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner";

export function PatientDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const myAppointments = useQuery(api.appointments.getMyAppointments);
  const notifications = useQuery(api.notifications.getMyNotifications);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const activeDoctors = useQuery(api.users.getActiveDoctors);
  
  const bookAppointment = useMutation(api.appointments.bookAppointment);

  const [bookingForm, setBookingForm] = useState({
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    visitType: "consultation" as const,
    notes: "",
  });

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookAppointment({
        doctorId: bookingForm.doctorId as any,
        appointmentDate: bookingForm.appointmentDate,
        appointmentTime: bookingForm.appointmentTime,
        visitType: bookingForm.visitType,
        notes: bookingForm.notes || undefined,
      });
      toast.success("Appointment request sent!");
      setShowBookingForm(false);
      setBookingForm({
        doctorId: "",
        appointmentDate: "",
        appointmentTime: "",
        visitType: "consultation",
        notes: "",
      });
    } catch (error) {
      toast.error(t.error);
    }
  };

  const visitTypes = [
    "consultation",
    "pain",
    "cleaning",
    "filling",
    "extraction",
    "checkup",
    "other",
  ];

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: "dashboard", label: t.dashboard, icon: "📊" },
          { id: "appointments", label: t.myAppointments, icon: "📅" },
          { id: "notifications", label: t.notifications, icon: "🔔", badge: unreadCount },
          { id: "profile", label: t.profile, icon: "👤" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors relative ${
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.myAppointments}</h3>
              <p className="text-3xl font-bold text-blue-600">
                {myAppointments?.length || 0}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.notifications}</h3>
              <p className="text-3xl font-bold text-orange-600">
                {unreadCount || 0}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">{t.selectDoctor}</h3>
              <p className="text-3xl font-bold text-green-600">
                {activeDoctors?.length || 0}
              </p>
            </div>
          </div>

          {/* Quick Book Appointment */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{t.bookAppointment}</h2>
                <button
                  onClick={() => setShowBookingForm(!showBookingForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {showBookingForm ? t.cancel : t.bookAppointment}
                </button>
              </div>
            </div>
            
            {showBookingForm && (
              <div className="p-6">
                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.selectDoctor} *
                      </label>
                      <select
                        required
                        value={bookingForm.doctorId}
                        onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t.selectDoctor}</option>
                        {activeDoctors?.map((doctor) => (
                          <option key={doctor._id} value={doctor.userId}>
                            {doctor.fullName} {doctor.doctorProfile?.specialization && `- ${doctor.doctorProfile.specialization}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.visitType} *
                      </label>
                      <select
                        required
                        value={bookingForm.visitType}
                        onChange={(e) => setBookingForm({ ...bookingForm, visitType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {visitTypes.map((type) => (
                          <option key={type} value={type}>
                            {t[type as keyof typeof t]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.appointmentDate} *
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingForm.appointmentDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.appointmentTime} *
                      </label>
                      <select
                        required
                        value={bookingForm.appointmentTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, appointmentTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t.appointmentTime}</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.notes}
                    </label>
                    <textarea
                      rows={3}
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {t.bookAppointment}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Recent {t.myAppointments}</h2>
            </div>
            <div className="p-6">
              {myAppointments && myAppointments.length > 0 ? (
                <div className="space-y-4">
                  {myAppointments.slice(0, 3).map((appointment) => (
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
                      {appointment.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {t.notes}: {appointment.notes}
                        </p>
                      )}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        appointment.status === "confirmed" ? "bg-green-100 text-green-800" :
                        appointment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        appointment.status === "completed" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {t[appointment.status as keyof typeof t]}
                      </span>
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
    </div>
  );
}
