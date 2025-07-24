import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';

const ProductionMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState({
    uptime: 99.8,
    avg_response_time: 1.2,
    total_conversations: 1247,
    satisfaction_score: 4.6,
    error_rate: 0.2,
    active_users: 34
  });

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      message: 'Response time increased by 15% in the last hour',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      resolved: false
    },
    {
      id: 2,
      type: 'info',
      message: 'New prompt version deployed successfully',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolved: true
    },
    {
      id: 3,
      type: 'error',
      message: 'API rate limit exceeded - auto-scaling triggered',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      resolved: true
    }
  ]);

  const [performanceData] = useState([
    { time: '00:00', consistency: 89, engagement: 92, brand_alignment: 88 },
    { time: '04:00', consistency: 91, engagement: 89, brand_alignment: 90 },
    { time: '08:00', consistency: 87, engagement: 85, brand_alignment: 86 },
    { time: '12:00', consistency: 93, engagement: 94, brand_alignment: 92 },
    { time: '16:00', consistency: 90, engagement: 88, brand_alignment: 89 },
    { time: '20:00', consistency: 92, engagement: 91, brand_alignment: 91 },
  ]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getAlertBg = (type: string, resolved: boolean) => {
    if (resolved) return 'bg-slate-700/30 border-slate-600/30';
    
    switch (type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Production Monitor</h2>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">Uptime</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.uptime}%</div>
        </div>

        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-400">Avg Response</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.avg_response_time}s</div>
        </div>

        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-400">Conversations</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.total_conversations}</div>
        </div>

        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Satisfaction</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.satisfaction_score}/5</div>
        </div>

        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm text-slate-400">Error Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.error_rate}%</div>
        </div>

        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-400">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.active_users}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Trends (24h)</h3>
          
          <div className="space-y-4">
            {performanceData.map((data, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="text-sm text-slate-400 w-12">{data.time}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Consistency</span>
                    <div className="flex-1 bg-slate-800/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full"
                        style={{ width: `${data.consistency}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 w-8">{data.consistency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Engagement</span>
                    <div className="flex-1 bg-slate-800/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                        style={{ width: `${data.engagement}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 w-8">{data.engagement}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Brand Align</span>
                    <div className="flex-1 bg-slate-800/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full"
                        style={{ width: `${data.brand_alignment}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 w-8">{data.brand_alignment}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Alerts</h3>
          
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`rounded-lg border p-3 ${getAlertBg(alert.type, alert.resolved)}`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className={`text-sm ${alert.resolved ? 'text-slate-400' : 'text-slate-200'}`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTime(alert.timestamp)}
                      {alert.resolved && <span className="ml-2 text-green-400">• Resolved</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-600/50">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Automated Monitoring</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div>• Response time threshold: &gt;2s</div>
              <div>• Consistency score threshold: &lt;80%</div>
              <div>• Error rate threshold: &gt;5%</div>
              <div>• Satisfaction score threshold: &lt;4.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionMonitor;