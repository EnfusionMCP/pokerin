/** Chat panel — left side sliding panel with dealer messages and player chat */

import { useState, useRef, useEffect } from 'react';
import { useTableStore } from '../../stores/tableStore';

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const chatMessages = useTableStore((s) => s.chatMessages);
  const send = useTableStore((s) => s.send);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  useEffect(() => {
    if (isOpen) {
      lastSeenCount.current = chatMessages.length;
    }
  }, [isOpen, chatMessages.length]);

  const hasUnread = !isOpen && chatMessages.length > lastSeenCount.current;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !send) return;
    send({ type: 'chat', text });
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-3 bottom-20 z-30 w-10 h-10 rounded-xl bg-panel/90 border border-gray-700/60 flex items-center justify-center hover:bg-panel-light transition-all shadow-lg backdrop-blur-sm"
        title="Chat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gold rounded-full shadow-sm" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed left-0 top-[52px] bottom-0 w-64 bg-panel/95 backdrop-blur-md border-r border-gray-700/60 z-30 flex flex-col animate-slide-in-left shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/60">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Table Chat</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-300 text-sm transition-colors"
            >
              &#x2715;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {chatMessages.length === 0 && (
              <div className="text-[10px] text-gray-700 text-center mt-4">No messages yet</div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-xs leading-relaxed">
                {msg.system ? (
                  <span className="text-gray-600 italic">{msg.text}</span>
                ) : (
                  <>
                    <span className="text-gold font-semibold">{msg.name}: </span>
                    <span className="text-gray-300">{msg.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-2 py-2.5 border-t border-gray-700/60 flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 bg-surface border border-gray-700/60 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-700 outline-none focus:border-gold/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-2.5 py-1.5 bg-gold/15 hover:bg-gold/25 text-gold rounded-lg text-xs font-semibold transition-colors disabled:opacity-25"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
