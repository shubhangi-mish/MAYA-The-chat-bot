import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'maya';
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const PROMPT_ID = 'default';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, setMessages }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'openai' | 'claude'>('gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');

  // Track conversation history with system prompt only at the start
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [lastPrompt, setLastPrompt] = useState('');

  // Track when to evaluate
  const evalCounter = useRef(0);

  // Add state to track feedback per Maya message
  const [chatFeedback, setChatFeedback] = useState<{ [id: string]: 'like' | 'dislike' | undefined }>({});

  // Add state to track evaluation results per Maya message
  const [messageScores, setMessageScores] = useState<{ [id: string]: number }>({});

  // Add state to track full evaluation results per Maya message
  const [messageFullScores, setMessageFullScores] = useState<{ [id: string]: any }>({});

  const [messageResponseTimes, setMessageResponseTimes] = useState<{ [id: string]: number }>({});

  const [sessionId, setSessionId] = useState<string>(() => uuidv4());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Count user+maya pairs
    const pairs = [];
    let lastUser = null;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].sender === 'user') lastUser = messages[i];
      if (messages[i].sender === 'maya' && lastUser) {
        pairs.push([lastUser, messages[i]]);
        lastUser = null;
      }
    }
    if (pairs.length > 0 && pairs.length % 3 === 0 && pairs.length !== evalCounter.current) {
      // Evaluate last 3 rounds
      const last3 = pairs.slice(-3);
      const user_message = last3.map(p => p[0].content).join('\n');
      const conversation_history = last3.flatMap(p => ([
        { role: 'user', content: p[0].content },
        { role: 'maya', content: p[1].content }
      ]));
      (async () => {
        const evalRes = await fetch('http://localhost:8000/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            test_scenarios: [
              {
                name: 'Chat Evaluation',
                user_message,
                expected_themes: [],
                conversation_history
              }
            ]
          })
        });
        const evalData = await evalRes.json();
        if (evalData.evaluation_results && evalData.evaluation_results[0]?.scores?.overall) {
          await fetch('http://localhost:8000/prompt/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt_id: PROMPT_ID,
              score: evalData.evaluation_results[0].scores.overall
            })
          });
        }
        evalCounter.current = pairs.length;
      })();
    }
  }, [messages]);

  // Fetch the latest prompt from PromptManager
  const fetchCurrentPrompt = async () => {
    const res = await fetch(`/prompt/history/${PROMPT_ID}`);
    const data = await res.json();
    const last = data.history && data.history.length > 0 ? data.history[data.history.length - 1].prompt : '';
    setCurrentPrompt(last);
    setLastPrompt(last);
    // Start new conversation if prompt changes
    setConversationHistory(last ? [{ role: 'system', content: last }] : []);
  };

  useEffect(() => {
    fetchCurrentPrompt();
  }, []);

  // If the prompt changes during a session, start a new conversation
  useEffect(() => {
    if (currentPrompt && currentPrompt !== lastPrompt) {
      setConversationHistory([{ role: 'system', content: currentPrompt }]);
      setLastPrompt(currentPrompt);
      setSessionId(uuidv4());
    }
  }, [currentPrompt]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message to conversation history
      const newHistory = [...conversationHistory, { role: 'user', content: inputMessage }];
      setConversationHistory(newHistory);
      const t0 = Date.now();
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_history: newHistory,
          model: selectedModel
        }),
      });
      const t1 = Date.now();
      const responseTime = (t1 - t0) / 1000; // in seconds
      const data = await response.json();
      const mayaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'maya',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, mayaMessage]);
      setConversationHistory(hist => [...hist, { role: 'maya', content: data.response }]);
      setMessageResponseTimes(times => ({ ...times, [mayaMessage.id]: responseTime }));
      // Evaluate the Maya response
      fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_scenarios: [
            {
              name: 'Chat Evaluation',
              user_message: inputMessage,
              expected_themes: [],
              conversation_history: [
                { role: 'user', content: inputMessage },
                { role: 'maya', content: data.response }
              ]
            }
          ]
        })
      })
        .then(res => res.json())
        .then(evalData => {
          if (evalData.evaluation_results && evalData.evaluation_results[0]?.scores?.overall) {
            setMessageScores(scores => ({ ...scores, [mayaMessage.id]: evalData.evaluation_results[0].scores.overall }));
            setMessageFullScores(full => ({ ...full, [mayaMessage.id]: evalData.evaluation_results[0].scores }));
          }
        });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Oops! I'm having a little technical hiccup right now. Can you try again in a moment? 💫",
        sender: 'maya',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Maya</h2>
          <p className="text-sm text-slate-400">Sustainable Living Influencer</p>
        </div>
        {/* Model Toggle */}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="model-select" className="text-slate-400 text-sm">Model:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value as 'gemini' | 'openai' | 'claude')}
            className="bg-slate-700/50 text-white rounded px-2 py-1 border border-slate-600/50 focus:outline-none"
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-slate-700/50 text-slate-100'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.sender === 'maya' && (
                  <>
                    {/* Red alert icon for inappropriate message */}
                    {message.content === "Sorry, I can only answer questions about sustainable living, plant-based eating, and wellness." && (
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                    )}
                    <Sparkles className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  </>
                )}
                {message.sender === 'user' && (
                  <User className="w-4 h-4 text-white mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {message.sender === 'maya' && (
                <div className="flex gap-2 mt-1">
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback[message.id] === 'like' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => {
                      setChatFeedback(fb => ({ ...fb, [message.id]: 'like' }));
                      const baseScore = messageScores[message.id] || 80;
                      const adjustedScore = baseScore + 5;
                      const fullScores = messageFullScores[message.id];
                      if (!fullScores) return;
                      console.log('Submitting feedback with scores:', { ...fullScores, overall: adjustedScore });
                      fetch('http://localhost:8000/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          session_id: sessionId,
                          model: selectedModel,
                          response: message.content,
                          feedback: 'like',
                          prompt: currentPrompt,
                          mode: 'chat',
                          scores: { ...fullScores, overall: adjustedScore },
                          timestamp: new Date().toISOString(),
                          response_time: messageResponseTimes[message.id]
                        })
                      });
                    }}
                    disabled={!messageFullScores[message.id]}
                  >👍 Like{!messageFullScores[message.id] && <span className="ml-2 animate-spin">⏳</span>}</button>
                  <button
                    className={`px-2 py-1 rounded ${chatFeedback[message.id] === 'dislike' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white/70'}`}
                    onClick={() => {
                      setChatFeedback(fb => ({ ...fb, [message.id]: 'dislike' }));
                      const baseScore = messageScores[message.id] || 80;
                      const adjustedScore = baseScore - 5;
                      const fullScores = messageFullScores[message.id];
                      if (!fullScores) return;
                      console.log('Submitting feedback with scores:', { ...fullScores, overall: adjustedScore });
                      fetch('http://localhost:8000/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          session_id: sessionId,
                          model: selectedModel,
                          response: message.content,
                          feedback: 'dislike',
                          prompt: currentPrompt,
                          mode: 'chat',
                          scores: { ...fullScores, overall: adjustedScore },
                          timestamp: new Date().toISOString(),
                          response_time: messageResponseTimes[message.id]
                        })
                      });
                    }}
                    disabled={!messageFullScores[message.id]}
                  >👎 Dislike{!messageFullScores[message.id] && <span className="ml-2 animate-spin">⏳</span>}</button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 rounded-2xl px-4 py-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-400" />
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">Maya is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Maya about sustainable living, yoga, or plant-based recipes..."
            className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-white font-medium hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;