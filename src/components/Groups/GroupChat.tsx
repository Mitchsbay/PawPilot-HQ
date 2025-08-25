import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Send, Users, X } from 'lucide-react';
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

const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const { data, error } = await supabase.rpc('chat_init_group', { p_group_id: groupId });
      if (error) {
        console.error('Error creating/fetching group thread:', error);
        toast.error('Failed to initialize group chat');
        return;
      }
      const tId = data?.[0]?.thread_id;
      if (!tId) throw new Error('No thread_id from chat_init_group');

      setThreadId(tId);
      loadMessages(tId);
      loadMembers();
    } catch (error) {
      console.error('Error initializing group chat:', error);
      toast.error('Failed to load group chat');
      setLoading(false);
    }
  };

  const loadMessages = async (tId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id,thread_id,sender_id,content,created_at')
        .eq('thread_id', tId)
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

  // --- UI unchanged except reactions may need simpler data mapping ---

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-96 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
      {/* header */}
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
        {/* messages area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length > 0 ? (
              <>
                {messages.map((m) => {
                  const isOwn = m.sender_id === profile?.id;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`rounded-lg px-3 py-2 ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          <p className="text-sm">{m.content}</p>
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

          {/* typing indicator */}
          <div className="px-4">
            <TypingIndicator users={typingUsers} className="mb-2" />
          </div>

          {/* input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={sendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onBlur={stopTyping}
                placeholder={`Message ${groupName}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* members sidebar */}
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
                  <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.profiles.display_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
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
