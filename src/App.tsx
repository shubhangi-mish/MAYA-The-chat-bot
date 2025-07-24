import React, { useState } from 'react';
import { MessageCircle, Settings, BarChart3, TestTube, Monitor, Sparkles } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import PromptManager from './components/PromptManager';
import EvaluationFramework from './components/EvaluationFramework';
import TestScenarios from './components/TestScenarios';
import ProductionMonitor from './components/ProductionMonitor';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: "Hey there! I'm Maya! 🌱 I'm so excited to chat with you about sustainable living, yoga, and all things plant-based! What's on your mind today?",
      sender: 'maya',
      timestamp: new Date(),
    },
  ]);

  const tabs = [
    { id: 'chat', label: 'Chat with Maya', icon: MessageCircle },
    { id: 'prompts', label: 'Prompt Manager', icon: Settings },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
    { id: 'testing', label: 'Test Scenarios', icon: TestTube },
    { id: 'monitoring', label: 'Production Monitor', icon: Monitor },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface messages={messages} setMessages={setMessages} />;
      case 'prompts':
        return <PromptManager />;
      case 'evaluation':
        return <EvaluationFramework messages={messages} />;
      case 'testing':
        return <TestScenarios />;
      case 'monitoring':
        return <ProductionMonitor />;
      default:
        return <ChatInterface messages={messages} setMessages={setMessages} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Maya AI Character Lab
              </h1>
              <p className="text-slate-400 mt-1">
                Sustainable Living Influencer • Evaluation & Testing Framework
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Main Content */}
        <main className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          {renderActiveComponent()}
        </main>
      </div>
    </div>
  );
}

export default App;