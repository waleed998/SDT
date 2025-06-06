import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const translations = {
  en: {
    // App
    appName: "Smart Dental Tool",
    welcomeTitle: "Welcome to SDT",
    welcomeSubtitle: "Smart Dental Management System",
    
    // Roles
    doctor: "Doctor",
    patient: "Patient",
    selectRole: "Select Your Role",
    areYouDoctor: "Are you a doctor or a patient?",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    reject: "Reject",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Profile
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    email: "Email",
    gender: "Gender",
    age: "Age",
    male: "Male",
    female: "Female",
    
    // Appointments
    bookAppointment: "Book Appointment",
    myAppointments: "My Appointments",
    todayAppointments: "Today's Appointments",
    appointmentDate: "Appointment Date",
    appointmentTime: "Appointment Time",
    visitType: "Visit Type",
    status: "Status",
    notes: "Notes",
    
    // Visit Types
    consultation: "Consultation",
    pain: "Pain",
    cleaning: "Cleaning",
    filling: "Filling",
    extraction: "Extraction",
    checkup: "Checkup",
    other: "Other",
    
    // Status
    pending: "Pending",
    confirmed: "Confirmed",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
    
    // Dashboard
    dashboard: "Dashboard",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    
    // Doctor specific
    workingHours: "Working Hours",
    sessionDuration: "Session Duration",
    onlineStatus: "Online Status",
    online: "Online",
    offline: "Offline",
    
    // Patient specific
    selectDoctor: "Select Doctor",
    medicalHistory: "Medical History",
    allergies: "Allergies",
    chronicDiseases: "Chronic Diseases",
    specialNotes: "Special Notes",
    
    // New features
    analytics: "Analytics",
    inventory: "Inventory",
    billing: "Billing",
    medicalRecord: "Medical Record",
    diagnosis: "Diagnosis",
    treatment: "Treatment",
    prescription: "Prescription",
    symptoms: "Symptoms",
    vitalSigns: "Vital Signs",
    bloodPressure: "Blood Pressure",
    heartRate: "Heart Rate",
    temperature: "Temperature",
    teethChart: "Dental Chart",
    aiDiagnosis: "AI Diagnosis",
    lowStock: "Low Stock",
    invoice: "Invoice",
    totalRevenue: "Total Revenue",
    completionRate: "Completion Rate",
  },
  ar: {
    // App
    appName: "أداة الأسنان الذكية",
    welcomeTitle: "مرحباً بك في SDT",
    welcomeSubtitle: "نظام إدارة الأسنان الذكي",
    
    // Roles
    doctor: "طبيب",
    patient: "مريض",
    selectRole: "اختر دورك",
    areYouDoctor: "هل أنت طبيب أم مريض؟",
    
    // Common
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    confirm: "تأكيد",
    reject: "رفض",
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجح",
    
    // Profile
    fullName: "الاسم الكامل",
    phoneNumber: "رقم الهاتف",
    email: "البريد الإلكتروني",
    gender: "الجنس",
    age: "العمر",
    male: "ذكر",
    female: "أنثى",
    
    // Appointments
    bookAppointment: "حجز موعد",
    myAppointments: "مواعيدي",
    todayAppointments: "مواعيد اليوم",
    appointmentDate: "تاريخ الموعد",
    appointmentTime: "وقت الموعد",
    visitType: "نوع الزيارة",
    status: "الحالة",
    notes: "ملاحظات",
    
    // Visit Types
    consultation: "استشارة",
    pain: "ألم",
    cleaning: "تنظيف",
    filling: "حشو",
    extraction: "خلع",
    checkup: "فحص",
    other: "أخرى",
    
    // Status
    pending: "في الانتظار",
    confirmed: "مؤكد",
    rejected: "مرفوض",
    completed: "مكتمل",
    cancelled: "ملغي",
    
    // Dashboard
    dashboard: "لوحة التحكم",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    
    // Doctor specific
    workingHours: "ساعات العمل",
    sessionDuration: "مدة الجلسة",
    onlineStatus: "حالة الاتصال",
    online: "متصل",
    offline: "غير متصل",
    
    // Patient specific
    selectDoctor: "اختر الطبيب",
    medicalHistory: "التاريخ الطبي",
    allergies: "الحساسية",
    chronicDiseases: "الأمراض المزمنة",
    specialNotes: "ملاحظات خاصة",
    
    // New features
    analytics: "التحليلات",
    inventory: "المخزون",
    billing: "الفواتير",
    medicalRecord: "السجل الطبي",
    diagnosis: "التشخيص",
    treatment: "العلاج",
    prescription: "الوصفة الطبية",
    symptoms: "الأعراض",
    vitalSigns: "العلامات الحيوية",
    bloodPressure: "ضغط الدم",
    heartRate: "معدل ضربات القلب",
    temperature: "درجة الحرارة",
    teethChart: "مخطط الأسنان",
    aiDiagnosis: "التشخيص بالذكاء الاصطناعي",
    lowStock: "مخزون منخفض",
    invoice: "فاتورة",
    totalRevenue: "إجمالي الإيرادات",
    completionRate: "معدل الإنجاز",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // Auto-detect device language
    const deviceLanguage = navigator.language.toLowerCase();
    if (deviceLanguage.startsWith("ar")) {
      setLanguage("ar");
    }
  }, []);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      <div dir={language === "ar" ? "rtl" : "ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
