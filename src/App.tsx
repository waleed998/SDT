import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { RoleSelection } from "./components/RoleSelection";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { PatientDashboard } from "./components/PatientDashboard";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { useState } from "react";

export default function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <AppContent />
        <Toaster />
      </div>
    </LanguageProvider>
  );
}

function AppContent() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const { t, language, setLanguage } = useLanguage();

  if (loggedInUser === undefined || userProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-blue-600">
            {t.appName}
          </h2>
          {userProfile && (
            <span className="text-sm text-gray-600">
              {userProfile.role === "doctor" ? t.doctor : t.patient}: {userProfile.fullName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            {language === "en" ? "العربية" : "English"}
          </button>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </div>
      </header>

      <main className="flex-1">
        <Unauthenticated>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-600 mb-4">
                  {t.welcomeTitle}
                </h1>
                <p className="text-xl text-gray-600">
                  {t.welcomeSubtitle}
                </p>
              </div>
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>

        <Authenticated>
          {!userProfile ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
              <RoleSelection />
            </div>
          ) : userProfile.role === "doctor" ? (
            <DoctorDashboard />
          ) : (
            <PatientDashboard />
          )}
        </Authenticated>
      </main>
    </>
  );
}
