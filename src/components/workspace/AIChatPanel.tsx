import React from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Lightbulb, 
  Trash2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { Dataset, ChatMessage } from '../../types/dataset';

interface AIChatPanelProps {
  dataset: Dataset;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ dataset }) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm SDA — your Universal AI Data Analyst & Analytics Assistant. I've indexed **${dataset.name}** (${dataset.rows.length} rows, ${dataset.columns.length} columns). What insights, schema validation, SQL queries, or statistical transformations would you like me to perform?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Quick prompt suggestions tailored to dataset
  const suggestedPrompts = React.useMemo(() => {
    const numericCol = dataset.columns.find(c => c.type === 'number')?.name || 'value';
    const catCol = dataset.columns.find(c => c.type === 'string')?.name || 'category';

    return [
      `What are the top key drivers for ${numericCol}?`,
      `Show me outliers or anomalous data points in ${numericCol}`,
      `Generate a SQL query to calculate average ${numericCol} grouped by ${catCol}`,
      `Provide strategic business recommendations based on this dataset`,
    ];
  }, [dataset]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          datasetContext: {
            name: dataset.name,
            rowCount: dataset.rows.length,
            columns: dataset.columns.map(c => ({ name: c.name, type: c.type })),
            sampleRows: dataset.rows.slice(0, 5),
          },
        }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I analyzed the dataset and compiled the insights.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error connecting to the AI analysis engine. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-850/50">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/20">
            <Bot className="h-5 w-5" />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Smart Data Analysis AI Co-Pilot
            </h3>
            <p className="text-[11px] text-slate-400">
              Active Context: {dataset.name} ({dataset.rows.length} rows)
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Clear Conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Message History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-cyan-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div
              className={`group relative rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-750'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              <div
                className={`mt-2 flex items-center justify-between text-[10px] ${
                  msg.role === 'user' ? 'text-cyan-200' : 'text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopyText(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-cyan-500 flex items-center gap-1"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white">
              <Bot className="h-4 w-4 animate-bounce" />
            </div>
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-500" />
              <span>Analyst co-pilot thinking & querying dataset...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pill List */}
      <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 overflow-x-auto text-xs">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Prompt Controls */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask your AI data analyst a question..."
            className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isTyping}
            className="flex items-center justify-center rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white h-11 w-11 shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
