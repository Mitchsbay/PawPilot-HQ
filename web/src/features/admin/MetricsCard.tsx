import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { 
  BarChart, TrendingUp, Users, Activity, 
  Calendar, RefreshCw, Download, Filter
} from "lucide-react";
import { motion } from "framer-motion";

interface MetricRow {
  d: string;
  name: string;
  cnt: number;
}

interface MetricsSummary {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{ name: string; count: number }>;
  dailyGrowth: number;
}

const MetricsCard: React.FC = () => {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [summary, setSummary] = useState<MetricsSummary>({
    totalEvents: 0,
    uniqueUsers: 0,
    topEvents: [],
    dailyGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      // Refresh materialized view
      await refreshMetrics();

      // Load daily metrics
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: metricsData } = await supabase
        .from('mv_daily_metrics')
        .select('*')
        .gte('d', startDate.toISOString().split('T')[0])
        .order('d', { ascending: false })
        .limit(daysBack);

      setRows(metricsData || []);

      // Calculate summary statistics
      if (metricsData && metricsData.length > 0) {
        const totalEvents = metricsData.reduce((sum, row) => sum + row.cnt, 0);
        
        // Group by event name to get top events
        const eventCounts = metricsData.reduce((acc, row) => {
          acc[row.name] = (acc[row.name] || 0) + row.cnt;
          return acc;
        }, {} as Record<string, number>);

        const topEvents = Object.entries(eventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        // Calculate daily growth (simplified)
        const recentDays = metricsData.slice(0, 7);
        const olderDays = metricsData.slice(7, 14);
        const recentAvg = recentDays.reduce((sum, row) => sum + row.cnt, 0) / recentDays.length;
        const olderAvg = olderDays.reduce((sum, row) => sum + row.cnt, 0) / olderDays.length;
        const dailyGrowth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        setSummary({
          totalEvents,
          uniqueUsers: 0, // Would need separate query
          topEvents,
          dailyGrowth: Math.round(dailyGrowth * 100) / 100
        });
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      await supabase.rpc('refresh_mv_daily_metrics');
    } catch (error) {
      console.warn('Error refreshing metrics view:', error);
      // Continue anyway - view might not exist yet
    } finally {
      setRefreshing(false);
    }
  };

  const exportMetrics = () => {
    const csv = [
      'Date,Event,Count',
      ...rows.map(row => `${row.d},${row.name},${row.cnt}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pawpilot-metrics-${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Platform Metrics</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={refreshMetrics}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={exportMetrics}
            className="p-2 text-gray-600 hover:text-green-600 transition-colors"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {summary.totalEvents.toLocaleString()}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Daily Growth</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {summary.dailyGrowth > 0 ? '+' : ''}{summary.dailyGrowth}%
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Time Range</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {timeRange.replace('d', ' days')}
          </p>
        </div>
      </div>

      {/* Top Events */}
      {summary.topEvents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Events</h3>
          <div className="space-y-2">
            {summary.topEvents.map((event, index) => (
              <div key={event.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{event.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {event.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Events Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Daily Activity</h3>
        {rows.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rows.slice(0, 30).map((row, index) => (
              <motion.div
                key={`${row.d}-${row.name}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-20">
                    {new Date(row.d).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{row.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{row.cnt}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No metrics data available for the selected time range</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard;