import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getHealthTip } from '../../lib/ai';
import { 
  Stethoscope, AlertTriangle, Brain, Thermometer, 
  Heart, Activity, Clock, X, Send, Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ENABLE_AI = import.meta.env.VITE_ENABLE_AI === 'true';

interface SymptomAnalyzerProps {
  petId: string;
  petName: string;
  petSpecies: string;
  onAnalysisComplete?: (analysis: any) => void;
}

interface SymptomData {
  symptoms: string[];
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  appetite: 'normal' | 'decreased' | 'increased' | 'none';
  energy: 'normal' | 'decreased' | 'increased';
  behavior_changes: string;
  additional_notes: string;
}

const SymptomAnalyzer: React.FC<SymptomAnalyzerProps> = ({
  petId,
  petName,
  petSpecies,
  onAnalysisComplete
}) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [symptomData, setSymptomData] = useState<SymptomData>({
    symptoms: [],
    duration: '',
    severity: 'mild',
    appetite: 'normal',
    energy: 'normal',
    behavior_changes: '',
    additional_notes: ''
  });

  const commonSymptoms = [
    'Vomiting', 'Diarrhea', 'Loss of appetite', 'Lethargy', 'Coughing',
    'Sneezing', 'Limping', 'Excessive drinking', 'Excessive urination',
    'Difficulty breathing', 'Skin irritation', 'Hair loss', 'Bad breath',
    'Excessive scratching', 'Hiding behavior', 'Aggression', 'Restlessness'
  ];

  const toggleSymptom = (symptom: string) => {
    setSymptomData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const analyzeSymptoms = async () => {
    if (!profile || symptomData.symptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    setAnalyzing(true);

    try {
      let analysisData;

      if (ENABLE_AI) {
        // Use OpenAI for real analysis
        const symptomsText = `${petSpecies} named ${petName} showing: ${symptomData.symptoms.join(', ')}. Duration: ${symptomData.duration}. Severity: ${symptomData.severity}. Additional notes: ${symptomData.additional_notes}`;
        const aiTip = await getHealthTip(symptomsText);
        
        analysisData = {
          analysis_type: 'ai_generated',
          urgency_level: symptomData.severity === 'severe' ? 'high' : symptomData.severity === 'moderate' ? 'medium' : 'low',
          recommendations: [aiTip || 'Monitor your pet and consult a veterinarian if symptoms persist'],
          when_to_see_vet: symptomData.severity === 'severe' 
            ? 'Seek immediate veterinary attention'
            : 'Monitor for 24-48 hours, contact vet if symptoms worsen',
          disclaimer: 'This AI analysis is for informational purposes only. Always consult with a qualified veterinarian.',
          generated_at: new Date().toISOString()
        };
      } else {
        // Mock analysis for demo
        analysisData = {
          analysis_type: 'mock',
          urgency_level: symptomData.severity === 'severe' ? 'high' : symptomData.severity === 'moderate' ? 'medium' : 'low',
          recommendations: [
            'Monitor your pet closely for any changes',
            'Ensure your pet stays hydrated',
            'Contact your veterinarian if symptoms worsen'
          ],
          when_to_see_vet: 'Schedule a veterinary appointment to discuss these symptoms',
          disclaimer: 'This is a demo analysis. Always consult with a qualified veterinarian.',
          generated_at: new Date().toISOString()
        };
      }

      // Save analysis to health records
      const { error: recordError } = await supabase
        .from('health_records')
        .insert({
          pet_id: petId,
          type: 'symptom',
          title: `Symptom Analysis - ${new Date().toLocaleDateString()}`,
          description: `Symptoms: ${symptomData.symptoms.join(', ')}`,
          date: new Date().toISOString().split('T')[0],
          symptom_analysis: analysisData
        });

      if (recordError) {
        console.error('Error saving analysis:', recordError);
        toast.error('Failed to save analysis');
        return;
      }

      toast.success(ENABLE_AI ? 'AI analysis completed and saved!' : 'Symptom analysis saved!');
      setIsOpen(false);
      resetForm();
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData);
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      toast.error('Failed to analyze symptoms');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetForm = () => {
    setSymptomData({
      symptoms: [],
      duration: '',
      severity: 'mild',
      appetite: 'normal',
      energy: 'normal',
      behavior_changes: '',
      additional_notes: ''
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Brain className="h-4 w-4" />
        <span>AI Symptom Analyzer</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">AI Symptom Analyzer</h2>
                      <p className="text-sm text-gray-600">for {petName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Disclaimer */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Important Disclaimer</p>
                        <p>This AI analysis is for informational purposes only and should not replace professional veterinary care. Always consult with a qualified veterinarian for proper diagnosis and treatment.</p>
                      </div>
                    </div>
                  </div>

                  {/* Symptoms Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What symptoms have you observed? *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {commonSymptoms.map((symptom) => (
                        <button
                          key={symptom}
                          type="button"
                          onClick={() => toggleSymptom(symptom)}
                          className={`p-2 text-sm rounded-lg border transition-colors ${
                            symptomData.symptoms.includes(symptom)
                              ? 'border-purple-600 bg-purple-50 text-purple-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration and Severity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How long have symptoms been present? *
                      </label>
                      <select
                        value={symptomData.duration}
                        onChange={(e) => setSymptomData(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="">Select duration</option>
                        <option value="less_than_hour">Less than 1 hour</option>
                        <option value="few_hours">A few hours</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Since yesterday</option>
                        <option value="few_days">A few days</option>
                        <option value="week">About a week</option>
                        <option value="weeks">Several weeks</option>
                        <option value="month_plus">A month or more</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity Level *
                      </label>
                      <select
                        value={symptomData.severity}
                        onChange={(e) => setSymptomData(prev => ({ ...prev, severity: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="mild">Mild - Minor discomfort</option>
                        <option value="moderate">Moderate - Noticeable impact</option>
                        <option value="severe">Severe - Significant distress</option>
                      </select>
                    </div>
                  </div>

                  {/* Appetite and Energy */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appetite Changes
                      </label>
                      <select
                        value={symptomData.appetite}
                        onChange={(e) => setSymptomData(prev => ({ ...prev, appetite: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="normal">Normal appetite</option>
                        <option value="decreased">Decreased appetite</option>
                        <option value="increased">Increased appetite</option>
                        <option value="none">No appetite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Energy Level
                      </label>
                      <select
                        value={symptomData.energy}
                        onChange={(e) => setSymptomData(prev => ({ ...prev, energy: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="normal">Normal energy</option>
                        <option value="decreased">Low energy/lethargic</option>
                        <option value="increased">Hyperactive/restless</option>
                      </select>
                    </div>
                  </div>

                  {/* Behavior Changes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Behavior Changes
                    </label>
                    <textarea
                      value={symptomData.behavior_changes}
                      onChange={(e) => setSymptomData(prev => ({ ...prev, behavior_changes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Any unusual behaviors you've noticed..."
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={symptomData.additional_notes}
                      onChange={(e) => setSymptomData(prev => ({ ...prev, additional_notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Any other details that might be relevant..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={analyzeSymptoms}
                      disabled={analyzing || symptomData.symptoms.length === 0 || !symptomData.duration}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          <span>{ENABLE_AI ? 'AI Analyze' : 'Analyze Symptoms'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SymptomAnalyzer;