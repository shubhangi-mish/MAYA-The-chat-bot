import React, { useState } from 'react';
import { Play, BarChart3, TrendingUp, Award, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'maya';
  timestamp: Date;
}

interface EvaluationFrameworkProps {
  messages: Message[];
}

const EvaluationFramework: React.FC<EvaluationFrameworkProps> = ({ messages }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const evaluationCriteria = [
    {
      name: 'Consistency',
      description: 'Character stays in voice across different scenarios',
      weight: 30,
      metrics: ['Voice consistency', 'Personality maintenance', 'Brand alignment']
    },
    {
      name: 'Engagement',
      description: 'Responses feel natural and encourage interaction',
      weight: 25,
      metrics: ['Question usage', 'Conversational flow', 'Response length']
    },
    {
      name: 'Brand Alignment',
      description: 'Maintains focus on sustainable living themes',
      weight: 25,
      metrics: ['Topic relevance', 'Value consistency', 'Expertise demonstration']
    },
    {
      name: 'Authenticity',
      description: 'Responses sound genuine and human-like',
      weight: 20,
      metrics: ['Natural language', 'Emotional appropriateness', 'Personal touch']
    }
  ];

  const sampleResults = {
    overall_score: 87.5,
    consistency: 92,
    engagement: 85,
    brand_alignment: 88,
    authenticity: 85,
    test_results: [
      {
        scenario: 'Morning routine inquiry',
        score: 90,
        feedback: 'Excellent brand alignment and personal touch',
        issues: []
      },
      {
        scenario: 'Vegan recipe request',
        score: 95,
        feedback: 'Perfect expertise demonstration',
        issues: []
      },
      {
        scenario: 'Off-topic political question',
        score: 78,
        feedback: 'Good redirection but could be smoother',
        issues: ['Slightly abrupt transition']
      },
      {
        scenario: 'Sustainability mistake discussion',
        score: 88,
        feedback: 'Great vulnerability and authenticity',
        issues: []
      },
      {
        scenario: 'Brand collaboration inquiry',
        score: 82,
        feedback: 'Professional but could be more engaging',
        issues: ['Could ask more follow-up questions']
      }
    ]
  };

  const inferThemes = (messages: Message[]): string[] => {
    const themeKeywords = [
      'yoga', 'plant-based', 'sustainable', 'eco', 'mindful', 'minimalism', 'mental health',
      'environment', 'conscious', 'cooking', 'recipe', 'vegan', 'beginner', 'growth', 'authenticity',
      'collaboration', 'brand', 'partnership', 'professional', 'lifestyle', 'consumption', 'wellness'
    ];
    const text = messages.map(m => m.content.toLowerCase()).join(' ');
    return themeKeywords.filter(theme => text.includes(theme));
  };

  const evaluateCurrentConversation = async () => {
    if (!messages || messages.length === 0) return;
    setIsRunning(true);
    setResults(null);
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (!lastUserMsg) {
      setIsRunning(false);
      return;
    }
    // Prepare the scenario
    const scenario = {
      name: 'Current Conversation',
      user_message: lastUserMsg.content,
      expected_themes: inferThemes(messages),
      conversation_history: messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'maya',
        content: m.content
      }))
    };
    try {
      const response = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_scenarios: [scenario] })
      });
      const data = await response.json();
      if (data.evaluation_results && data.evaluation_results[0] && data.evaluation_results[0].scores) {
        const s = data.evaluation_results[0].scores;
        setResults({
          ...data.evaluation_results[0],
          ...s
        });
      } else {
        setResults({ error: 'Malformed or incomplete evaluation results received from backend.' });
      }
    } catch (error) {
      setResults({ error: 'Evaluation failed.' });
    } finally {
      setIsRunning(false);
    }
  };

  const runEvaluation = async () => {
    setIsRunning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setResults(sampleResults);
    setIsRunning(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/20';
    if (score >= 80) return 'bg-yellow-500/20';
    if (score >= 70) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Evaluation Framework</h2>
        <button
          onClick={evaluateCurrentConversation}
          disabled={isRunning}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Evaluate Current Conversation
            </>
          )}
        </button>
      </div>

      {/* Evaluation Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {evaluationCriteria.map((criteria) => (
          <div key={criteria.name} className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{criteria.name}</h3>
              <span className="text-sm text-slate-400">{criteria.weight}%</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">{criteria.description}</p>
            <div className="space-y-1">
              {criteria.metrics.map((metric) => (
                <div key={metric} className="text-xs text-slate-500">• {metric}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {results && (
        results.error ? (
          <div className="bg-red-700/30 rounded-xl border border-red-600/50 p-6 text-red-200">
            <h3 className="text-lg font-bold">Evaluation Error</h3>
            <p>{results.error}</p>
          </div>
        ) : (results.overall !== undefined && results.consistency !== undefined && results.engagement !== undefined && results.brand_alignment !== undefined && results.authenticity !== undefined ? (
          <div className="space-y-6">
            {/* Modernized Score Display */}
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
              <div className="flex items-center gap-4 mb-4">
                <Award className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Overall Performance</h3>
                  <p className="text-slate-400">Comprehensive evaluation results</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{results.overall?.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{results.consistency?.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Consistency (Rule)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{results.engagement?.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Engagement (Rule)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{results.brand_alignment?.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Brand Alignment (Rule)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{results.authenticity?.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Authenticity (Rule)</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-300">{(results.semantic_consistency * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Consistency (Semantic)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-300">{(results.semantic_engagement * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Engagement (Semantic)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-300">{(results.semantic_brand_alignment * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Brand Alignment (Semantic)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-300">{(results.semantic_authenticity * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Authenticity (Semantic)</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-400">{results.combined_consistency?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Consistency (Combined)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-400">{results.combined_engagement?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Engagement (Combined)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-400">{results.combined_brand_alignment?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Brand Alignment (Combined)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-400">{results.combined_authenticity?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Authenticity (Combined)</div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-6 mt-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-cyan-400">{(results.cumulative_semantic * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Cumulative Semantic</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-400">{results.cumulative_combined?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Cumulative Combined</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{results.overall?.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Overall Score</div>
                </div>
              </div>
            </div>
            {/* Test Results */}
            {results.test_results && Array.isArray(results.test_results) && (
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Test Scenario Results
                </h3>
                <div className="space-y-4">
                  {results.test_results.map((test: any, index: number) => (
                    <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{test.scenario}</h4>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(test.score)} ${getScoreColor(test.score)}`}>
                          {test.score}/100
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{test.feedback}</p>
                      {test.issues.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-400">
                            {test.issues.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-700/30 rounded-xl border border-red-600/50 p-6 text-red-200">
            <h3 className="text-lg font-bold">Evaluation Error</h3>
            <p>Malformed or incomplete evaluation results received from backend.</p>
          </div>
        ))
      )}
    </div>
  );
};

export default EvaluationFramework;