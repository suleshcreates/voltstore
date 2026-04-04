import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import useStore from '../store/store';
import useAuthStore from '../store/authStore';
import ChatBubble from '../components/ChatBubble';

const quickReplies = [
  { label: "What's low today?",     msg: "What items are low on stock today?" },
  { label: "Top sellers this week", msg: "Which items sold the most this week?" },
  { label: "Any theft alerts?",     msg: "Are there any theft or anomaly alerts?" },
  { label: "What to reorder?",      msg: "What should I reorder from supplier this week?" },
  { label: "Today's sales",         msg: "How much did I sell today?" },
  { label: "Margin check",          msg: "Which products am I discounting too much?" },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AIAssistant() {
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);
  const isAiTyping = useStore((s) => s.isAiTyping);
  const setAiTyping = useStore((s) => s.setAiTyping);
  const tenant = useAuthStore((s) => s.tenant);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isAiTyping) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    addMessage({ id: Date.now(), role: 'user', text: msg, time });
    setInput('');
    setAiTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          tenant_id: tenant?.id,
        }),
      });

      const data = await res.json();

      addMessage({
        id: Date.now() + 1,
        role: 'ai',
        text: data.reply || "Sorry, I couldn't get an answer. Try again.",
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
    } catch {
      addMessage({
        id: Date.now() + 1,
        role: 'ai',
        text: "Connection issue. Make sure the backend is running.",
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
    } finally {
      setAiTyping(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h1 className="page-title">AI Assistant</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="ai-whisper-dot" />
            <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>Online · Watching your inventory</span>
          </div>
        </div>
      </div>

      {/* Quick Replies */}
      <div className="quick-replies">
        {quickReplies.map((qr) => (
          <button key={qr.label} className="quick-reply" onClick={() => sendMessage(qr.msg)}>
            {qr.label}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Typing Indicator */}
          {isAiTyping && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md) 0',
          borderTop: '1px solid var(--black-3)',
        }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <input
              placeholder="Ask about your inventory..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            />
          </div>
          <button className="btn btn-ghost" style={{ padding: '12px' }} title="Voice input">
            <Mic size={18} />
          </button>
          <button className="btn btn-primary" style={{ padding: '12px 16px' }} onClick={() => sendMessage(input)}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
