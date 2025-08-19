import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  Send, Smile, Paperclip, MoreHorizontal, Users, 
  Crown, Shield, UserMinus, Settings, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import OnlineIndicator from '../UI/OnlineIndicator';
import TypingIndicator from '../UI/TypingIndicator';
import MessageReactions from '../Messages/MessageReactions';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  userRole: 'owner' | 'admin' | 'member';
}

interface GroupMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
  reactions?: Array<{
    id: string;
    user_id: string;
    emoji: string;
    created_at: string;
  }>;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName, userRole }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Typing indicator
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(threadId || '');

  useEffect(() => {
    if (profile && groupId) {
      initializeGroupChat();
    }
  }, [profile, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeGroupChat = async () => {
    try {
      // Find or create group thread
      const { data: existingThread } = await supabase
        .from('threads')
        .select('id')
        .eq('is_group', true)
        .eq('created_by', groupId) // Using created_by to link to group
        .single();

      let currentThreadId = existingThread?.id;

      if (!currentThreadId) {
        // Create new group thread
        const { data: newThread, error: threadError } = await supabase
          .from('threads')
          .insert({
            name: groupName,
            is_group: true,
            created_by: groupId
          })
          .select()
          .single();

        if (threadError) {
          console.error('Error creating group thread:', threadError);
          toast.error('Failed to initialize group chat');
          return;
        }

        currentThreadId = newThread.id;

        // Add all group members as thread participants
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        if (groupMembers && groupMembers.length > 0) {
          const participants = groupMembers.map(member => ({
            thread_id: currentThreadId,
            user_id: member.user_id
          }));

          await supabase
            .from('thread_participants')
            .insert(participants);
        }
      }

      setThreadId(currentThreadId);
      loadMessages(currentThreadId);
      loadMembers();
    } catch (error) {
      console.error('Error initializing group chat:', error);
      toast.error('Failed to load group chat');
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey(display_name, avatar_url),
          message_reactions(id, user_id, emoji, created_at)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles!group_members_user_id_fkey(display_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error loading members:', error);
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !threadId || !messageText.trim()) return;

    setSendingMessage(true);
    stopTyping();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: profile.id,
          content: messageText.trim(),
          read_by: [profile.id]
        });

      if (error) {
        toast.error('Failed to send message');
        console.error('Error sending message:', error);
      } else {
        setMessageText('');
        loadMessages(threadId);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      default: return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-500';
      case 'admin': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-96 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{groupName}</h3>
            <p className="text-sm text-gray-600">{members.length} members</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Users className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length > 0 ? (
              <>
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === profile?.id;
                  const showAvatar = index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id;
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex space-x-2 max-w-xs ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {showAvatar && !isOwnMessage && (
                          <div className="flex-shrink-0">
                            {message.profiles.avatar_url ? (
                              <img
                                src={message.profiles.avatar_url}
                                alt={message.profiles.display_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-gray-600" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {showAvatar && !isOwnMessage && (
                            <span className="text-xs text-gray-500 mb-1">
                              {message.profiles.display_name}
                            </span>
                          )}
                          
                          <div className={`rounded-lg px-3 py-2 ${
                            isOwnMessage 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(message.created_at)}
                            </span>
                            
                            <MessageReactions
                              messageId={message.id}
                              reactions={message.reactions || []}
                              onUpdate={() => threadId && loadMessages(threadId)}
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
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to {groupName}!</h3>
                  <p className="text-gray-600">Start the conversation with your group members</p>
                </div>
              </div>
            )}
          </div>

          {/* Typing Indicator */}
          <div className="px-4">
            <TypingIndicator users={typingUsers} className="mb-2" />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={sendMessage} className="flex items-center space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onBlur={stopTyping}
                  placeholder={`Message ${groupName}...`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sendingMessage}
                />
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
        </div>

        {/* Members Sidebar */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 bg-gray-50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Members</h4>
                  <button
                    onClick={() => setShowMembers(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {members.map((member) => {
                    const RoleIcon = getRoleIcon(member.role);
                    const roleColor = getRoleColor(member.role);
                    
                    return (
                      <div key={member.id} className="flex items-center space-x-2">
                        <div className="relative">
                          {member.profiles.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt={member.profiles.display_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                          <OnlineIndicator 
                            status="offline" // Would need to implement presence for group members
                            size={6}
                            className="absolute -bottom-1 -right-1"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {member.profiles.display_name}
                            </p>
                            <RoleIcon className={`h-3 w-3 ${roleColor}`} />
                          </div>
                          <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GroupChat;