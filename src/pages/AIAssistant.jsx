import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import useStore from '../store/store';
import ChatBubble from '../components/ChatBubble';
import { quickReplies } from '../data/mockData';

const aiResponses = {
  "What's low today?": `Here's your stock status right now:\n\n🔴 Critical (need immediate reorder):\n• MCB 32A Havells — 4 units left (reorder point: 20)\n• 6mm Copper Wire Polycab — 12m left (reorder point: 30m)\n• 3-pin Plug Anchor — 6 units left (reorder point: 30)\n\n⚠️ Warning (running low):\n• 3-pin Socket Anchor — 15 units (reorder at 25)\n• LED Batten 20W Philips — 8 units (reorder at 15)\n\nI'd recommend placing a Havells order first — MCB 32A will likely run out by tomorrow at current sales velocity.`,
  "Top sellers this week?": `This week's top performers:\n\n🥇 4mm Copper Wire (Finolex) — 142 units sold — ₹8,520 revenue\n🥈 MCB 16A (Havells) — 38 units — ₹7,980\n🥉 LED Bulb 9W (Syska) — 55 units — ₹1,925\n4. PVC Tape (Anchor) — 42 units — ₹630\n5. 3-pin Socket (Anchor) — 28 units — ₹980\n\nCopper wire is dominating this week with a 340% velocity spike over its average. Finolex 4mm is on fire.`,
  "Any theft alerts?": `I detected one anomaly today:\n\n🔍 3-pin Plug (Anchor): 18 units are missing with no matching sale. Last verified count was 24 units, but current inventory shows only 6.\n\nThis could indicate theft or a counting error.\n\nRecommendation: Do a physical count of 3-pin plugs today. If the count confirms 6 units, I'll flag this for your records.`,
  "What to reorder?": `Based on current stock levels and sales velocity, here's your recommended reorder list:\n\n🔴 Urgent:\n• MCB 32A (Havells) — Order 25 units — runs out tomorrow\n• 3-pin Plug (Anchor) — Order 30 units — critically low\n• 6mm Copper Wire (Polycab) — Order 25m — below reorder point\n\n⚠️ Soon:\n• 3-pin Socket (Anchor) — Order 15 units — approaching reorder\n• LED Batten 20W (Philips) — Order 10 units — ~3 days of stock\n\nEstimated total order value: ₹12,350. Want me to draft a WhatsApp message to your Havells distributor?`,
};

export default function AIAssistant() {
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);
  const isAiTyping = useStore((s) => s.isAiTyping);
  const setAiTyping = useStore((s) => s.setAiTyping);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    addMessage({ id: Date.now(), role: 'user', text, time });
    setInput('');
    setAiTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setAiTyping(false);
      const response = aiResponses[text] || `I'm analyzing your inventory data for "${text}". Based on current stock levels:\n\n• Total products: 11\n• Today's sales: ₹18,420\n• Items needing attention: 4\n\nCould you be more specific? I can help with stock levels, reorder suggestions, theft detection, or sales trends.`;
      addMessage({
        id: Date.now() + 1,
        role: 'ai',
        text: response,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
    }, 1500);
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
          <button key={qr} className="quick-reply" onClick={() => sendMessage(qr)}>
            {qr}
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
