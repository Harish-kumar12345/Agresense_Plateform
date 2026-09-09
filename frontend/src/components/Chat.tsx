/// <reference path="../types/speech.d.ts" />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  User, 
  ArrowDown,
  Sprout,
  ShieldCheck,
  Compass,
  FlaskConical,
  Bug,
  Droplets,
  IndianRupee,
  Activity,
  Layers,
  Sparkles
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
      text: `Uploaded plant sample: ${fileName}`, 
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
    if (e.key === 'Enter') {
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
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' : '') + transcript);
      };
      recognitionRef.current.onend = () => setListening(false);
    } else {
      recognitionRef.current.lang = 'en-IN';
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

  const agronomicCategories = [
    {
      icon: <Bug className="w-4 h-4 text-rose-400" />,
      title: 'Pathology & Pest Control',
      prompt: 'Identify symptoms and remedy for Rice Blast & fungal sheath rot'
    },
    {
      icon: <FlaskConical className="w-4 h-4 text-emerald-400" />,
      title: 'NPK & Soil Nutrition',
      prompt: 'Recommend exact NPK micro-dosing and foliar spray schedule for this soil'
    },
    {
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      title: 'Irrigation & Moisture',
      prompt: 'Calculate optimal irrigation schedule based on canopy humidity and forecasted rain'
    },
    {
      icon: <IndianRupee className="w-4 h-4 text-amber-400" />,
      title: 'Mandi Price & Arbitrage',
      prompt: 'Analyze regional APMC mandi price arrivals versus minimum support prices'
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto rounded-3xl overflow-hidden bg-[#0D1612]/95 border border-emerald-900/40 shadow-2xl relative">
      
      {/* Header Bar - Agronomic Specialist Console */}
      <div className="p-4 px-6 bg-[#070D0A]/95 border-b border-emerald-900/40 flex items-center justify-between shrink-0 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-600/25 border border-emerald-300/40 shrink-0">
            <Sprout className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight font-display">
                <span className="apple-title-gradient">Agronomic AI Specialist</span> Console
              </h2>
              <span className="apple-segmented-item active text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline-block mr-1" />
                ICAR Agronomy Verified
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] flex items-center gap-2 mt-1">
              <span>{activeFarm?.farm_name || location?.city || 'Indian Precision Farm'}</span>
              <span className="text-slate-700">•</span>
              <span>Crop: <strong className="text-white">{crop || activeFarm?.crop || 'Rice'}</strong></span>
              <span className="text-slate-700">•</span>
              <span className="text-emerald-400 font-mono text-[11px]">Telemetry Active</span>
            </p>
          </div>
        </div>

        {/* Console Mode Badge */}
        <div className="flex items-center gap-2">
          <span className="apple-segmented-item active">
            English Mode
          </span>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div 
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-[#070D0A] via-[#0D1612] to-[#070D0A]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto select-none">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-4 text-emerald-400">
              <Sprout className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1.5 font-display">
              Precision Agronomic Advisory Station
            </h3>
            <p className="text-xs sm:text-sm text-[#D1DED6] mb-8 leading-relaxed max-w-md">
              Direct agronomic guidance tailored to your active farm plot coordinates, soil horizon, and weather forecast.
            </p>

            {/* Quick Diagnostic Inquiry Tiles */}
            <div className="w-full space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 text-left">
                Recommended Agronomic Inquiries
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {agronomicCategories.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(item.prompt)}
                    className="p-3.5 rounded-2xl bg-[#070D0A]/80 hover:bg-[#13231B] border border-emerald-900/40 hover:border-emerald-500/40 text-left transition-all duration-200 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1 rounded-lg bg-white/5 border border-white/10 shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#82968C] leading-snug line-clamp-2">
                      {item.prompt}
                    </p>
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
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-md border border-emerald-400/40 text-slate-950 mb-1">
                  <Sprout className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-xs border border-emerald-500/40 shadow-emerald-950/40'
                    : 'bg-[#0D1612]/95 text-slate-100 rounded-bl-xs border border-emerald-900/40 shadow-black/40'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                
                <div className="flex items-center justify-between gap-4 mt-2.5 pt-1.5 border-t border-white/10 text-[11px] opacity-70">
                  <span className="font-mono text-[10px]">
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
                <div className="w-8 h-8 rounded-xl bg-[#070D0A] border border-emerald-900/40 flex items-center justify-center shrink-0 text-slate-300 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Synthesizing Telemetry Indicator */}
        {isTyping && (
          <div className="flex gap-3 items-end justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-md text-slate-950">
              <Sprout className="w-4 h-4" />
            </div>
            <div className="bg-[#0D1612]/95 border border-emerald-900/40 rounded-2xl rounded-bl-xs p-3.5 px-4 shadow-sm flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-medium">Analyzing agronomic parameters</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]"></span>
              </div>
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

      {/* Live Mic Waveform Indicator when Listening */}
      {listening && (
        <div className="px-6 py-2 bg-emerald-950/40 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>Listening to voice query in {language === 'ml' ? 'Malayalam' : 'English'}...</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="w-1 h-5 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.1s]"></span>
            <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
            <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.15s]"></span>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-[#070D0A]/95 border-t border-emerald-900/40 backdrop-blur-xl z-20">
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
                : 'bg-[#0D1612] hover:bg-[#13231B] text-slate-300 hover:text-white border-emerald-900/40'
            }`}
            title={listening ? "Listening... click to stop" : "Voice Input"}
          >
            {listening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'ml' ? 'ഇവിടെ ടൈപ്പ് ചെയ്യുക...' : 'Ask about crop health, pest diagnosis, or irrigation...'}
              className="w-full px-4 py-3 bg-[#0D1612] border border-emerald-900/40 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-700/30 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>

        </div>
      </div>

    </div>
  );
};
