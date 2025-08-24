import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { isInThread } from '../lib/membership';
import { 
  MessageCircle, Plus, Search, Phone, Video, MoreHorizontal,
  Send, Paperclip, Smile, User, Users, Settings, X, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import OnlineIndicator from '../components/UI/OnlineIndicator';
import TypingIndicator from '../components/UI/TypingIndicator';
import MessageReactions from '../components/Messages/MessageReactions';
import MessageAttachments from '../components/Messages/MessageAttachments';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface Thread {
  id: string;
  name?: string;
  is_group: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  participants?: Array<{
    user_id: string;
    profiles: {
      display_name: string;
      avatar_url?: string;
    };
  }>;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  read_by: string[];
  created_at: string;
  sender_profile?: {
    display_name: string;
    avatar_url?: string;
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
}

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

  // Typing indicator
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(selectedThread?.id || '');

  // Debounced stop typing
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedStopTyping = () => {
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }
    stopTypingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1200);
  };

  useEffect(() => {
    if (profile) {
      loadThreads();
    }
  }, [profile]);

  useEffect(() => {
    const groupId = searchParams.get('group');
    if (groupId && threads.length > 0) {
      // Find or create group thread
      const groupThread = threads.find(t => t.is_group && t.name?.includes('Group'));
      if (groupThread) {
        setSelectedThread(groupThread);
      }
    }
  }, [searchParams, threads]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel(`messages:${selectedThread.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThread.id}`
        }, (payload) => {
          loadMessages(selectedThread.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadThreads = async () => {
    if (!profile) return;

    try {
      // Load threads where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('thread_participants')
        .select('thread_id')
        .eq('user_id', profile.id);

      if (participantError) {
        console.error('Error loading thread participants:', participantError);
        setThreads([]);
        setLoading(false);
        return;
      }

      const threadIds = participantData?.map(tp => tp.thread_id) || [];
      
      if (threadIds.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      // Load thread details
      const { data: threadsData, error: threadsError } = await supabase
        .from('threads')
        .select('*')
        .in('id', threadIds)
        .order('updated_at', { ascending: false });

      if (threadsError) {
        console.error('Error loading threads:', threadsError);
        setThreads([]);
      } else {
        setThreads(threadsData || []);
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);

    try {
      // Load messages without complex joins to avoid policy recursion
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
        setMessages([]);
      } else {
        // Load sender profiles separately to avoid join issues
        const messagesWithProfiles = await Promise.all(
          (data || []).map(async (message) => {
            const { data: senderProfile, error: profileError } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', message.sender_id)
              .limit(1)
              .maybeSingle();

            return {
              ...message,
              sender_profile: senderProfile || { display_name: 'Unknown User', avatar_url: null },
              reactions: [],
              attachments: []
            };
          })
        );
        setMessages(messagesWithProfiles);

        // Mark messages as read
        const unreadMessageIds = messagesWithProfiles
          .filter(m => !m.read_by.includes(profile?.id || ''))
          .map(m => m.id);

        if (unreadMessageIds.length > 0) {
          await supabase
            .from('messages')
            .update({ 
              read_by: [...(messagesWithProfiles[0]?.read_by || []), profile?.id].filter(Boolean)
            })
            .in('id', unreadMessageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };


  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedThread || !messageText.trim()) return;

    setSendingMessage(true);
    stopTyping();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: profile.id,
          content: messageText.trim(),
          read_by: [profile.id]
        });

      if (error) {
        toast.error('Failed to send message');
        console.error('Error sending message:', error);
      } else {
        setMessageText('');
        loadMessages(selectedThread.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getThreadName = (thread: Thread) => {
    if (thread.is_group) {
      return thread.name || 'Group Chat';
    } else {
      const otherParticipant = thread.participants?.find(p => p.user_id !== profile?.id);
      return otherParticipant?.profiles.display_name || 'Unknown User';
    }
  };

  const getThreadAvatar = (thread: Thread) => {
    if (thread.is_group) {
      return null; // Groups don't have avatars in this simple implementation
    } else {
      const otherParticipant = thread.participants?.find(p => p.user_id !== profile?.id);
      return otherParticipant?.profiles.avatar_url;
    }
  };

  const getOtherParticipantId = (thread: Thread) => {
    if (thread.is_group) return null;
    const otherParticipant = thread.participants?.find(p => p.user_id !== profile?.id);
    return otherParticipant?.user_id;
  };

  const filteredThreads = threads.filter(thread =>
    getThreadName(thread).toLowerCase().includes(searchTerm.toLowerCase())
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
                const otherParticipantId = getOtherParticipantId(thread);
                const { status } = useOnlineStatus(otherParticipantId);
                
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
                      {!thread.is_group && otherParticipantId && (
                        <OnlineIndicator 
                          status={status}
                          size={8}
                          className="absolute -bottom-1 -right-1"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{threadName}</h3>
                        {thread.last_message && (
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(thread.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {thread.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {thread.last_message.content}
                        </p>
                      )}
                    </div>
                    
                    {thread.unread_count && thread.unread_count > 0 && (
                      <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {thread.unread_count > 99 ? '99+' : thread.unread_count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No conversations match your search' : 'Start a conversation with someone!'}
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
                  {getThreadAvatar(selectedThread) ? (
                    <img
                      src={getThreadAvatar(selectedThread)!}
                      alt={getThreadName(selectedThread)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {selectedThread.is_group ? (
                        <Users className="h-5 w-5 text-gray-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  )}
                  {!selectedThread.is_group && getOtherParticipantId(selectedThread) && (
                    <OnlineIndicator 
                      status={useOnlineStatus(getOtherParticipantId(selectedThread)!).status}
                      lastSeen={useOnlineStatus(getOtherParticipantId(selectedThread)!).lastSeen}
                      size={8}
                      className="absolute -bottom-1 -right-1"
                    />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{getThreadName(selectedThread)}</h2>
                  {!selectedThread.is_group && getOtherParticipantId(selectedThread) && (
                    <p className="text-sm text-gray-500">
                      {useOnlineStatus(getOtherParticipantId(selectedThread)!).status === 'online' ? 'Online' : 
                       useOnlineStatus(getOtherParticipantId(selectedThread)!).status === 'away' ? 'Away' : 'Offline'}
                    </p>
                  )}
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
                    const showAvatar = !isOwnMessage && (
                      index === 0 || 
                      messages[index - 1].sender_id !== message.sender_id
                    );
                    
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
                                  alt={message.sender_profile.display_name}
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
                            
                            <div className={`rounded-lg px-3 py-2 ${
                              isOwnMessage 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                              
                              {/* Message Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2">
                                  <MessageAttachments
                                    messageId={message.id}
                                    attachments={message.attachments}
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(message.created_at)}
                              </span>
                              
                              {/* Message Reactions */}
                              <MessageReactions
                                messageId={message.id}
                                reactions={message.reactions || []}
                                onUpdate={() => loadMessages(selectedThread.id)}
                              />
                              
                              {/* Message Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2">
                                  <MessageAttachments
                                    messageId={message.id}
                                    attachments={message.attachments}
                                  />
                                </div>
                              )}
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

            {/* Message Composer */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <MessageAttachments
                      messageId=""
                      attachments={[]}
                      showUpload={true}
                    />
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
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
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
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
              <p className="text-gray-600">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
