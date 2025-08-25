import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  MessageCircle, Plus, Search, Phone, Video, MoreHorizontal,
  Send, Paperclip, Smile, User, Users, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import TypingIndicator from '../components/UI/TypingIndicator';
import MessageReactions from '../components/Messages/MessageReactions';
import MessageAttachments from '../components/Messages/MessageAttachments';
import { useTypingIndicator } from '../hooks/useTypingIndicator';

type Thread = {
  id: string;
  name?: string | null;
  is_group: boolean;
  group_id: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
};

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string | null;
  media_url?: string | null;
  read_by?: string[] | null;
  sender_profile?: {
    display_name: string;
    avatar_url?: string | null;
  };
  reactions?: Array<{
    id: string;
    user_id: string;
    emoji: string;
    created_at: string;
  }>;
  attachments?: Array<{
    id: string;
    file_path: string;
    mime_type: string;
    size_bytes: number;
  }>;
};

const Messages: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Typing indicator scoped to the current thread
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(selectedThread?.id || '');

  // Debounced stop-typing
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedStopTyping = () => {
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => stopTyping(), 1200);
  };

  // Ensure user session (so RLS sees auth.uid())
  async function requireSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.access_token) throw new Error('Not signed in');
    return session;
  }

  // Bootstrap threads list (narrow select, no joins)
  const bootstrapThreads = async () => {
    setLoading(true);
    try {
      await requireSession();
      const { data, error } = await supabase
        .from('threads')
        .select('id,is_group,group_id,created_by,created_at,updated_at,name')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error('Error loading threads:', err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  // Ensure a group thread via RPC and return its id
  async function ensureGroupThread(groupId: string): Promise<string> {
    await requireSession();
    const { data, error } = await supabase.rpc('chat_init_group', { p_group_id: groupId });
    if (error) {
      toast.error('Failed to initialise group chat');
      throw error;
    }
    const tId = data?.[0]?.thread_id as string | undefined;
    if (!tId) throw new Error('chat_init_group returned no thread_id');
    return tId;
  }

  // Ensure a direct thread via RPC and return its id
  async function ensureDirectThread(partnerUserId: string): Promise<string> {
    await requireSession();
    const { data, error } = await supabase.rpc('chat_init_direct', { p_partner: partnerUserId });
    if (error) {
      toast.error('Failed to initialise direct chat');
      throw error;
    }
    const tId = data?.[0]?.thread_id as string | undefined;
    if (!tId) throw new Error('chat_init_direct returned no thread_id');
    return tId;
  }

  // Load messages (narrow select), then fetch minimal sender profiles
  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      await requireSession();
      const { data, error } = await supabase
        .from('messages')
        .select('id,thread_id,sender_id,content,created_at,read_by,media_url')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;

      const rows = (data || []) as Message[];

      // Fetch sender profiles (minimal) — safe N+1
      const withProfiles = await Promise.all(rows.map(async (m) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('display_name,avatar_url')
          .eq('id', m.sender_id)
          .limit(1);
        const prof = p?.[0] ?? null;
        return {
          ...m,
          sender_profile: prof ? { display_name: prof.display_name, avatar_url: prof.avatar_url } : undefined,
        };
      }));

      setMessages(withProfiles);
    } catch (err) {
      console.error('Error loading messages:', err);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message (writes only to "content")
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedThread || !messageText.trim()) return;

    setSendingMessage(true);
    stopTyping();

    try {
      await requireSession();
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: profile.id,
          content: messageText.trim(),
        });

      if (error) {
        toast.error('Failed to send message');
        console.error('Error sending message:', error);
      } else {
        setMessageText('');
        await loadMessages(selectedThread.id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    return diffInHours < 24
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Initial threads load
  useEffect(() => {
    if (profile) {
      bootstrapThreads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Ensure + select a thread from URL (?group / ?partner) immediately
  useEffect(() => {
    if (!profile) return;
    const groupId = searchParams.get('group');
    const partnerId = searchParams.get('partner');

    let cancelled = false;

    (async () => {
      try {
        let tId: string | null = null;

        if (groupId) {
          tId = await ensureGroupThread(groupId);
        } else if (partnerId) {
          tId = await ensureDirectThread(partnerId);
        }

        if (tId) {
          // fetch the exact thread and select it (no race with list refresh)
          const { data: t, error } = await supabase
            .from('threads')
            .select('id,is_group,group_id,created_by,created_at,updated_at,name')
            .eq('id', tId)
            .single();
          if (error) throw error;
          if (!cancelled) setSelectedThread(t);
          // refresh sidebar after
          await bootstrapThreads();
        }
      } catch (e) {
        console.error('Failed to select ensured thread:', e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, searchParams]);

  // Load messages + realtime for selected thread
  useEffect(() => {
    if (!selectedThread) return;

    loadMessages(selectedThread.id);

    const channel = supabase
      .channel(`messages:${selectedThread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${selectedThread.id}` },
        () => { loadMessages(selectedThread.id); }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Thread list helpers
  const getThreadName = (thread: Thread) => thread.is_group ? (thread.name || 'Group Chat') : 'Direct Chat';
  const getThreadAvatar = (thread: Thread) => (thread.is_group ? null : null);
  const filteredThreads = threads.filter(t =>
    getThreadName(t).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex">
        <div className="w-72 border-r border-gray-200 p-4">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar - Thread List */}
      <aside className="w-72 border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length > 0 ? (
            <div className="space-y-1 p-2">
              {filteredThreads.map((thread) => {
                const threadName = getThreadName(thread);
                const threadAvatar = getThreadAvatar(thread);

                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      selectedThread?.id === thread.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      {threadAvatar ? (
                        <img
                          src={threadAvatar}
                          alt={threadName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          {thread.is_group ? (
                            <Users className="h-5 w-5 text-gray-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{threadName}</h3>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(thread.updated_at)}
                        </span>
                      </div>
                      {/* last_message preview omitted to avoid joins */}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No conversations match your search' : 'Start a conversation!'}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    {selectedThread.is_group ? (
                      <Users className="h-5 w-5 text-gray-600" />
                    ) : (
                      <User className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {getThreadName(selectedThread)}
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <Video className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length > 0 ? (
                <>
                  {messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === profile?.id;
                    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].sender_id !== message.sender_id);

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {showAvatar && !isOwnMessage && (
                            <div className="flex-shrink-0">
                              {message.sender_profile?.avatar_url ? (
                                <img
                                  src={message.sender_profile.avatar_url}
                                  alt={message.sender_profile.display_name || 'User'}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {showAvatar && !isOwnMessage && (
                              <span className="text-xs text-gray-500 mb-1">
                                {message.sender_profile?.display_name}
                              </span>
                            )}

                            <div className={`rounded-lg px-3 py-2 ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                              <p className="text-sm">{message.content}</p>

                              {/* Attachments (if you keep them) */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2">
                                  <MessageAttachments messageId={message.id} attachments={message.attachments} />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(message.created_at)}
                              </span>

                              {/* Reactions */}
                              <MessageReactions
                                messageId={message.id}
                                reactions={message.reactions || []}
                                onUpdate={() => selectedThread && loadMessages(selectedThread.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-gray-600">Start the conversation!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Typing Indicator */}
            <div className="px-4">
              <TypingIndicator users={typingUsers} className="mb-2" />
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <MessageAttachments messageId="" attachments={[]} showUpload={true} />
                    <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                      <Image className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        handleTyping();
                        debouncedStopTyping();
                      }}
                      onBlur={stopTyping}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={sendingMessage}
                    />
                    <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!messageText.trim() || sendingMessage}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h2>
              <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
