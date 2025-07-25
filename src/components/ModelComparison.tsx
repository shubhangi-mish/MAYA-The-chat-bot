import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'maya';
  timestamp: Date;
}

interface ModelComparisonProps {
  messages: Message[];
}

const GEMINI_COST_PER_1K = 0.002; // $ per 1K chars (approx, for demo)
const OPENAI_COST_PER_1K = 0.03; // $ per 1K chars (approx, for demo)

const estimateCost = (text: string, model: 'gemini' | 'openai') => {
  const chars = text.length;
  const per1k = model === 'gemini' ? GEMINI_COST_PER_1K : OPENAI_COST_PER_1K;
  return ((chars / 1000) * per1k).toFixed(4);
};

const MAX_ITERATIONS = 3;
const PROMPT_ID = 'default';

const ModelComparison: React.FC<ModelComparisonProps> = ({ messages }) => {
  const [chatPrompt, setChatPrompt] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  const [geminiChatOutput, setGeminiChatOutput] = useState<string | null>(null);
  const [openaiChatOutput, setOpenaiChatOutput] = useState<string | null>(null);
  const [geminiManualOutput, setGeminiManualOutput] = useState<string | null>(null);
  const [openaiManualOutput, setOpenaiManualOutput] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [errorChat, setErrorChat] = useState<string | null>(null);
  const [errorManual, setErrorManual] = useState<string | null>(null);
  const [usedChat, setUsedChat] = useState(false);
  // Evaluation and timing
  const [chatEval, setChatEval] = useState<any>(null);
  const [manualEval, setManualEval] = useState<any>(null);
  const [chatPerf, setChatPerf] = useState<{ gemini: number; openai: number } | null>(null);
  const [manualPerf, setManualPerf] = useState<{ gemini: number; openai: number } | null>(null);
  const [chatFeedback, setChatFeedback] = useState<{ gemini?: 'like' | 'dislike'; openai?: 'like' | 'dislike' }>({});
  const [manualFeedback, setManualFeedback] = useState<{ gemini?: 'like' | 'dislike'; openai?: 'like' | 'dislike' }>({});
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [manualHistory, setManualHistory] = useState<any[]>([]);
  const chatIteration = useRef(0);
  const manualIteration = useRef(0);
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

  useEffect(() => {
    if (messages && messages.length > 1) {
      const chatPromptStr = messages
        .map(m => `${m.sender === 'user' ? 'User' : 'Maya'}: ${m.content}`)
        .join('\n');
      setChatPrompt(chatPromptStr);
      setUsedChat(true);
    } else {
      setChatPrompt('');
      setUsedChat(false);
    }
  }, [messages]);

  const runChatComparison = async () => {
    setIsLoadingChat(true);
    setErrorChat(null);
    setGeminiChatOutput(null);
    setOpenaiChatOutput(null);
    setChatEval(null);
    setChatPerf(null);
    try {
      // Gemini
      const t0 = performance.now();
      const geminiRes = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentPrompt + '\n' + chatPrompt, conversation_history: [], model: 'gemini' })
      });
      const geminiData = await geminiRes.json();
      const t1 = performance.now();
      setGeminiChatOutput(geminiData.response);
      // OpenAI
      const t2 = performance.now();
      const openaiRes = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentPrompt + '\n' + chatPrompt, conversation_history: [], model: 'openai' })
      });
      const openaiData = await openaiRes.json();
      const t3 = performance.now();
      setOpenaiChatOutput(openaiData.response);
      setChatPerf({ gemini: t1 - t0, openai: t3 - t2 });
      // Evaluation
      const evalRes = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_scenarios: [
            {
              name: 'Gemini Chat',
              user_message: currentPrompt + '\n' + chatPrompt,
              expected_themes: [],
              conversation_history: [
                { role: 'user', content: currentPrompt + '\n' + chatPrompt },
                { role: 'maya', content: geminiData.response }
              ],
              model: 'gemini'
            },
            {
              name: 'OpenAI Chat',
              user_message: currentPrompt + '\n' + chatPrompt,
              expected_themes: [],
              conversation_history: [
                { role: 'user', content: currentPrompt + '\n' + chatPrompt },
                { role: 'maya', content: openaiData.response }
              ],
              model: 'openai'
            }
          ]
        })
      });
      const evalData = await evalRes.json();
      setChatEval(evalData.evaluation_results);
    } catch (err) {
      setErrorChat('Error comparing models on conversation. Please try again.');
    } finally {
      setIsLoadingChat(false);
    }
  };

  const runManualComparison = async () => {
    setIsLoadingManual(true);
    setErrorManual(null);
    setGeminiManualOutput(null);
    setOpenaiManualOutput(null);
    setManualEval(null);
    setManualPerf(null);
    try {
      // Gemini
      const t0 = performance.now();
      const geminiRes = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentPrompt + '\n' + manualPrompt, conversation_history: [], model: 'gemini' })
      });
      const geminiData = await geminiRes.json();
      const t1 = performance.now();
      setGeminiManualOutput(geminiData.response);
      // OpenAI
      const t2 = performance.now();
      const openaiRes = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentPrompt + '\n' + manualPrompt, conversation_history: [], model: 'openai' })
      });
      const openaiData = await openaiRes.json();
      const t3 = performance.now();
      setOpenaiManualOutput(openaiData.response);
      setManualPerf({ gemini: t1 - t0, openai: t3 - t2 });
      // Evaluation
      const evalRes = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_scenarios: [
            {
              name: 'Gemini Manual',
              user_message: currentPrompt + '\n' + manualPrompt,
              expected_themes: [],
              conversation_history: [
                { role: 'user', content: currentPrompt + '\n' + manualPrompt },
                { role: 'maya', content: geminiData.response }
              ],
              model: 'gemini'
            },
            {
              name: 'OpenAI Manual',
              user_message: currentPrompt + '\n' + manualPrompt,
              expected_themes: [],
              conversation_history: [
                { role: 'user', content: currentPrompt + '\n' + manualPrompt },
                { role: 'maya', content: openaiData.response }
              ],
              model: 'openai'
            }
          ]
        })
      });
      const evalData = await evalRes.json();
      setManualEval(evalData.evaluation_results);
    } catch (err) {
      setErrorManual('Error comparing models on manual prompt. Please try again.');
    } finally {
      setIsLoadingManual(false);
    }
  };

  const runIterativeComparison = async (mode: 'chat' | 'manual', prompt: string, model: 'gemini' | 'openai', iteration = 0) => {
    if (iteration >= MAX_ITERATIONS) return;
    // Generate response
    const chatRes = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, conversation_history: [], model })
    });
    const chatData = await chatRes.json();
    // Evaluate
    const evalRes = await fetch('http://localhost:8000/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_scenarios: [
          {
            name: `${model} ${mode} Iteration ${iteration + 1}`,
            user_message: prompt,
            expected_themes: [],
            conversation_history: [
              { role: 'user', content: prompt },
              { role: 'maya', content: chatData.response }
            ],
            model
          }
        ]
      })
    });
    const evalData = await evalRes.json();
    // Store in history
    const entry = {
      iteration,
      prompt,
      response: chatData.response,
      scores: evalData.evaluation_results[0]?.scores || {},
      model
    };
    if (mode === 'chat') setChatHistory(h => [...h, entry]);
    else setManualHistory(h => [...h, entry]);
    // If disliked, reflect and iterate
    // (Feedback state is updated asynchronously, so check after user action)
  };

  const sendFeedback = async (model: 'gemini' | 'openai', type: 'like' | 'dislike', mode: 'chat' | 'manual') => {
    if (mode === 'chat') setChatFeedback(fb => ({ ...fb, [model]: type }));
    else setManualFeedback(fb => ({ ...fb, [model]: type }));
    if (type === 'dislike') {
      // Get last history entry
      const history = mode === 'chat' ? chatHistory : manualHistory;
      const last = history.filter(h => h.model === model).slice(-1)[0];
      if (!last || (last.iteration ?? 0) >= MAX_ITERATIONS - 1) return;
      // Reflect to get improved prompt
      const reflectRes = await fetch('http://localhost:8000/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: last.prompt,
          response: last.response,
          scores: last.scores,
          model,
          session_id: 'default',
          iteration: (last.iteration ?? 0) + 1
        })
      });
      const reflectData = await reflectRes.json();
      // Run next iteration
      await runIterativeComparison(mode, reflectData.improved_prompt, model, (last.iteration ?? 0) + 1);
    }
  };

  const renderEval = (evalObj: any) => (
    <div className="mt-4">
      <h5 className="text-lg font-bold text-white mb-2">Evaluation Scores</h5>
      <div className="text-xs text-slate-400 mb-2">Combined = 30% Rule-based, 70% Semantic</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{evalObj.overall?.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Overall Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{evalObj.consistency?.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Consistency (Rule)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{evalObj.engagement?.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Engagement (Rule)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{evalObj.brand_alignment?.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Brand Alignment (Rule)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-pink-400">{evalObj.authenticity?.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Authenticity (Rule)</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-300">{(evalObj.semantic_consistency * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-400">Consistency (Semantic)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-300">{(evalObj.semantic_engagement * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-400">Engagement (Semantic)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-300">{(evalObj.semantic_brand_alignment * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-400">Brand Alignment (Semantic)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-300">{(evalObj.semantic_authenticity * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-400">Authenticity (Semantic)</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">{evalObj.combined_consistency?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Consistency (Combined)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">{evalObj.combined_engagement?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Engagement (Combined)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">{evalObj.combined_brand_alignment?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Brand Alignment (Combined)</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">{evalObj.combined_authenticity?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Authenticity (Combined)</div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-6 mt-4">
        <div className="text-center">
          <div className="text-xl font-bold text-cyan-400">{(evalObj.cumulative_semantic * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-400">Cumulative Semantic</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-400">{evalObj.cumulative_combined?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Cumulative Combined</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-yellow-400">{evalObj.overall?.toFixed(1)}</div>
          <div className="text-xs text-slate-400">Overall Score</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-bold text-white mb-4">Model Comparison: Gemini vs OpenAI</h2>
      {/* Chat Conversation Comparison */}
      {usedChat && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-cyan-300">Compare on Current Conversation</h3>
          <textarea
            className="w-full p-3 rounded bg-slate-800/50 border border-slate-700/50 text-white mb-2"
            rows={4}
            value={chatPrompt}
            readOnly
          />
          <button
            onClick={runChatComparison}
            disabled={!chatPrompt.trim() || isLoadingChat}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-medium hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50"
          >
            {isLoadingChat ? 'Comparing...' : 'Compare Models on Conversation'}
          </button>
          {errorChat && <div className="text-red-400 font-semibold">{errorChat}</div>}
          {(geminiChatOutput || openaiChatOutput) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
                <h4 className="text-lg font-bold text-cyan-300 mb-2">Gemini Output</h4>
                <div className="text-slate-200 whitespace-pre-line">{geminiChatOutput}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback.gemini === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => sendFeedback('gemini', 'like', 'chat')}
                  >👍 Like</button>
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback.gemini === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => sendFeedback('gemini', 'dislike', 'chat')}
                  >👎 Dislike</button>
                </div>
                {geminiChatOutput && chatEval && chatEval[0] && renderEval({
                  ...chatEval[0].scores,
                  overall: chatEval[0].scores.overall
                })}
                <div className="mt-2 text-slate-400 text-sm">Performance: {chatPerf ? chatPerf.gemini.toFixed(0) : '-'} ms | Cost: ${geminiChatOutput ? estimateCost(geminiChatOutput, 'gemini') : '-'}</div>
              </div>
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
                <h4 className="text-lg font-bold text-green-300 mb-2">OpenAI Output</h4>
                <div className="text-slate-200 whitespace-pre-line">{openaiChatOutput}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback.openai === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => sendFeedback('openai', 'like', 'chat')}
                  >👍 Like</button>
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback.openai === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => sendFeedback('openai', 'dislike', 'chat')}
                  >👎 Dislike</button>
                </div>
                {openaiChatOutput && chatEval && chatEval[1] && renderEval({
                  ...chatEval[1].scores,
                  overall: chatEval[1].scores.overall
                })}
                <div className="mt-2 text-slate-400 text-sm">Performance: {chatPerf ? chatPerf.openai.toFixed(0) : '-'} ms | Cost: ${openaiChatOutput ? estimateCost(openaiChatOutput, 'openai') : '-'}</div>
              </div>
            </div>
          )}
          {(geminiChatOutput && openaiChatOutput && chatEval) && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mt-8">
              <h3 className="text-2xl font-bold text-white mb-2">Recommendation & Tradeoffs</h3>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-300">Model</th>
                      <th className="px-4 py-2 text-left text-slate-300">Chars</th>
                      <th className="px-4 py-2 text-left text-slate-300">Est. Cost*</th>
                      <th className="px-4 py-2 text-left text-slate-300">Performance (ms)</th>
                      <th className="px-4 py-2 text-left text-slate-300">Overall Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 font-semibold text-cyan-300">Gemini</td>
                      <td className="px-4 py-2 text-slate-200">{geminiChatOutput.length}</td>
                      <td className="px-4 py-2 text-green-300">${estimateCost(geminiChatOutput, 'gemini')}</td>
                      <td className="px-4 py-2 text-slate-200">{chatPerf ? chatPerf.gemini.toFixed(0) : '-'}</td>
                      <td className="px-4 py-2 text-yellow-400">{chatEval[0]?.scores?.overall}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-semibold text-green-300">OpenAI</td>
                      <td className="px-4 py-2 text-slate-200">{openaiChatOutput.length}</td>
                      <td className="px-4 py-2 text-green-300">${estimateCost(openaiChatOutput, 'openai')}</td>
                      <td className="px-4 py-2 text-slate-200">{chatPerf ? chatPerf.openai.toFixed(0) : '-'}</td>
                      <td className="px-4 py-2 text-yellow-400">{chatEval[1]?.scores?.overall}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-xs text-slate-400 mt-1">*Estimated cost, hardcoded for demo purposes.</div>
              </div>
              <ul className="text-slate-200 mb-2 list-disc ml-6">
                <li>Gemini output: <span className="text-slate-400">{geminiChatOutput.length} chars, ${estimateCost(geminiChatOutput, 'gemini')}</span></li>
                <li>OpenAI output: <span className="text-slate-400">{openaiChatOutput.length} chars, ${estimateCost(openaiChatOutput, 'openai')}</span></li>
                <li>Gemini performance: {chatPerf ? chatPerf.gemini.toFixed(0) : '-'} ms</li>
                <li>OpenAI performance: {chatPerf ? chatPerf.openai.toFixed(0) : '-'} ms</li>
                <li>Gemini overall score: {chatEval[0]?.scores?.overall}</li>
                <li>OpenAI overall score: {chatEval[1]?.scores?.overall}</li>
              </ul>
              <p className="text-slate-400 mt-4">
                <span className="font-semibold">Tradeoff:</span> Review the outputs, scores, speed, and cost above. Choose <span className="text-cyan-300">Gemini</span> for cost-effective, fast, and factual responses; choose <span className="text-green-300">OpenAI</span> for creative, nuanced, or premium-quality tasks. Consider your application's needs and budget when choosing.
              </p>
            </div>
          )}
          {/* History display */}
          {chatHistory.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-bold text-white mb-2">Gemini/OpenAI Iteration History</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left text-slate-300">Model</th>
                      <th className="px-2 py-1 text-left text-slate-300">Iteration</th>
                      <th className="px-2 py-1 text-left text-slate-300">Prompt</th>
                      <th className="px-2 py-1 text-left text-slate-300">Response</th>
                      <th className="px-2 py-1 text-left text-slate-300">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatHistory.map((h, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-cyan-300 font-semibold">{h.model}</td>
                        <td className="px-2 py-1 text-slate-200">{h.iteration + 1}</td>
                        <td className="px-2 py-1 text-slate-400 max-w-xs truncate">{h.prompt}</td>
                        <td className="px-2 py-1 text-slate-200 max-w-xs truncate">{h.response}</td>
                        <td className="px-2 py-1 text-yellow-400">{h.scores?.overall?.toFixed(1) ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Manual Prompt Comparison */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-green-300">Compare on Custom Prompt</h3>
        <textarea
          className="w-full p-3 rounded bg-slate-800/50 border border-slate-700/50 text-white mb-2"
          rows={3}
          placeholder="Enter a prompt to compare model outputs..."
          value={manualPrompt}
          onChange={e => setManualPrompt(e.target.value)}
        />
        <button
          onClick={runManualComparison}
          disabled={!manualPrompt.trim() || isLoadingManual}
          className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-medium hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50"
        >
          {isLoadingManual ? 'Comparing...' : 'Compare Models'}
        </button>
        {errorManual && <div className="text-red-400 font-semibold">{errorManual}</div>}
        {(geminiManualOutput || openaiManualOutput) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Gemini Output</h4>
              <div className="text-slate-200 whitespace-pre-line">{geminiManualOutput}</div>
              <div className="flex gap-2 mt-2">
                <button
                  className={`px-2 py-1 rounded ${manualFeedback.gemini === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                  onClick={() => sendFeedback('gemini', 'like', 'manual')}
                >👍 Like</button>
                <button
                  className={`px-2 py-1 rounded ${manualFeedback.gemini === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                  onClick={() => sendFeedback('gemini', 'dislike', 'manual')}
                >👎 Dislike</button>
              </div>
              {geminiManualOutput && manualEval && manualEval[0] && renderEval({
                ...manualEval[0].scores,
                overall: manualEval[0].scores.overall
              })}
              <div className="mt-2 text-slate-400 text-sm">Performance: {manualPerf ? manualPerf.gemini.toFixed(0) : '-'} ms | Cost: ${geminiManualOutput ? estimateCost(geminiManualOutput, 'gemini') : '-'}</div>
            </div>
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 p-6">
              <h4 className="text-lg font-bold text-green-300 mb-2">OpenAI Output</h4>
              <div className="text-slate-200 whitespace-pre-line">{openaiManualOutput}</div>
              <div className="flex gap-2 mt-2">
                <button
                  className={`px-2 py-1 rounded ${manualFeedback.openai === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                  onClick={() => sendFeedback('openai', 'like', 'manual')}
                >👍 Like</button>
                <button
                  className={`px-2 py-1 rounded ${manualFeedback.openai === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                  onClick={() => sendFeedback('openai', 'dislike', 'manual')}
                >👎 Dislike</button>
              </div>
              {openaiManualOutput && manualEval && manualEval[1] && renderEval({
                ...manualEval[1].scores,
                overall: manualEval[1].scores.overall
              })}
              <div className="mt-2 text-slate-400 text-sm">Performance: {manualPerf ? manualPerf.openai.toFixed(0) : '-'} ms | Cost: ${openaiManualOutput ? estimateCost(openaiManualOutput, 'openai') : '-'}</div>
            </div>
          </div>
        )}
        {(geminiManualOutput && openaiManualOutput && manualEval) && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mt-8">
            <h3 className="text-2xl font-bold text-white mb-2">Recommendation & Tradeoffs</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-slate-800/30 rounded-xl border border-slate-700/50">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-300">Model</th>
                    <th className="px-4 py-2 text-left text-slate-300">Chars</th>
                    <th className="px-4 py-2 text-left text-slate-300">Est. Cost*</th>
                    <th className="px-4 py-2 text-left text-slate-300">Performance (ms)</th>
                    <th className="px-4 py-2 text-left text-slate-300">Overall Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 font-semibold text-cyan-300">Gemini</td>
                    <td className="px-4 py-2 text-slate-200">{geminiManualOutput.length}</td>
                    <td className="px-4 py-2 text-green-300">${estimateCost(geminiManualOutput, 'gemini')}</td>
                    <td className="px-4 py-2 text-slate-200">{manualPerf ? manualPerf.gemini.toFixed(0) : '-'}</td>
                    <td className="px-4 py-2 text-yellow-400">{manualEval[0]?.scores?.overall}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold text-green-300">OpenAI</td>
                    <td className="px-4 py-2 text-slate-200">{openaiManualOutput.length}</td>
                    <td className="px-4 py-2 text-green-300">${estimateCost(openaiManualOutput, 'openai')}</td>
                    <td className="px-4 py-2 text-slate-200">{manualPerf ? manualPerf.openai.toFixed(0) : '-'}</td>
                    <td className="px-4 py-2 text-yellow-400">{manualEval[1]?.scores?.overall}</td>
                  </tr>
                </tbody>
              </table>
              <div className="text-xs text-slate-400 mt-1">*Estimated cost, hardcoded for demo purposes.</div>
            </div>
            <ul className="text-slate-200 mb-2 list-disc ml-6">
              <li>Gemini output: <span className="text-slate-400">{geminiManualOutput.length} chars, ${estimateCost(geminiManualOutput, 'gemini')}</span></li>
              <li>OpenAI output: <span className="text-slate-400">{openaiManualOutput.length} chars, ${estimateCost(openaiManualOutput, 'openai')}</span></li>
              <li>Gemini performance: {manualPerf ? manualPerf.gemini.toFixed(0) : '-'} ms</li>
              <li>OpenAI performance: {manualPerf ? manualPerf.openai.toFixed(0) : '-'} ms</li>
              <li>Gemini overall score: {manualEval[0]?.scores?.overall}</li>
              <li>OpenAI overall score: {manualEval[1]?.scores?.overall}</li>
            </ul>
            <p className="text-slate-400 mt-4">
              <span className="font-semibold">Tradeoff:</span> Review the outputs, scores, speed, and cost above. Choose <span className="text-cyan-300">Gemini</span> for cost-effective, fast, and factual responses; choose <span className="text-green-300">OpenAI</span> for creative, nuanced, or premium-quality tasks. Consider your application's needs and budget when choosing.
            </p>
          </div>
        )}
        {/* History display */}
        {manualHistory.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-bold text-white mb-2">Gemini/OpenAI Iteration History</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-slate-800/30 rounded-xl border border-slate-700/50">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-slate-300">Model</th>
                    <th className="px-2 py-1 text-left text-slate-300">Iteration</th>
                    <th className="px-2 py-1 text-left text-slate-300">Prompt</th>
                    <th className="px-2 py-1 text-left text-slate-300">Response</th>
                    <th className="px-2 py-1 text-left text-slate-300">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {manualHistory.map((h, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 text-cyan-300 font-semibold">{h.model}</td>
                      <td className="px-2 py-1 text-slate-200">{h.iteration + 1}</td>
                      <td className="px-2 py-1 text-slate-400 max-w-xs truncate">{h.prompt}</td>
                      <td className="px-2 py-1 text-slate-200 max-w-xs truncate">{h.response}</td>
                      <td className="px-2 py-1 text-yellow-400">{h.scores?.overall?.toFixed(1) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelComparison; 