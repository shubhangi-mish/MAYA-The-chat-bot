import React, { useState } from 'react';
import { Play, Plus, Edit, Trash2, MessageSquare } from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  user_message: string;
  expected_themes: string[];
  category: string;
}

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
  const [isRunning, setIsRunning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const runScenario = async (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    setIsRunning(true);
    setTestResult('');

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.user_message,
          conversation_history: [] // This is fine, but ensure if you ever add history, it uses objects with 'role' and 'content' keys
        }),
      });

      const data = await response.json();
      setTestResult(data.response);
    } catch (error) {
      console.error('Error running scenario:', error);
      setTestResult('Error: Could not connect to backend service.');
    } finally {
      setIsRunning(false);
    }
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
                {scenario.expected_themes.map((theme) => (
                  <span key={theme} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs">
                    {theme}
                  </span>
                ))}
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
                      <p className="text-sm text-slate-500 italic">No response yet. Run a test scenario to see results.</p>
                    )}
                  </div>
                </div>
                
                {testResult && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Expected Themes:</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedScenario.expected_themes.map((theme) => (
                        <span key={theme} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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