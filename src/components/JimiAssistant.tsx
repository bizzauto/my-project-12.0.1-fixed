import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageCircle, X, Send, Volume2, VolumeX, Bot, User, Globe, Shield, Phone, PhoneCall } from 'lucide-react';
import { jimi, LANGUAGES, Language } from '../services/jimi.service';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const JimiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Namaste! Main Jimi hoon, aapki AI assistant! 😊 Voice ya text se baat karo. "Help" bolo toh sab bataungi! 💕',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(jimi.getLanguage());
  const [showLangMenu, setShowLangMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    jimi.setMessageCallback((text: string, isUser: boolean) => {
      if (!isUser && text !== '🎤 Listening...') {
        setIsTyping(false);
      }
      addMessage(text, isUser);
    });

    jimi.setListeningCallback((listening: boolean) => {
      setIsListening(listening);
    });

    return () => {
      jimi.destroy();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        isUser,
        timestamp: new Date(),
      },
    ]);
  };

  const handleToggleListening = () => {
    if (isListening) {
      jimi.stopListening();
    } else {
      setIsTyping(true);
      jimi.startListening();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsTyping(true);

    await jimi.processUserInput(userMessage);

    // Check for navigation commands
    const lower = userMessage.toLowerCase();
    if (lower.includes('dashboard') || lower.includes('home')) {
      setTimeout(() => navigate('/dashboard'), 500);
    } else if (lower.includes('whatsapp') || lower.includes('message')) {
      setTimeout(() => navigate('/whatsapp'), 500);
    } else if (lower.includes('lead') || lower.includes('customer')) {
      setTimeout(() => navigate('/leads'), 500);
    } else if (lower.includes('review')) {
      setTimeout(() => navigate('/reviews'), 500);
    } else if (lower.includes('post') || lower.includes('google business')) {
      setTimeout(() => navigate('/google-business'), 500);
    } else if (lower.includes('creative') || lower.includes('poster')) {
      setTimeout(() => navigate('/creative'), 500);
    } else if (lower.includes('campaign')) {
      setTimeout(() => navigate('/campaigns'), 500);
    } else if (lower.includes('setting')) {
      setTimeout(() => navigate('/settings'), 500);
    } else if (lower.includes('analytics') || lower.includes('report')) {
      setTimeout(() => navigate('/analytics'), 500);
    } else if (lower.includes('social')) {
      setTimeout(() => navigate('/social'), 500);
    }

    // Check for call action and execute it
    if (lower.includes('call') || lower.includes('phone') || lower.includes('dial')) {
      // Find number to call
      const callMatch = userMessage.match(/(?:call|phone|dial|karo)\s+(?:kar)?\s*(.+)/i);
      if (callMatch && command.action === 'call_dial') {
        const { number } = command.params || {};
        if (number) {
          // Open phone dialer
          setTimeout(() => {
            window.location.href = `tel:${number}`;
          }, 1000);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      // Unmute - resume speaking
    } else {
      window.speechSynthesis?.cancel();
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setSelectedLang(lang);
    jimi.setLanguage(lang);
    setShowLangMenu(false);
    addMessage(`Ab hum ${LANGUAGES.find(l => l.code === lang)?.nativeName || lang} mein baat karenge! ✨`, false);
  };

  const previewVoice = () => {
    const previewTexts: Record<string, string> = {
      'hi-IN': 'Namaste! Main Jimi hun. Kaise ho aap? 😊',
      'en-US': 'Hello! I am Jimi. How are you? 😊',
      'mr-IN': 'नमस्कार! मी जिमी आहे. कसे आहात? 😊',
      'ta-IN': 'வணக்கம்! நான் ஜிமி. எப்படி இருக்கிறீர்கள்? 😊',
      'te-IN': 'నమస్కారం! నేను జిమ్మీ. ఎలా ఉన్నారు? 😊',
      'bn-IN': 'নমস্কার! আমি জিমি. কেমন আছেন? 😊',
      'gu-IN': 'નમસ્તે! હું જિમી છું. કેમ છો? 😊',
      'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ಜಿಮ್ಮಿ. ಹವಾಗಿದ್ದೀರಾ? 😊',
      'ml-IN': 'നമസ്കാരം! ഞാൻ ജിമ്മി ആണ്. എങ്ങനെ ഇരിക്കുന്നു? 😊',
      'pa-IN': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਜਿਮੀ ਹਾਂ. ਕਿਵੇਂ ਹੋ? 😊',
    };
    const text = previewTexts[selectedLang] || previewTexts['hi-IN'];
    jimi.speak(text);
    addMessage(`🎤 Voice preview: "${text}"`, false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-pink-500 hover:bg-pink-600'
            : isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
        }`}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : isListening ? (
          <MicOff size={24} className="text-white" />
        ) : (
          <span className="text-2xl">👩</span>
        )}
      </button>

      {/* Listening Indicator */}
      {isListening && !isOpen && (
        <div className="fixed bottom-36 right-6 z-50 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          🎤 Sun rahi hoon...
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-38 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 150px)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                👩
              </div>
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Jimi 💕
                  <Shield size={14} className="text-green-300" title="Protected Mode" />
                </h3>
                <p className="text-white/80 text-xs">
                  {isListening ? '🎤 Sun rahi hoon...' : isTyping ? '🧠 Soch rahi hoon...' : '💕 Tumhari friend • Ready'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors flex items-center gap-1"
                  title="Change Language"
                >
                  <Globe size={18} className="text-white" />
                  <span className="text-white text-xs hidden sm:inline">
                    {LANGUAGES.find(l => l.code === selectedLang)?.nativeName}
                  </span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-72 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                      <button
                        onClick={previewVoice}
                        className="w-full px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg text-xs font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50 flex items-center justify-center gap-1"
                      >
                        🔊 Preview Voice
                      </button>
                    </div>
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedLang === lang.code ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-xs text-gray-400">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Quick Call Button */}
              <button
                onClick={() => {
                  addMessage('📞 Bola: "Call karo [name]" ya "Save karo [name] [number]"', false);
                }}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Help with calls"
              >
                <Phone size={18} className="text-white" />
              </button>
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX size={18} className="text-white" />
                ) : (
                  <Volume2 size={18} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.isUser
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!msg.isUser && (
                      <Bot size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.isUser && (
                      <User size={16} className="text-white/70 mt-0.5 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleListening}
                className={`p-3 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                }`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or speak..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
              <Shield size={10} className="text-green-500" />
              <span>Protected Mode • Delete requires confirmation</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JimiAssistant;
