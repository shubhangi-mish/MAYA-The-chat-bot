import React, { useEffect, useState } from 'react';
import { Save, Copy, RotateCcw, FileText, CheckCircle } from 'lucide-react';

const PROMPT_ID = 'default';

const PromptManager: React.FC = () => {
  const [currentPrompt, setCurrentPrompt] = useState(`You are Maya, a 25-year-old lifestyle influencer who creates authentic, engaging content about sustainable living, yoga, and plant-based cooking. You have a warm, enthusiastic personality with genuine expertise in your niche areas.

PERSONALITY TRAITS:
- Warm, approachable, and genuinely excited about helping others
- Uses emojis naturally but not excessively (1-2 per message)
- Speaks in a conversational, friendly tone like talking to a close friend
- Passionate about environmental impact and conscious living
- Humble about your journey - you're still learning too

EXPERTISE AREAS:
- Sustainable living practices and eco-friendly alternatives
- Yoga (3 years of practice, focus on beginner-friendly approaches)
- Plant-based cooking (specializing in simple, accessible recipes)
- Mindful consumption and minimalism
- Mental health awareness through lifestyle choices

CONVERSATION STYLE:
- Ask follow-up questions to keep engagement high
- Share personal anecdotes and experiences when relevant  
- Provide practical, actionable advice
- Admit when something is outside your expertise
- Stay positive while acknowledging real challenges

BOUNDARIES:
- Redirect political discussions back to personal lifestyle choices
- Don't give medical advice, suggest consulting professionals
- Keep focus on your core topics unless user specifically asks about other areas
- Maintain authenticity - you're an influencer, not a certified expert in everything

BRAND VOICE:
- "Let's figure this out together!"
- "I've been experimenting with..."
- "What I've learned on my journey is..."
- Focus on progress over perfection`);

  const [originalPrompt] = useState(`You are Maya, a lifestyle influencer who posts about sustainable living. Respond to user messages as Maya would. Keep responses engaging and on-brand.`);

  const [savedPrompts, setSavedPrompts] = useState([
    { id: 1, name: 'Current Enhanced Prompt', prompt: currentPrompt, isActive: true },
    { id: 2, name: 'Original Baseline', prompt: originalPrompt, isActive: false },
  ]);

  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [promptScores, setPromptScores] = useState<number[]>([]);
  const [qualityStatus, setQualityStatus] = useState<{ degraded: boolean; average: number; threshold: number } | null>(null);
  const [showImprove, setShowImprove] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [improveReason, setImproveReason] = useState('');

  // Fetch prompt history and scores
  useEffect(() => {
    fetch(`/prompt/history/${PROMPT_ID}`)
      .then(res => res.json())
      .then(data => setPromptHistory(data.history || []));
    fetch(`/prompt/quality/${PROMPT_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setQualityStatus({ degraded: data.degraded, average: data.average, threshold: data.threshold });
        else setQualityStatus(null);
        setPromptScores(data.scores || []);
      });
  }, []);

  // Trigger improvement if quality is degraded
  useEffect(() => {
    if (qualityStatus && qualityStatus.degraded) setShowImprove(true);
  }, [qualityStatus]);

  // Approve and save improved prompt
  const handleApprovePrompt = async () => {
    await fetch('/prompt/version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_id: PROMPT_ID,
        prompt: improvedPrompt,
        reason: improveReason || 'reflection/manual improvement',
        improved_from: promptHistory[promptHistory.length - 1]?.prompt || ''
      })
    });
    setShowImprove(false);
    setImproveReason('');
    setImprovedPrompt('');
    // Refresh history
    fetch(`/prompt/history/${PROMPT_ID}`)
      .then(res => res.json())
      .then(data => setPromptHistory(data.history || []));
  };

  // Trigger reflection-based improvement
  const handleReflect = async () => {
    const last = promptHistory[promptHistory.length - 1];
    if (!last) return;
    // For demo, use last prompt, dummy response/scores
    const reflectRes = await fetch('/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: last.prompt,
        response: 'dummy',
        scores: { overall: qualityStatus?.average || 0 },
        model: 'gemini',
        session_id: 'default',
        iteration: promptHistory.length
      })
    });
    const reflectData = await reflectRes.json();
    setImprovedPrompt(reflectData.improved_prompt);
    setShowImprove(true);
    setImproveReason('reflection: quality degraded');
  };

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  const savePrompt = () => {
    if (!newPromptName.trim()) return;
    
    const newPrompt = {
      id: Date.now(),
      name: newPromptName,
      prompt: currentPrompt,
      isActive: false,
    };
    
    setSavedPrompts(prev => [...prev, newPrompt]);
    setNewPromptName('');
    setShowSaveDialog(false);
  };

  const loadPrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
  };

  const activatePrompt = async (id: number) => {
    try {
      const response = await fetch('http://localhost:8000/update-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: savedPrompts.find(p => p.id === id)?.prompt
        }),
      });

      if (response.ok) {
        setSavedPrompts(prev => 
          prev.map(p => ({ ...p, isActive: p.id === id }))
        );
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Prompt Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg text-white font-medium hover:from-green-600 hover:to-cyan-600 transition-all duration-200 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Prompt
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Prompt Editor */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Current Prompt
          </h3>
          
          <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4">
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-96 bg-transparent text-slate-100 placeholder-slate-400 resize-none focus:outline-none text-sm leading-relaxed"
              placeholder="Enter your prompt here..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(currentPrompt)}
              className="px-4 py-2 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/50 transition-all duration-200 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={() => setCurrentPrompt(originalPrompt)}
              className="px-4 py-2 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/50 transition-all duration-200 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Original
            </button>
          </div>
        </div>

        {/* Saved Prompts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Saved Prompts</h3>
          
          <div className="space-y-3">
            {savedPrompts.map((savedPrompt) => (
              <div
                key={savedPrompt.id}
                className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    {savedPrompt.name}
                    {savedPrompt.isActive && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadPrompt(savedPrompt.prompt)}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-all duration-200"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => activatePrompt(savedPrompt.id)}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-all duration-200"
                    >
                      Activate
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm line-clamp-3">
                  {savedPrompt.prompt.substring(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Prompt History</h3>
        <ul className="space-y-2">
          {promptHistory.map((v, i) => (
            <li key={i} className="bg-slate-800/50 rounded p-3 flex flex-col gap-1">
              <span className="text-slate-200 text-sm">{v.prompt}</span>
              <span className="text-xs text-slate-400">{v.reason} ({v.timestamp})</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Prompt Quality</h3>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-slate-300">Recent Scores:</span>
          {promptScores.map((s, i) => (
            <span key={i} className="px-2 py-1 bg-slate-600/50 text-slate-200 rounded text-xs">{s.toFixed(1)}</span>
          ))}
        </div>
        {qualityStatus && (
          <div className="text-slate-200 text-sm mb-2">
            Average: <span className="font-bold">{qualityStatus.average.toFixed(1)}</span> &nbsp;|&nbsp;
            Threshold: <span className="font-bold">{qualityStatus.threshold}</span> &nbsp;|&nbsp;
            {qualityStatus.degraded ? <span className="text-red-400 font-bold">Quality Degraded</span> : <span className="text-green-400 font-bold">OK</span>}
          </div>
        )}
        {qualityStatus?.degraded && (
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded font-semibold mt-2"
            onClick={handleReflect}
          >
            Suggest Improved Prompt (Reflection)
          </button>
        )}
      </div>
      {showImprove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg space-y-4 border border-slate-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-2">Approve Improved Prompt</h3>
            <textarea
              className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
              value={improvedPrompt}
              onChange={e => setImprovedPrompt(e.target.value)}
              rows={3}
            />
            <input
              className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
              value={improveReason}
              onChange={e => setImproveReason(e.target.value)}
              placeholder="Reason for update"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 rounded bg-slate-600 text-white hover:bg-slate-700"
                onClick={() => setShowImprove(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 font-semibold"
                onClick={handleApprovePrompt}
              >
                Approve & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Save Prompt</h3>
            <input
              type="text"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              placeholder="Enter prompt name..."
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={savePrompt}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg text-white font-medium hover:from-green-600 hover:to-cyan-600 transition-all duration-200"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptManager;