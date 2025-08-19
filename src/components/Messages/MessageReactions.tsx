import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Smile, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  onUpdate: () => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onUpdate
}) => {
  const { profile } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉'];

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const handleReaction = async (emoji: string) => {
    if (!profile) return;

    try {
      const existingReaction = reactions.find(
        r => r.user_id === profile.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) {
          console.error('Error removing reaction:', error);
        }
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: profile.id,
            emoji
          });

        if (error) {
          console.error('Error adding reaction:', error);
        }
      }

      onUpdate();
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  return (
    <div className="relative">
      {/* Existing Reactions */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className="flex items-center space-x-1 mb-2">
          {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
            const userReacted = reactionList.some(r => r.user_id === profile?.id);
            
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                  userReacted 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{emoji}</span>
                <span>{reactionList.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Smile className="h-4 w-4" />
        </button>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10"
            >
              <div className="grid grid-cols-4 gap-1">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessageReactions;