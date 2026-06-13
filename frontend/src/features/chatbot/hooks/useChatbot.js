/**
 * features/chatbot/hooks/useChatbot.js
 * Manages the GlobalChatbot conversation state.
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import { getStoredUser, getStoredWallet } from '../../auth/hooks/useAuth';
import apiClient from '../../../shared/services/apiClient';

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';
const aiClient = axios.create({ baseURL: AI_URL, timeout: 60000 });

/**
 * @typedef {{ role: 'user'|'assistant', content: string, timestamp: Date }} ChatMessage
 */

export function useChatbot() {
  const [messages, setMessages] = useState([]);  // ChatMessage[]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send a message to the ChitX Oracle chatbot.
   * @param {string} text - User message
   */
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim()) return;

    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    // Build context from stored user
    const user = getStoredUser();
    const context = user
      ? {
          user: {
            name: user.name,
            trustScore: user.trustScore,
            income: user.income,
            expenses: user.expenses,
            ctxBalance: user.tokensIssued,
          },
          transactions: [],
          pools: [],
        }
      : {};

    // Build history (exclude the message we just added — backend wants prior history)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await aiClient.post('/ai/global-chat', {
        message: text,
        history,
        context,
      });

      const botMsg = {
        role: 'assistant',
        content: res.data?.response || 'I had trouble connecting to the Oracle. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      return botMsg;
    } catch (err) {
      setError(err.message);
      const errMsg = {
        role: 'assistant',
        content: 'The Oracle is temporarily offline. Please try again shortly.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
}
