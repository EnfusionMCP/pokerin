import { useState, useRef, useEffect } from 'react';
import { useTableStore } from '../../stores/tableStore';

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const chatMessages = useTableStore((s) => s.chatMessages);
  const send = useTableStore((s) => s.send);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  useEffect(() => { if (isOpen) lastSeenCount.current = chatMessages.length; }, [isOpen, chatMessages.length]);
  const hasUnread = !isOpen && chatMessages.length > lastSeenCount.current;
  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isOpen]);

  const handleSend = () => { const text = input.trim(); if (!text || !send) return; send({ type: 'chat', text }); setInput(''); };
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-3 bottom-20 z-30 w-10 h-10 rounded-full bg-surface border border-surface-light flex items-center justify-center hover:bg-surface-light transition-all shadow-lg"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {hasUnread && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green rounded-full" />}
      </button>

      {isOpen && (
        <div className="fixed left-0 top-[60px] bottom-0 w-64 bg-surface/95 backdrop-blur-md border-r border-surface-light z-30 flex flex-col animate-slide-in-left shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-light">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Table Chat</span>
            <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text text-sm">&#x2715;</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {chatMessages.length === 0 && <div className="text-[10px] text-text-muted text-center mt-4">No messages yet</div>}
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-xs leading-relaxed">
                {msg.system ? (
                  <span className="text-text-muted italic">{msg.text}</span>
                ) : (
                  <><span className="text-green font-bold">{msg.name}: </span><span className="text-text">{msg.text}</span></>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-2 py-2.5 border-t border-surface-light flex gap-1.5">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Type a message..." maxLength={200}
              className="flex-1 bg-base border-2 border-surface-light rounded-lg px-2.5 py-1.5 text-xs text-text placeholder-text-muted/50 outline-none focus:border-green/40 transition-colors font-medium"
            />
            <button onClick={handleSend} disabled={!input.trim()} className="px-2.5 py-1.5 bg-green/15 hover:bg-green/25 text-green rounded-lg text-xs font-bold transition-colors disabled:opacity-25">Send</button>
          </div>
        </div>
      )}
    </>
  );
}
