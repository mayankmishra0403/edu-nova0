import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from '../contexts/AuthContext.jsx';
import { databases, ID, config, Query } from '../lib/firebase.js';


const GeminiChatBot = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [knowledge, setKnowledge] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const API_KEY = process.env.REACT_APP_GEMINI_KEY; // WARNING: keep only for dev; use server function in production.
  const { user } = useAuth();
  // Load existing chat sessions for user
  useEffect(() => {
    const loadSessions = async () => {
      if (!user || !config.chatSessionsCollectionId || !config.databaseId) { setLoadingSessions(false); return; }
      try {
        const res = await databases.listDocuments(config.databaseId, config.chatSessionsCollectionId, [Query.equal('userId', user.$id), Query.orderDesc('$updatedAt'), Query.limit(20)]);
        setSessions(res.documents || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[chat][sessions] load failed', e?.message);
      } finally { setLoadingSessions(false); }
    };
    loadSessions();
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!sessionId || !config.chatMessagesCollectionId || !config.databaseId) return;
      try {
        const res = await databases.listDocuments(config.databaseId, config.chatMessagesCollectionId, [Query.equal('sessionId', sessionId), Query.orderAsc('createdAt'), Query.limit(100)]);
        const msgs = (res.documents || []).map(d => ({ role: d.role, content: d.content, timestamp: new Date(d.createdAt || d.$createdAt) }));
        setMessages(msgs);
      } catch (e) {
        console.warn('[chat][messages] load failed', e?.message);
      }
    };
    loadMessages();
  }, [sessionId]);

  const createSession = async () => {
    if (!user || !config.chatSessionsCollectionId || !config.databaseId) return;
    try {
      const doc = await databases.createDocument(config.databaseId, config.chatSessionsCollectionId, ID.unique(), { userId: user.$id, title: "New Chat" });
      setSessionId(doc.$id);
      setSessions(s => [doc, ...s]);
      setMessages([]);
    } catch (e) {
      console.warn('[chat][session] create failed', e?.message);
    }
  };

  const renameSession = async (id, currentTitle) => {
    if (!user || !id || !config.chatSessionsCollectionId || !config.databaseId) return;
    const proposed = window.prompt('Rename chat:', currentTitle || 'Untitled Chat');
    if (proposed == null) return; // cancel
    const title = proposed.trim().slice(0, 60);
    if (!title) return;
    try {
      await databases.updateDocument(config.databaseId, config.chatSessionsCollectionId, id, { title });
      setSessions(s => s.map(sess => sess.$id === id ? { ...sess, title } : sess));
    } catch (e) {
      console.warn('[chat][session] rename failed', e?.message);
    }
  };

  const saveMessage = async (role, content) => {
    if (!sessionId) return; // only persist if session chosen
    if (!config.chatMessagesCollectionId || !config.databaseId) return;
    try {
      await databases.createDocument(config.databaseId, config.chatMessagesCollectionId, ID.unique(), {
        sessionId,
        userId: user?.$id || null,
        role,
        content,
        createdAt: new Date().toISOString(),
      });
      // Update session updatedAt implicitly by updating title (noop) or you can use a dedicated field
      await databases.updateDocument(config.databaseId, config.chatSessionsCollectionId, sessionId, { lastMessageAt: new Date().toISOString() });
    } catch (e) { console.warn('[chat][message] save failed', e?.message); }
  };

  // Load training text
  useEffect(() => {
    fetch("/training-data.txt")
      .then((res) => res.text())
      .then((data) => setKnowledge(data))
      .catch((err) => console.error("Failed to load training data:", err));
  }, []);

  // Init voice (STT + TTS)
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }

    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Auto-scroll within chat only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text) => {
    if (synthRef.current && !isSpeaking) {
      setIsSpeaking(true);
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utter);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;
  const userMessage = { role: "user", content: currentInput, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
  saveMessage('user', currentInput);
    setInput("");
    setLoading(true);

    try {
      const prompt = `You are an educational assistant. Use the following knowledge if it helps. If it's not relevant, feel free to answer using your own intelligence.\n\nKnowledge:\n${knowledge}\n\nQuestion: ${currentInput}`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          contents: [
            { parts: [{ text: prompt }] }
          ]
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const botReply = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";
  const botMessage = { role: "bot", content: botReply, timestamp: new Date() };
      setMessages((prev) => [...prev, botMessage]);
      speakText(botReply);
  saveMessage('bot', botReply);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errMsg = { role: "bot", content: "❌ Error: " + error.message, timestamp: new Date() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {user && config.chatSessionsCollectionId && (
        <div className="chat-sessions" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems:'center' }}>
          <button className="button ghost" onClick={createSession} disabled={loadingSessions} title="Create new chat session">+ New Chat</button>
          {loadingSessions ? (
            <span className="muted">Loading chats...</span>
          ) : sessions.length === 0 ? (
            <span className="muted">No chats yet.</span>
          ) : (
            sessions.map(s => (
              <div key={s.$id} style={{ display:'flex', alignItems:'center' }}>
                <button
                  className={`button ghost ${sessionId===s.$id?'is-active':''}`}
                  onClick={() => setSessionId(s.$id)}
                  onDoubleClick={() => renameSession(s.$id, s.title)}
                  style={{ display:'flex', alignItems:'center', gap:6, paddingRight:8 }}
                  title="Click to open • Double‑click to rename"
                >
                  <span style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title || 'Chat'}</span>
                </button>
                <button
                  onClick={() => renameSession(s.$id, s.title)}
                  className="chat-rename-btn"
                  title="Rename chat"
                  aria-label="Rename chat"
                >
                  <span className="icon-pencil" aria-hidden="true">✎</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__avatar">🤖</div>
        <div className="chat-header__info">
          <h3>Edunova EduAI</h3>
          <span className="chat-header__status">Online • Ready to help</span>
        </div>
        <div className="chat-header__actions">
          {isSpeaking && (
            <button className="voice-btn voice-btn--stop" onClick={stopSpeaking}>🔇</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome__avatar">🤖</div>
            <h4>Hi! I'm EduAI</h4>
            <p>Ask about academics, placements, or competitions. Type or use voice!</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role === "user" ? "message--user" : "message--bot"}`}>
            <div className="message__avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
            <div className="message__bubble">
              <div className="message__content">{msg.content}</div>
              <div className="message__time">
                {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message message--bot">
            <div className="message__avatar">🤖</div>
            <div className="message__bubble message__bubble--typing">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input">
        <div className="chat-input__wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="chat-input__field"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            className={`voice-btn ${isListening ? "voice-btn--listening" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={!recognitionRef.current}
          >
            {isListening ? "🎙️" : "🎤"}
          </button>
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatBot;
