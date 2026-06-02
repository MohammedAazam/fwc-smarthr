'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, X, Send, Bot, User, CornerDownLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your FWC SmartHR assistant. How can I help you manage leaves, check attendance, or review candidates today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!session) return null;

  const userRole = (session.user as any)?.role || 'employee';

  const suggestionChips = [
    { label: 'Remaining leaves?', role: ['employee', 'admin', 'senior_manager', 'hr_recruiter'] },
    { label: 'Show my attendance', role: ['employee', 'admin', 'senior_manager'] },
    { label: 'Candidates shortlisted?', role: ['admin', 'hr_recruiter'] },
    { label: 'Highest absentees this month?', role: ['admin', 'senior_manager'] },
  ];

  const filteredChips = suggestionChips.filter((chip) => chip.role.includes(userRole));

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "I'm sorry, I encountered a communication error. Please try again." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection timed out. Please check your network connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] mb-4 transition-all duration-300">
          
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100">SmartHR AI Copilot</h3>
                <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span>Online - Gemini 1.5</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Message Thread */}
          <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/40">
            {messages.map((msg, idx) => {
              const isAi = msg.role === 'assistant';
              return (
                <div key={idx} className={`flex items-start gap-2.5 ${!isAi ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center border shrink-0 text-xs ${
                    isAi
                      ? 'bg-indigo-500/10 border-indigo-500/15 text-indigo-400'
                      : 'bg-slate-800 border-slate-700 text-slate-350'
                  }`}>
                    {isAi ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </div>

                  <div className={`p-3 rounded-2xl text-xs max-w-[75%] leading-relaxed ${
                    isAi
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      : 'bg-indigo-600 text-white rounded-tr-none shadow shadow-indigo-600/10'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-full bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 text-xs">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-none text-xs flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Queries Chips */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-slate-850 flex flex-wrap gap-1.5 bg-slate-950/20">
              {filteredChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSendMessage(chip.label)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Panel Input Bar */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
            <input
              type="text"
              required
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 placeholder-slate-650 text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow shadow-indigo-600/10 active:scale-95 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border border-indigo-500/20 relative"
        title="Open AI Copilot"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6 animate-pulse" />}
        {/* Activity Dot */}
        {!isOpen && (
          <span className="absolute top-0 right-0 h-3 w-3 bg-emerald-400 rounded-full border-2 border-slate-950"></span>
        )}
      </button>

    </div>
  );
}
