'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { io, Socket } from 'socket.io-client';
import { Send, Users, LogOut, MessageCircle, Hash } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface User {
  id: string;
  email?: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  room_id: string;
  created_at: string;
  user: {
    id: string;
    username: string;
  };
}

interface ActiveUser {
  id: string;
  username: string;
  email: string;
}

const AuthComponent = ({ onAuth }: { onAuth: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        
        if (error) throw error;
        if (data.user) onAuth(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        
        if (error) throw error;
        
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: username.trim() || email.split('@')[0]
            });
          } catch (e) {
            console.log('Profile creation failed:', e);
          }
          onAuth(data.user);
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <MessageCircle className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-white">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Username"
            />
          )}
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Email"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Password (min 6 characters)"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback(async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setConnectionStatus('No auth token');
        return;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      setConnectionStatus('Connecting...');
      
      const socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnectionStatus('Authenticating...');
        socket.emit('authenticate', { token: session.access_token });
      });

      socket.on('authenticated', () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        socket.emit('join_room', 'general');
      });

      socket.on('auth_error', (error) => {
        setConnectionStatus(`Auth error: ${error.error}`);
        setIsConnected(false);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      });

      socket.on('connect_error', (error) => {
        setConnectionStatus('Connection failed');
        setIsConnected(false);
      });

      socket.on('message_history', (history) => {
        setMessages(history);
      });

      socket.on('new_message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('active_users', (users) => {
        setActiveUsers(users);
      });

      socket.on('user_connected', (data) => {
        setActiveUsers(data.activeUsers);
      });

      socket.on('user_disconnected', (data) => {
        setActiveUsers(data.activeUsers);
      });

    } catch (error) {
      setConnectionStatus('Connection error');
    }
  }, [user]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setMessages([]);
        setActiveUsers([]);
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, connectSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    socketRef.current.emit('send_message', {
      content: newMessage.trim(),
      roomId: 'general'
    });

    setNewMessage('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) {
    return <AuthComponent onAuth={setUser} />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        <div className="h-16 border-b border-gray-700 flex items-center px-4">
          <h1 className="font-bold">Chat App</h1>
          <div className="ml-auto flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Channels</h3>
            <div className="flex items-center px-2 py-1 rounded bg-gray-600">
              <Hash className="w-4 h-4 text-gray-400 mr-2" />
              <span>general</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Online — {activeUsers.length}
            </h3>
            {activeUsers.map((user) => (
              <div key={user.id} className="px-2 py-1 text-sm">
                {user.username}
              </div>
            ))}
          </div>
        </div>

        <div className="h-16 bg-gray-900 flex items-center px-4 justify-between">
          <span className="text-sm">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6">
          <Hash className="w-6 h-6 text-gray-400 mr-2" />
          <h2 className="text-xl font-semibold">general</h2>
          <div className="ml-4 text-sm text-gray-400">
            {connectionStatus}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isConnected && (
            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded">
              <p className="text-red-300">Not connected to server</p>
              <button
                onClick={connectSocket}
                className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Retry Connection
              </button>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-sm">
                {message.user.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold">{message.user.username}</span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <div className="text-gray-100">{message.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gray-800">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message #general"
              className="flex-1 px-4 py-2 bg-gray-700 rounded text-white"
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;