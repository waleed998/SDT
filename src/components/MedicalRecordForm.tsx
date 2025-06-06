import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface MedicalRecordFormProps {
  patientId: Id<"users">;
  appointmentId: Id<"appointments">;
  onClose: () => void;
  onSuccess: () => void;
}

export function MedicalRecordForm({ patientId, appointmentId, onClose, onSuccess }: MedicalRecordFormProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIDiagnosis, setShowAIDiagnosis] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");

  const createMedicalRecord = useMutation(api.medicalRecords.createMedicalRecord);
  const suggestDiagnosis = useMutation(api.medicalRecords.suggestDiagnosis as any);

  const [formData, setFormData] = useState({
    diagnosis: "",
    treatment: "",
    prescription: "",
    doctorNotes: "",
    followUpRequired: false,
    followUpDate: "",
    symptoms: [] as string[],
    vitalSigns: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
    },
    teethChart: {} as Record<string, string>,
  });

  const [currentSymptom, setCurrentSymptom] = useState("");

  const handleAddSymptom = () => {
    if (currentSymptom.trim()) {
      setFormData({
        ...formData,
        symptoms: [...formData.symptoms, currentSymptom.trim()],
      });
      setCurrentSymptom("");
    }
  };

  const handleRemoveSymptom = (index: number) => {
    setFormData({
      ...formData,
      symptoms: formData.symptoms.filter((_, i) => i !== index),
    });
  };

  const handleAIDiagnosis = async () => {
    if (formData.symptoms.length === 0) {
      toast.error("Please add symptoms first");
      return;
    }

    setShowAIDiagnosis(true);
    try {
      const result = await suggestDiagnosis({
        symptoms: formData.symptoms,
        patientAge: undefined, // Would get from patient profile
        patientGender: undefined,
        medicalHistory: "",
      });
      setAiSuggestion(result.suggestion);
    } catch (error) {
      toast.error("Failed to get AI diagnosis");
      setAiSuggestion("AI diagnosis service is currently unavailable.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createMedicalRecord({
        patientId,
        appointmentId,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        prescription: formData.prescription || undefined,
        doctorNotes: formData.doctorNotes,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpDate || undefined,
        symptoms: formData.symptoms,
        vitalSigns: {
          bloodPressure: formData.vitalSigns.bloodPressure || undefined,
          heartRate: formData.vitalSigns.heartRate ? Number(formData.vitalSigns.heartRate) : undefined,
          temperature: formData.vitalSigns.temperature ? Number(formData.vitalSigns.temperature) : undefined,
        },
        teethChart: Object.keys(formData.teethChart).length > 0 ? formData.teethChart : undefined,
      });

      toast.success("Medical record created successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to create medical record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const teethNumbers = [
    // Upper right
    [18, 17, 16, 15, 14, 13, 12, 11],
    // Upper left
    [21, 22, 23, 24, 25, 26, 27, 28],
    // Lower left
    [31, 32, 33, 34, 35, 36, 37, 38],
    // Lower right
    [41, 42, 43, 44, 45, 46, 47, 48],
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Create Medical Record</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Symptoms Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                placeholder="Add symptom..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSymptom())}
              />
              <button
                type="button"
                onClick={handleAddSymptom}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.symptoms.map((symptom, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {symptom}
                  <button
                    type="button"
                    onClick={() => handleRemoveSymptom(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {formData.symptoms.length > 0 && (
              <button
                type="button"
                onClick={handleAIDiagnosis}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
              >
                🤖 Get AI Diagnosis Suggestion
              </button>
            )}
          </div>

          {/* AI Diagnosis Suggestion */}
          {showAIDiagnosis && aiSuggestion && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">🤖 AI Diagnosis Suggestion</h3>
              <div className="text-sm text-purple-700 whitespace-pre-wrap">
                {aiSuggestion}
              </div>
              <p className="text-xs text-purple-600 mt-2 italic">
                ⚠️ This is an AI suggestion. Please verify with your clinical judgment.
              </p>
            </div>
          )}

          {/* Vital Signs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Vital Signs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Pressure
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={formData.vitalSigns.bloodPressure}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={formData.vitalSigns.heartRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, heartRate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.vitalSigns.temperature}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, temperature: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Teeth Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Dental Chart</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {teethNumbers.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 mb-2">
                  {row.map((toothNum) => (
                    <div key={toothNum} className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{toothNum}</div>
                      <select
                        value={formData.teethChart[`tooth${toothNum}`] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          teethChart: {
                            ...formData.teethChart,
                            [`tooth${toothNum}`]: e.target.value
                          }
                        })}
                        className="w-16 h-8 text-xs border border-gray-300 rounded"
                      >
                        <option value="">OK</option>
                        <option value="cavity">Cavity</option>
                        <option value="filling">Filling</option>
                        <option value="crown">Crown</option>
                        <option value="missing">Missing</option>
                        <option value="root_canal">Root Canal</option>
                        <option value="extraction">Extraction</option>
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis and Treatment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis *
              </label>
              <textarea
                required
                rows={4}
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatment *
              </label>
              <textarea
                required
                rows={4}
                value={formData.treatment}
                onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Prescription */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prescription
            </label>
            <textarea
              rows={3}
              value={formData.prescription}
              onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Medications, dosage, instructions..."
            />
          </div>

          {/* Doctor Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor Notes *
            </label>
            <textarea
              required
              rows={4}
              value={formData.doctorNotes}
              onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes, observations, recommendations..."
            />
          </div>

          {/* Follow-up */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="followUp"
                checked={formData.followUpRequired}
                onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                Follow-up required
              </label>
            </div>
            {formData.followUpRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create Medical Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
