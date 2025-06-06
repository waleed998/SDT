import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  
  const analytics = useQuery(api.analytics.getDashboardAnalytics, { period });
  const patientAnalytics = useQuery(api.analytics.getPatientAnalytics);

  if (!analytics || !patientAnalytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-md transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Appointments</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.totalAppointments}</p>
          <p className="text-sm text-gray-600 mt-1">
            {analytics.completedAppointments} completed
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Completion Rate</h3>
          <p className="text-3xl font-bold text-green-600">
            {analytics.completionRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {analytics.cancelledAppointments} cancelled
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">
            ${analytics.totalRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            ${analytics.pendingRevenue.toFixed(2)} pending
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Revenue/Visit</h3>
          <p className="text-3xl font-bold text-purple-600">
            ${analytics.averageRevenuePerAppointment.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Per completed visit</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Visit Types Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.visitTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / analytics.totalAppointments) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Patient Demographics</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Age Groups</h4>
              <div className="space-y-2">
                {Object.entries(patientAnalytics.ageGroups).map(([group, count]) => (
                  <div key={group} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{group}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Gender Distribution</h4>
              <div className="space-y-2">
                {Object.entries(patientAnalytics.genderDistribution).map(([gender, count]) => (
                  <div key={gender} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{gender}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Patient Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{patientAnalytics.totalPatients}</p>
            <p className="text-sm text-gray-600">Total Patients</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{patientAnalytics.newPatientsThisMonth}</p>
            <p className="text-sm text-gray-600">New This Month</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {patientAnalytics.topPatients[0]?.totalVisits || 0}
            </p>
            <p className="text-sm text-gray-600">Most Visits</p>
          </div>
        </div>
      </div>

      {/* Top Patients */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Top Patients by Visits</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Patient</th>
                <th className="text-left py-2">Total Visits</th>
                <th className="text-left py-2">Last Visit</th>
                <th className="text-left py-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {patientAnalytics.topPatients.slice(0, 10).map((patient, index) => (
                <tr key={patient?._id || index} className="border-b">
                  <td className="py-2">{patient?.fullName || "Unknown"}</td>
                  <td className="py-2">{patient?.totalVisits || 0}</td>
                  <td className="py-2">{patient?.lastVisit || "Never"}</td>
                  <td className="py-2">{patient?.age || "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
