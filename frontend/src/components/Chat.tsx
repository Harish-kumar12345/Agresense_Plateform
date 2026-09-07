/// <reference path="../types/speech.d.ts" />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Bot, 
  User, 
  Sparkles,
  ArrowDown,
  Languages,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { ImageUpload } from './ImageUpload';
import { FarmData } from '../services/farmService';

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

type Message = { role: 'user' | 'assistant'; text: string; ts: number };

interface ChatProps {
  activeFarm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
    district?: string;
  };
  crop?: string;
}

export const Chat: React.FC<ChatProps> = ({ activeFarm, location, crop }) => {
  const { t, language, setLanguage, speak } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomId] = useState(() => Math.random().toString(36).slice(2));
  const [listening, setListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const socket = useMemo(() => io(backendUrl, { transports: ['websocket'] }), []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isScrolledUp);
  };

  useEffect(() => {
    socket.emit('join', { roomId });
    
    socket.on('assistant_typing', () => {
      setIsTyping(true);
    });
    
    socket.on('user_message', ({ text: t }: { text: string }) => {
      setMessages((m) => [...m, { role: 'user', text: t, ts: Date.now() }]);
    });
    
    socket.on('assistant_message', ({ text: t }: { text: string }) => {
      setIsTyping(false);
      setMessages((m) => [...m, { role: 'assistant', text: t, ts: Date.now() }]);
    });
    
    return () => { 
      socket.disconnect(); 
    };
  }, [roomId, socket]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    
    setMessages((m) => [...m, { role: 'user', text, ts: Date.now() }]);
    setInput('');
    setIsTyping(true);
    
    const farmContext = {
      location: activeFarm?.location_name || location?.city || 'India',
      crop: activeFarm?.crop || crop || 'Not specified',
      area_hectares: activeFarm?.area_hectares || 0,
      soil_type: activeFarm?.soil_type || 'Unknown',
      irrigation_type: activeFarm?.irrigation_type || 'Unknown',
      season: activeFarm?.season || 'Not specified',
      latitude: activeFarm?.latitude || location?.latitude || 0,
      longitude: activeFarm?.longitude || location?.longitude || 0,
      farm_name: activeFarm?.farm_name || 'My Farm',
      state: location?.state || '',
      district: location?.district || ''
    };

    socket.emit('user_message', {
      roomId,
      text,
      userId: 'user-' + Math.random().toString(36).slice(2),
      language,
      farmContext
    });
  }

  const handleImageUpload = (imageData: string, fileName: string) => {
    setIsUploadingImage(true);
    
    setMessages((m) => [...m, { 
      role: 'user', 
      text: `📸 Uploaded plant image: ${fileName}`, 
      ts: Date.now() 
    }]);
    
    socket.emit('plant_image_upload', {
      roomId,
      imageData,
      fileName,
      userId: 'user-' + Math.random().toString(36).slice(2),
      language
    });
    
    setTimeout(() => {
      setIsUploadingImage(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  function toggleMic() {
    const SpeechRecognitionCtor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('SpeechRecognition not supported in this browser');
      return;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.lang = language === 'ml' ? 'ml-IN' : 'en-IN';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' : '') + transcript);
      };
      recognitionRef.current.onend = () => setListening(false);
    } else {
      recognitionRef.current.lang = language === 'ml' ? 'ml-IN' : 'en-IN';
    }
    if (!listening) {
      setListening(true);
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  }

  function stopSpeaking() {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  const samplePrompts = [
    language === 'ml' ? 'നെല്ലിലെ കീടങ്ങളെ എങ്ങനെ നിയന്ത്രിക്കാം?' : 'How do I control Rice Blast & stem borer?',
    language === 'ml' ? 'ഈ ആഴ്ചയിലെ നനയ്ക്കുന്ന രീതി എന്താണ്?' : 'What is the optimal irrigation schedule for this soil moisture?',
    language === 'ml' ? 'NPK വളങ്ങളുടെ അളവ് പറയുക' : 'Recommend NPK dosage for current crop stage',
    language === 'ml' ? 'വിപണി വിലകൾ എങ്ങനെയാണ്?' : 'Analyze current mandi price trends'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto saas-card overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl relative">
      
      {/* Header Bar */}
      <div className="p-4 px-6 bg-slate-950/90 border-b border-white/10 flex items-center justify-between shrink-0 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-300/30">
            <Bot className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight font-display">
                {t('chat.title') || 'Agronomic AI Advisor'}
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeFarm?.farm_name || location?.city || 'Indian Agriculture'} • Crop: {crop || activeFarm?.crop || 'Rice'}
            </p>
          </div>
        </div>

        {/* Clean Segmented Language Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-white/10 text-xs font-semibold select-none">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ml')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'ml'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              മലയാളം
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div 
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-950/80 via-slate-900 to-slate-950"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto select-none">
            <div className="w-14 h-14 rounded-3xl bg-slate-800/80 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20 mb-4 text-emerald-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5 font-display">
              {language === 'ml' ? 'കാർഷിക എഐ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം' : 'Personalized Agronomic Guidance'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              {language === 'ml'
                ? 'നിങ്ങളുടെ വിളവെടുപ്പ്, കീടനിയന്ത്രണം, വളപ്രയോഗം, കാലാവസ്ഥ എന്നിവയെക്കുറിച്ച് ഏതു സംശയങ്ങളും ചോദിക്കാം.'
                : 'Ask questions regarding crop pathology, fertilizer dosages, optimal irrigation schedules, or mandi market rates.'}
            </p>

            {/* Quick Prompt Chips */}
            <div className="w-full space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Suggested Prompts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/30 text-left text-xs text-slate-300 transition-all cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 items-end ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center shrink-0 shadow-md border border-emerald-300/30 text-slate-950 mb-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-xs border border-emerald-500/30'
                    : 'bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/80'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                
                <div className="flex items-center justify-between gap-4 mt-2 pt-1 text-[11px] opacity-70">
                  <span>
                    {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speak(m.text)}
                        className="hover:text-emerald-300 transition-colors p-0.5 rounded cursor-pointer"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                        title="Stop speaking"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-300 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Bouncing Dots Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 items-end justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center shrink-0 shadow-md text-slate-950">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl rounded-bl-xs p-3.5 px-4 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-black/40 transition-transform active:scale-95 cursor-pointer z-20"
          title="Scroll to latest message"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-white/10 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          
          {/* Image Upload Trigger */}
          <div className="shrink-0">
            <ImageUpload 
              onImageUpload={handleImageUpload}
              isUploading={isUploadingImage}
            />
          </div>

          {/* Voice Input Mic Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer shrink-0 border ${
              listening
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10'
            }`}
            title={listening ? "Listening... click to stop" : "Voice Input"}
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'ml' ? 'ഇവിടെ ടൈപ്പ് ചെയ്യുക...' : 'Ask about crop health, pest diagnosis, or irrigation...'}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/30 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>

        </div>
      </div>

    </div>
  );
};
