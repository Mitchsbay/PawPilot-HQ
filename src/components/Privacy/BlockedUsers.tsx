import React from 'react';
import { UserX, User } from 'lucide-react';
import { useBlocking } from '../../hooks/useBlocking';
import { motion } from 'framer-motion';
import ConfirmDialog from '../UI/ConfirmDialog';

const BlockedUsers: React.FC = () => {
  const { blockedUsers, loading, unblockUser } = useBlocking();
  const [unblockingUser, setUnblockingUser] = React.useState<{ id: string; name: string } | null>(null);

  const handleUnblock = async () => {
    if (!unblockingUser) return;
    await unblockUser(unblockingUser.id);
    setUnblockingUser(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-4 bg-gray-100 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Blocked Users</h3>
        <p className="text-sm text-gray-600 mb-6">
          Blocked users cannot see your content, message you, or interact with your posts. 
          You can unblock them at any time.
        </p>
      </div>

      {blockedUsers.length > 0 ? (
        <div className="space-y-3">
          {blockedUsers.map((blockedUser, index) => (
            <motion.div
              key={blockedUser.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {blockedUser.profiles.avatar_url ? (
                  <img
                    src={blockedUser.profiles.avatar_url}
                    alt={blockedUser.profiles.display_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{blockedUser.profiles.display_name}</h4>
                  <p className="text-sm text-gray-500">
                    Blocked {new Date(blockedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setUnblockingUser({
                  id: blockedUser.blocked_user_id,
                  name: blockedUser.profiles.display_name
                })}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Unblock
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <UserX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No blocked users</h3>
          <p className="text-gray-600">
            Users you block will appear here. You can unblock them at any time.
          </p>
        </div>
      )}

      {/* Unblock Confirmation */}
      <ConfirmDialog
        isOpen={!!unblockingUser}
        onClose={() => setUnblockingUser(null)}
        onConfirm={handleUnblock}
        title="Unblock User"
        message={`Are you sure you want to unblock ${unblockingUser?.name}? They will be able to see your content and interact with you again.`}
        confirmText="Unblock User"
        type="info"
      />
    </div>
  );
};

export default BlockedUsers;