import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet, HealthRecord } from '../../lib/supabase';
import { 
  Activity, Calendar, AlertTriangle, CheckCircle, 
  Clock, Stethoscope, Shield, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface PetHealthSummaryProps {
  pet: Pet;
}

interface HealthSummary {
  lastCheckup?: string;
  nextVaccination?: string;
  totalRecords: number;
  recentSymptoms: number;
  healthScore: number;
  urgentItems: Array<{
    type: string;
    message: string;
    date?: string;
  }>;
}

const PetHealthSummary: React.FC<PetHealthSummaryProps> = ({ pet }) => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<HealthSummary>({
    totalRecords: 0,
    recentSymptoms: 0,
    healthScore: 0,
    urgentItems: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && pet.id) {
      loadHealthSummary();
    }
  }, [profile, pet.id]);

  const loadHealthSummary = async () => {
    try {
      const { data: records } = await supabase
        .from('health_records')
        .select('*')
        .eq('pet_id', pet.id)
        .order('date', { ascending: false });

      if (records) {
        const totalRecords = records.length;
        
        // Find last checkup
        const lastCheckup = records.find(r => r.type === 'checkup')?.date;
        
        // Find next vaccination
        const nextVaccination = records
          .filter(r => r.type === 'vaccination' && new Date(r.date) > new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date;

        // Count recent symptoms (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSymptoms = records.filter(r => 
          r.type === 'symptom' && new Date(r.date) >= thirtyDaysAgo
        ).length;

        // Calculate health score
        let healthScore = 70; // Base score
        if (lastCheckup) {
          const daysSinceCheckup = Math.floor(
            (new Date().getTime() - new Date(lastCheckup).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceCheckup < 365) healthScore += 20;
          if (daysSinceCheckup < 180) healthScore += 10;
        }
        if (nextVaccination) healthScore += 10;
        if (recentSymptoms === 0) healthScore += 10;

        // Generate urgent items
        const urgentItems = [];
        if (!lastCheckup || new Date().getTime() - new Date(lastCheckup).getTime() > 365 * 24 * 60 * 60 * 1000) {
          urgentItems.push({
            type: 'checkup',
            message: 'Annual checkup overdue'
          });
        }
        if (recentSymptoms > 2) {
          urgentItems.push({
            type: 'symptoms',
            message: `${recentSymptoms} symptoms recorded recently`
          });
        }

        setSummary({
          lastCheckup,
          nextVaccination,
          totalRecords,
          recentSymptoms,
          healthScore: Math.min(100, healthScore),
          urgentItems
        });
      }
    } catch (error) {
      console.error('Error loading health summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Health Summary</h3>
        <Link
          to={`/health?pet=${pet.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Health Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Health Score</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreColor(summary.healthScore)}`}>
          {summary.healthScore}/100
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{summary.totalRecords}</div>
          <div className="text-xs text-gray-600">Records</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{summary.recentSymptoms}</div>
          <div className="text-xs text-gray-600">Recent Symptoms</div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="space-y-2 text-sm">
        {summary.lastCheckup && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Last Checkup:</span>
            <span className="font-medium text-gray-900">
              {new Date(summary.lastCheckup).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {summary.nextVaccination && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Next Vaccination:</span>
            <span className="font-medium text-gray-900">
              {new Date(summary.nextVaccination).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Urgent Items */}
      {summary.urgentItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {summary.urgentItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-700">{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PetHealthSummary;