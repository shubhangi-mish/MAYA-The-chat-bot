import React, { useEffect, useState } from 'react';
import { Play, Plus, Edit, Trash2, MessageSquare } from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  user_message: string;
  expected_themes: string[];
  category: string;
}

const PROMPT_ID = 'default';

const TestScenarios: React.FC = () => {
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: '1',
      name: 'Morning Routine Inquiry',
      description: 'User asks about Maya\'s daily morning routine',
      user_message: 'Hey Maya! Can you tell me about your morning routine? I\'m trying to start my day more mindfully.',
      expected_themes: ['yoga', 'mindfulness', 'sustainable practices', 'personal experience'],
      category: 'lifestyle'
    },
    {
      id: '2',
      name: 'Vegan Recipe Request',
      description: 'User requests a specific plant-based recipe',
      user_message: 'I\'m new to plant-based eating. Could you share a simple but delicious vegan dinner recipe?',
      expected_themes: ['plant-based cooking', 'beginner-friendly', 'practical advice', 'encouragement'],
      category: 'cooking'
    },
    {
      id: '3',
      name: 'Political Topic Redirection',
      description: 'User tries to engage in political discussion',
      user_message: 'What do you think about the recent election results and their impact on environmental policy?',
      expected_themes: ['redirection', 'personal action', 'staying on-brand', 'boundary maintenance'],
      category: 'boundary-testing'
    },
    {
      id: '4',
      name: 'Sustainability Mistake',
      description: 'User asks about Maya\'s biggest sustainability mistake',
      user_message: 'Have you ever made a big mistake in your sustainability journey? How did you handle it?',
      expected_themes: ['vulnerability', 'authenticity', 'learning experience', 'growth mindset'],
      category: 'authenticity'
    },
    {
      id: '5',
      name: 'Brand Collaboration',
      description: 'Professional inquiry about brand partnerships',
      user_message: 'Hi Maya, I represent an eco-friendly clothing brand. Would you be interested in a collaboration?',
      expected_themes: ['professionalism', 'brand alignment', 'values-based decisions', 'follow-up questions'],
      category: 'business'
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scenarioFeedback, setScenarioFeedback] = useState<{ [id: string]: 'like' | 'dislike' | undefined }>({});

  // Track editable themes for each scenario
  const [editableThemes, setEditableThemes] = useState<{ [id: string]: string[] }>(() => {
    const obj: { [id: string]: string[] } = {};
    scenarios.forEach(s => { obj[s.id] = [...s.expected_themes]; });
    return obj;
  });

  const handleAddTheme = (id: string, theme: string) => {
    setEditableThemes(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), theme.trim()].filter((t, i, arr) => t && arr.indexOf(t) === i)
    }));
  };
  const handleRemoveTheme = (id: string, theme: string) => {
    setEditableThemes(prev => ({
      ...prev,
      [id]: (prev[id] || []).filter(t => t !== theme)
    }));
  };
  const handleThemeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        handleAddTheme(id, value);
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  // Add scenario form state
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    user_message: '',
    expected_themes: [] as string[],
    category: 'lifestyle',
  });
  const [newThemeInput, setNewThemeInput] = useState('');

  const handleNewThemeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && newThemeInput.trim()) {
      e.preventDefault();
      setNewScenario(ns => ({
        ...ns,
        expected_themes: [...ns.expected_themes, newThemeInput.trim()].filter((t, i, arr) => t && arr.indexOf(t) === i)
      }));
      setNewThemeInput('');
    }
  };
  const handleRemoveNewTheme = (theme: string) => {
    setNewScenario(ns => ({
      ...ns,
      expected_themes: ns.expected_themes.filter(t => t !== theme)
    }));
  };
  const handleAddScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenario.name.trim() || !newScenario.user_message.trim()) return;
    const id = Date.now().toString();
    const scenario: TestScenario = {
      id,
      name: newScenario.name.trim(),
      description: newScenario.description.trim(),
      user_message: newScenario.user_message.trim(),
      expected_themes: [...newScenario.expected_themes],
      category: newScenario.category
    };
    setScenarios(prev => [...prev, scenario]);
    setEditableThemes(prev => ({ ...prev, [id]: [...scenario.expected_themes] }));
    setNewScenario({ name: '', description: '', user_message: '', expected_themes: [], category: 'lifestyle' });
    setNewThemeInput('');
    setShowAddForm(false);
  };

  const [currentPrompt, setCurrentPrompt] = useState('');

  // Fetch the latest prompt from PromptManager
  const fetchCurrentPrompt = async () => {
    const res = await fetch(`/prompt/history/${PROMPT_ID}`);
    const data = await res.json();
    const last = data.history && data.history.length > 0 ? data.history[data.history.length - 1].prompt : '';
    setCurrentPrompt(last);
  };

  useEffect(() => {
    fetchCurrentPrompt();
    // Optionally, set up polling or a websocket for real-time updates
  }, []);

  const runScenario = async (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    setIsRunning(true);
    setTestResult('');
    setEvaluationResult(null);
    const themesToUse = editableThemes[scenario.id] || scenario.expected_themes;
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentPrompt + '\n' + scenario.user_message,
          conversation_history: []
        }),
      });
      const data = await response.json();
      setTestResult(data.response);
      // Now evaluate the response
      const evalScenario = {
        name: scenario.name,
        user_message: currentPrompt + '\n' + scenario.user_message,
        expected_themes: themesToUse,
        conversation_history: [
          { role: 'user', content: currentPrompt + '\n' + scenario.user_message },
          { role: 'maya', content: data.response }
        ]
      };
      const evalRes = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_scenarios: [evalScenario] })
      });
      const evalData = await evalRes.json();
      if (evalData.evaluation_results && evalData.evaluation_results[0] && evalData.evaluation_results[0].scores) {
        const s = evalData.evaluation_results[0].scores;
        setEvaluationResult({ ...evalData.evaluation_results[0], ...s });
        setScenarioFullScores(full => ({ ...full, [scenario.id]: s }));
        // Send prompt score for quality tracking
        if (s.overall) {
          await fetch('/prompt/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt_id: PROMPT_ID,
              score: s.overall
            })
          });
        }
      } else {
        setEvaluationResult({ error: 'Malformed or incomplete evaluation results received from backend.' });
      }
    } catch (error) {
      console.error('Error running scenario:', error);
      setTestResult('Error: Could not connect to backend service.');
      setEvaluationResult({ error: 'Evaluation failed.' });
    } finally {
      setIsRunning(false);
    }
  };

  const sendScenarioFeedback = (id: string, type: 'like' | 'dislike') => {
    setScenarioFeedback(fb => ({ ...fb, [id]: type }));
    // Optionally send feedback to backend here
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      lifestyle: 'bg-green-500/20 text-green-400',
      cooking: 'bg-orange-500/20 text-orange-400',
      'boundary-testing': 'bg-red-500/20 text-red-400',
      authenticity: 'bg-purple-500/20 text-purple-400',
      business: 'bg-blue-500/20 text-blue-400'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  // Add state to track full evaluation results per scenario
  const [scenarioFullScores, setScenarioFullScores] = useState<{ [id: string]: any }>({});

  const fullScores = selectedScenario ? scenarioFullScores[selectedScenario.id] : undefined;
  const feedbackDisabled = !fullScores;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Test Scenarios</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-medium hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Scenario
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            className="bg-slate-800 rounded-xl p-8 w-full max-w-lg space-y-4 border border-slate-700 shadow-lg"
            onSubmit={handleAddScenario}
          >
            <h3 className="text-xl font-bold text-white mb-2">Add New Scenario</h3>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Name</label>
              <input
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
                value={newScenario.name}
                onChange={e => setNewScenario(ns => ({ ...ns, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Description</label>
              <input
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
                value={newScenario.description}
                onChange={e => setNewScenario(ns => ({ ...ns, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">User Message</label>
              <textarea
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
                value={newScenario.user_message}
                onChange={e => setNewScenario(ns => ({ ...ns, user_message: e.target.value }))}
                required
                rows={2}
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Themes (press Enter or comma to add)</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {newScenario.expected_themes.map(theme => (
                  <span key={theme} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs flex items-center gap-1">
                    {theme}
                    <button
                      type="button"
                      className="ml-1 text-red-400 hover:text-red-600"
                      onClick={() => handleRemoveNewTheme(theme)}
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-xs text-slate-200 px-1 py-0.5 min-w-[60px]"
                  placeholder="Add theme"
                  value={newThemeInput}
                  onChange={e => setNewThemeInput(e.target.value)}
                  onKeyDown={handleNewThemeKeyDown}
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Category</label>
              <select
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
                value={newScenario.category}
                onChange={e => setNewScenario(ns => ({ ...ns, category: e.target.value }))}
              >
                <option value="lifestyle">Lifestyle</option>
                <option value="cooking">Cooking</option>
                <option value="boundary-testing">Boundary Testing</option>
                <option value="authenticity">Authenticity</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 rounded bg-slate-600 text-white hover:bg-slate-700"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 font-semibold"
              >
                Add Scenario
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenarios List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Available Test Scenarios</h3>
          
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{scenario.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(scenario.category)}`}>
                      {scenario.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{scenario.description}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button className="p-1 text-slate-400 hover:text-white transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                <p className="text-sm text-slate-300 italic">"{scenario.user_message}"</p>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {editableThemes[scenario.id]?.map((theme) => (
                  <span key={theme} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs flex items-center gap-1">
                    {theme}
                    <button
                      type="button"
                      className="ml-1 text-red-400 hover:text-red-600"
                      onClick={() => handleRemoveTheme(scenario.id, theme)}
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-xs text-slate-200 px-1 py-0.5 min-w-[60px]"
                  placeholder="Add theme"
                  onKeyDown={e => handleThemeInputKeyDown(e, scenario.id)}
                  disabled={isRunning}
                />
              </div>
              
              <button
                onClick={() => runScenario(scenario)}
                disabled={isRunning}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg text-white font-medium hover:from-green-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRunning && selectedScenario?.id === scenario.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Test
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Test Results</h3>
          
          {selectedScenario ? (
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h4 className="font-medium text-white">{selectedScenario.name}</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">User Message:</h5>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300 italic">"{selectedScenario.user_message}"</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Maya's Response:</h5>
                  <div className="bg-slate-800/50 rounded-lg p-3 min-h-[100px]">
                    {isRunning ? (
                      <div className="flex items-center justify-center h-20">
                        <div className="w-6 h-6 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                      </div>
                    ) : testResult ? (
                      <p className="text-sm text-slate-300 leading-relaxed">{testResult}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No response yet.</p>
                    )}
                  </div>
                </div>
                {/* Evaluation Results */}
                {evaluationResult && (
                  evaluationResult.error ? (
                    <div className="bg-red-700/30 rounded-xl border border-red-600/50 p-4 text-red-200 mt-4">
                      <h5 className="text-sm font-bold">Evaluation Error</h5>
                      <p>{evaluationResult.error}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4 mt-4">
                      <h5 className="text-sm font-bold text-white mb-2">Evaluation Results</h5>
                      <div className="text-xs text-slate-400 mb-2">Overall = 70% Semantic, 30% Sentiment</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-400">{evaluationResult.overall?.toFixed(1)}</div>
                          <div className="text-sm text-slate-400">Overall Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-cyan-300">{(evaluationResult.cumulative_semantic * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">Cumulative Semantic</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-pink-400">{typeof evaluationResult.sentiment === 'number' ? (evaluationResult.sentiment * 100).toFixed(1) + '%' : '-'}</div>
                          <div className="text-xs text-slate-400">Sentiment (Polarity)</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-300">{(evaluationResult.semantic_consistency * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">Consistency (Semantic)</div>
                          <div className="text-lg font-bold text-pink-400 mt-1">{typeof evaluationResult.sentiment_consistency === 'number' ? (evaluationResult.sentiment_consistency * 100).toFixed(1) + '%' : '-'}</div>
                          <div className="text-xs text-slate-400">Consistency (Sentiment)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-300">{(evaluationResult.semantic_engagement * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">Engagement (Semantic)</div>
                          <div className="text-lg font-bold text-pink-400 mt-1">{typeof evaluationResult.sentiment_engagement === 'number' ? (evaluationResult.sentiment_engagement * 100).toFixed(1) + '%' : '-'}</div>
                          <div className="text-xs text-slate-400">Engagement (Sentiment)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-300">{(evaluationResult.semantic_brand_alignment * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">Brand Alignment (Semantic)</div>
                          <div className="text-lg font-bold text-pink-400 mt-1">{typeof evaluationResult.sentiment_brand_alignment === 'number' ? (evaluationResult.sentiment_brand_alignment * 100).toFixed(1) + '%' : '-'}</div>
                          <div className="text-xs text-slate-400">Brand Alignment (Sentiment)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-300">{(evaluationResult.semantic_authenticity * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">Authenticity (Semantic)</div>
                          <div className="text-lg font-bold text-pink-400 mt-1">{typeof evaluationResult.sentiment_authenticity === 'number' ? (evaluationResult.sentiment_authenticity * 100).toFixed(1) + '%' : '-'}</div>
                          <div className="text-xs text-slate-400">Authenticity (Sentiment)</div>
                        </div>
                      </div>
                    </div>
                  )
                )}
                
                {testResult && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Expected Themes:</h5>
                    <div className="flex flex-wrap gap-1">
                      {editableThemes[selectedScenario.id]?.map((theme) => (
                        <span key={theme} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {evaluationResult && !evaluationResult.error && (
                <div className="flex gap-2 mt-2">
                  <button
                    className={`px-2 py-1 rounded ${scenarioFeedback[selectedScenario.id] === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => {
                      sendScenarioFeedback(selectedScenario.id, 'like');
                      if (feedbackDisabled) {
                        console.warn('Cannot send feedback for scenario:', selectedScenario.id, 'as evaluation is not complete.');
                        return;
                      }
                      fetch('http://localhost:8000/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          session_id: selectedScenario.id,
                          model: 'maya',
                          response: testResult,
                          feedback: 'like',
                          prompt: selectedScenario.user_message,
                          mode: 'scenario',
                          scores: { ...fullScores, overall: evaluationResult.overall + 5 },
                          timestamp: new Date().toISOString()
                        })
                      });
                    }}
                    disabled={feedbackDisabled}
                  >👍 Like{feedbackDisabled && <span className="ml-2 animate-spin">⏳</span>}</button>
                  <button
                    className={`px-2 py-1 rounded ${scenarioFeedback[selectedScenario.id] === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => {
                      sendScenarioFeedback(selectedScenario.id, 'dislike');
                      if (feedbackDisabled) {
                        console.warn('Cannot send feedback for scenario:', selectedScenario.id, 'as evaluation is not complete.');
                        return;
                      }
                      fetch('http://localhost:8000/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          session_id: selectedScenario.id,
                          model: 'maya',
                          response: testResult,
                          feedback: 'dislike',
                          prompt: selectedScenario.user_message,
                          mode: 'scenario',
                          scores: { ...fullScores, overall: evaluationResult.overall - 5 },
                          timestamp: new Date().toISOString()
                        })
                      });
                    }}
                    disabled={feedbackDisabled}
                  >👎 Dislike{feedbackDisabled && <span className="ml-2 animate-spin">⏳</span>}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">Select a test scenario to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestScenarios;