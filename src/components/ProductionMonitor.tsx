import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useRef } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ProductionMonitor: React.FC = () => {
  // Remove all hardcoded metrics except those to be calculated
  // Calculate metrics from recentScores and feedback_store
  const [metrics, setMetrics] = useState({
    uptime: 100,
    total_conversations: 0,
    avg_response_time: 0,
    satisfaction: 0
  });

  // Remove alerts state and related logic
  // const [alerts, setAlerts] = useState([
  //   {
  //     id: 1,
  //     type: 'warning',
  //     message: 'Response time increased by 15% in the last hour',
  //     timestamp: new Date(Date.now() - 30 * 60 * 1000),
  //     resolved: false
  //   },
  //   {
  //     id: 2,
  //     type: 'info',
  //     message: 'New prompt version deployed successfully',
  //     timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  //     resolved: true
  //   },
  //   {
  //     id: 3,
  //     type: 'error',
  //     message: 'API rate limit exceeded - auto-scaling triggered',
  //     timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  //     resolved: true
  //   }
  // ]);

  const [performanceData] = useState([
    { time: '00:00', consistency: 89, engagement: 92, brand_alignment: 88 },
    { time: '04:00', consistency: 91, engagement: 89, brand_alignment: 90 },
    { time: '08:00', consistency: 87, engagement: 85, brand_alignment: 86 },
    { time: '12:00', consistency: 93, engagement: 94, brand_alignment: 92 },
    { time: '16:00', consistency: 90, engagement: 88, brand_alignment: 89 },
    { time: '20:00', consistency: 92, engagement: 91, brand_alignment: 91 },
  ]);

  const [promptScores, setPromptScores] = useState<{ [prompt: string]: { timestamp: string; score: number }[] }>({});
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/feedback/aggregate')
      .then(res => res.json())
      .then(data => {
        setPromptScores(data);
        const prompts = Object.keys(data);
        if (prompts.length > 0 && !selectedPrompt) setSelectedPrompt(prompts[0]);
      });
  }, []);

  // Fetch and update recent scores
  const fetchRecentScores = () => {
    fetch('http://localhost:8000/feedback/aggregate')
      .then(res => res.json())
      .then(data => {
        console.log('Raw aggregate data:', data);
        // Flatten all feedback entries, add prompt as a field
        let all: any[] = [];
        Object.entries(data).forEach(([prompt, entries]) => {
          (entries as any[]).forEach((entry: any) => {
            all.push({ ...entry, prompt });
          });
        });
        // Sort by timestamp descending, filter only by timestamp
        all = all.filter(e => e.timestamp).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        console.log('Flattened all:', all);
        setRecentScores(all.slice(0, 10).reverse()); // last 10, oldest first
      });
  };

  useEffect(() => {
    fetchRecentScores();
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(fetchRecentScores, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    // Calculate uptime as % of time since first feedback entry (simulate 100% for now)
    let uptime = 100;
    let total_conversations = 0;
    let avg_response_time = 0;
    let satisfaction = 0;
    // Use all feedback entries, not just recentScores
    fetch('http://localhost:8000/feedback/aggregate')
      .then(res => res.json())
      .then(data => {
        let all: any[] = [];
        Object.entries(data).forEach(([prompt, entries]) => {
          (entries as any[]).forEach((entry: any) => {
            all.push({ ...entry, prompt });
          });
        });
        // Uptime: simulate 100% (or calculate based on first/last timestamp)
        if (all.length > 0) {
          const timestamps = all.map(e => new Date(e.timestamp).getTime());
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          const now = Date.now();
          // Uptime as % of time since first feedback (simulate always up)
          uptime = 100;
        }
        // Total conversations: count unique session_ids
        total_conversations = new Set(all.map(e => e.session_id)).size;
        // Avg response time: average of response_time field if present
        const responseTimes = all.map(e => e.response_time).filter(t => typeof t === 'number');
        if (responseTimes.length > 0) {
          avg_response_time = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        } else {
          avg_response_time = 0;
        }
        // Satisfaction: likes / (likes + dislikes)
        const likes = all.filter(e => e.feedback === 'like').length;
        const dislikes = all.filter(e => e.feedback === 'dislike').length;
        satisfaction = likes + dislikes > 0 ? (likes / (likes + dislikes)) * 5 : 0;
        setMetrics({ uptime, total_conversations, avg_response_time, satisfaction });
      });
  }, [recentScores]);

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

  const promptOptions = Object.keys(promptScores);
  const scoreData = selectedPrompt && promptScores[selectedPrompt] ? promptScores[selectedPrompt] : [];
  const chartData = {
    labels: scoreData.map(d => d.timestamp ? new Date(d.timestamp).toLocaleString() : ''),
    datasets: [
      {
        label: 'Score',
        data: scoreData.map(d => d.score),
        borderColor: 'rgb(34,197,94)',
        backgroundColor: 'rgba(34,197,94,0.2)',
        tension: 0.3,
        pointRadius: 3,
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Prompt Score Over Time' }
    },
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: 'Score' } },
      x: { title: { display: true, text: 'Time' } }
    }
  };

  // Add debug log to inspect recentScores
  console.log('recentScores', recentScores);

  // Remove the Prompt Score Trend chart and add a Prompt Health meter
  // Calculate prompt health based on recentScores
  const healthThreshold = 80;
  const warningThreshold = 70;
  const recentOverallScores = recentScores.map(e => e.score).filter(s => typeof s === 'number');
  const avgScore = recentOverallScores.length > 0 ? recentOverallScores.reduce((a, b) => a + b, 0) / recentOverallScores.length : null;
  let healthColor = 'bg-green-500';
  let healthText = 'Prompt is healthy';
  if (avgScore !== null && avgScore < healthThreshold && avgScore >= warningThreshold) {
    healthColor = 'bg-yellow-400';
    healthText = 'Prompt quality is declining. Consider reviewing soon.';
  } else if (avgScore !== null && avgScore < warningThreshold) {
    healthColor = 'bg-red-500';
    healthText = 'Prompt quality is poor. Prompt reconsideration needed!';
  }

  // Remove all hardcoded alerts. Only show alert if avgScore < 80
  const showHealthAlert = avgScore !== null && avgScore < 80;

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-400">Uptime</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.uptime}%</div>
        </div>
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-400">Conversations</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.total_conversations}</div>
        </div>
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-400">Avg Response (s)</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.avg_response_time.toFixed(2)}</div>
        </div>
        <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-400">Satisfaction</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.satisfaction.toFixed(2)}/5</div>
        </div>
      </div>

      {/* Prompt Health Alert Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">Alert</h3>
        {/* Inappropriate message alert */}
        {recentScores.some(e => e.inappropriate === true || e.inappropriate === "true") && (
          <div className="rounded-lg p-4 mb-3 text-center text-lg font-semibold shadow flex items-center justify-center gap-3 bg-red-600 border border-red-700 text-white">
            <AlertTriangle className="inline w-6 h-6 mr-2 text-white" />🚨 Inappropriate or off-topic message detected! Please review flagged conversations.
          </div>
        )}
        {/* Prompt health alert (only if no inappropriate alert) */}
        {!recentScores.some(e => e.inappropriate === true || e.inappropriate === "true") && (
          <div className={`rounded-lg p-4 text-center text-lg font-semibold shadow flex items-center justify-center gap-3 ${avgScore !== null && avgScore < 80 ? 'bg-yellow-400/20 border border-yellow-500 text-yellow-900' : 'bg-green-600 border border-green-700 text-white'}`}>
            {avgScore !== null && avgScore < 80 ? (
              <><AlertTriangle className="inline w-6 h-6 mr-2 text-yellow-600" />⚠️ Prompt health is below 80! Please review and consider updating the prompt.</>
            ) : (
              <><CheckCircle className="inline w-6 h-6 mr-2 text-white" />✅ Prompt is performing well. No action needed.</>
            )}
          </div>
        )}
      </div>
      <div className="w-full flex flex-col items-center mb-8">
        <div className={`rounded-full w-48 h-48 flex flex-col items-center justify-center shadow-lg mb-4 ${healthColor}`}
          style={{ fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>
          {avgScore !== null ? avgScore.toFixed(1) : '--'}
          <div className="text-lg font-semibold mt-2 text-white text-center px-4">{healthText}</div>
        </div>
        <div className="text-slate-400 text-sm">Prompt Health (last 10 evaluations)</div>
      </div>
      <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6 w-full" style={{ minHeight: '500px', maxWidth: '100%' }}>
        <h3 className="text-2xl font-bold text-white mb-6">Performance Trends (Last 10 Evaluations)</h3>
        <div style={{ height: '350px' }}>
          <Line
            data={{
              labels: recentScores.map(e => e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ''),
              datasets: [
                {
                  label: 'Overall',
                  data: recentScores.map(e => e.score),
                  borderColor: 'rgb(34,197,94)',
                  backgroundColor: 'rgba(34,197,94,0.2)',
                  tension: 0.3,
                  pointRadius: 3,
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true, labels: { font: { size: 18 } } },
                title: { display: true, text: 'Recent Prompt Scores (Overall Only)', font: { size: 24 } }
              },
              scales: {
                y: { min: 0, max: 100, title: { display: true, text: 'Score', font: { size: 18 } }, ticks: { font: { size: 16 } } },
                x: { title: { display: true, text: 'Time', font: { size: 18 } }, ticks: { font: { size: 16 } } }
              }
            }}
          />
        </div>
      </div>

      {/* Alerts */}
      {/* Remove from:
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
      </div> */}
    </div>
  );
};

export default ProductionMonitor;