import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet, HealthRecord } from '../../lib/supabase';
import { 
  TrendingUp, AlertTriangle, Calendar, DollarSign, 
  Activity, Shield, Heart, Clock, Award
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HealthInsightsProps {
  selectedPetId?: string;
}

interface HealthInsight {
  totalRecords: number;
  totalCost: number;
  lastCheckup?: string;
  upcomingVaccinations: number;
  mostCommonType: string;
  healthScore: number;
  recommendations: string[];
  costTrend: 'up' | 'down' | 'stable';
  recentActivity: Array<{
    type: string;
    count: number;
    month: string;
  }>;
}

const HealthInsights: React.FC<HealthInsightsProps> = ({ selectedPetId }) => {
  const { profile } = useAuth();
  const [insights, setInsights] = useState<HealthInsight>({
    totalRecords: 0,
    totalCost: 0,
    upcomingVaccinations: 0,
    mostCommonType: '',
    healthScore: 0,
    recommendations: [],
    costTrend: 'stable',
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    if (profile) {
      loadInsights();
    }
  }, [profile, selectedPetId]);

  const loadInsights = async () => {
    if (!profile) return;

    try {
      // Load pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id);

      setPets(petsData || []);

      // Load health records
      let query = supabase
        .from('health_records')
        .select(`
          *,
          pets!inner(id, name, owner_id)
        `)
        .eq('pets.owner_id', profile.id);

      if (selectedPetId) {
        query = query.eq('pet_id', selectedPetId);
      }

      const { data: records } = await query.order('date', { ascending: false });

      if (records) {
        // Calculate insights
        const totalRecords = records.length;
        const totalCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // Find last checkup
        const lastCheckup = records.find(r => r.type === 'checkup')?.date;
        
        // Count upcoming vaccinations (future vaccination records)
        const upcomingVaccinations = records.filter(r => 
          r.type === 'vaccination' && new Date(r.date) > new Date()
        ).length;

        // Most common record type
        const typeCounts = records.reduce((acc, record) => {
          acc[record.type] = (acc[record.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommonType = Object.entries(typeCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

        // Calculate health score (simplified)
        let healthScore = 70; // Base score
        if (lastCheckup) {
          const daysSinceCheckup = Math.floor(
            (new Date().getTime() - new Date(lastCheckup).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceCheckup < 365) healthScore += 20;
          if (daysSinceCheckup < 180) healthScore += 10;
        }
        if (upcomingVaccinations > 0) healthScore += 10;

        // Generate recommendations
        const recommendations = [];
        if (!lastCheckup || new Date().getTime() - new Date(lastCheckup).getTime() > 365 * 24 * 60 * 60 * 1000) {
          recommendations.push('Schedule an annual checkup');
        }
        if (upcomingVaccinations === 0) {
          recommendations.push('Check vaccination schedule');
        }
        if (totalRecords < 3) {
          recommendations.push('Keep detailed health records');
        }

        // Calculate cost trend (simplified)
        const recentCosts = records.slice(0, 5).map(r => r.cost || 0);
        const olderCosts = records.slice(5, 10).map(r => r.cost || 0);
        const recentAvg = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
        const olderAvg = olderCosts.reduce((a, b) => a + b, 0) / olderCosts.length;
        
        let costTrend: 'up' | 'down' | 'stable' = 'stable';
        if (recentAvg > olderAvg * 1.2) costTrend = 'up';
        else if (recentAvg < olderAvg * 0.8) costTrend = 'down';

        // Recent activity by month
        const recentActivity = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthRecords = records.filter(r => {
            const recordDate = new Date(r.date);
            return recordDate >= monthStart && recordDate <= monthEnd;
          });

          recentActivity.push({
            type: 'records',
            count: monthRecords.length,
            month: date.toLocaleDateString('en-US', { month: 'short' })
          });
        }

        setInsights({
          totalRecords,
          totalCost,
          lastCheckup,
          upcomingVaccinations,
          mostCommonType,
          healthScore: Math.min(100, healthScore),
          recommendations,
          costTrend,
          recentActivity
        });
      }
    } catch (error) {
      console.error('Error loading health insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{insights.totalRecords}</h3>
              <p className="text-gray-600">Health Records</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">${insights.totalCost}</h3>
              <p className="text-gray-600">Total Spent</p>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingUp className={`h-3 w-3 ${
                  insights.costTrend === 'up' ? 'text-red-500' :
                  insights.costTrend === 'down' ? 'text-green-500' : 'text-gray-500'
                }`} />
                <span className="text-gray-500 capitalize">{insights.costTrend}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{insights.upcomingVaccinations}</h3>
              <p className="text-gray-600">Upcoming Vaccines</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{insights.healthScore}</h3>
              <p className="text-gray-600">Health Score</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Health Recommendations */}
      {insights.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Heart className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Health Recommendations</h3>
          </div>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Health Activity</h3>
        <div className="flex items-end space-x-2 h-32">
          {insights.recentActivity.map((month, index) => {
            const maxCount = Math.max(...insights.recentActivity.map(m => m.count));
            const height = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-600 rounded-t transition-all duration-500"
                  style={{ height: `${height}%` }}
                  title={`${month.count} records in ${month.month}`}
                />
                <span className="text-xs text-gray-500 mt-2">{month.month}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default HealthInsights;