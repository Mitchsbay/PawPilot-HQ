import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase, uploadFile } from '../lib/supabase';
import { 
  Users, Plus, Search, Settings, Crown, UserPlus, 
  MessageCircle, Calendar, Image, MoreHorizontal,
  Lock, Globe, Edit, Trash2, LogOut, Shield,
  X, Check, Camera, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import GroupChat from '../components/Groups/GroupChat';

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  is_private: boolean;
  created_by: string;
  members_count: number;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  user_role?: 'owner' | 'admin' | 'member';
  user_is_member?: boolean;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

const Groups: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-groups'>('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [leavingGroup, setLeavingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  // Create group form
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    is_private: false
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      loadGroups();
    }
  }, [profile]);

  const loadGroups = async () => {
    if (!profile) return;

    try {
      // Load all public groups and private groups user is member of
      const { data: allGroupsData, error: allGroupsError } = await supabase
        .from('groups')
        .select(`
          *,
          profiles!groups_created_by_fkey(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (allGroupsError) {
        console.error('Error loading groups:', allGroupsError);
        toast.error('Failed to load groups');
      } else {
        // Check membership status for each group
        const groupsWithMembership = await Promise.all(
          (allGroupsData || []).map(async (group) => {
            const { data: memberData } = await supabase
              .from('group_members')
              .select('role')
              .eq('group_id', group.id)
              .eq('user_id', profile.id)
              .single();

            return {
              ...group,
              creator_profile: group.profiles,
              user_role: memberData?.role,
              user_is_member: !!memberData
            };
          })
        );

        // Filter groups based on visibility and membership
        const visibleGroups = groupsWithMembership.filter(group => 
          !group.is_private || group.user_is_member
        );

        setGroups(visibleGroups);

        // Separate user's groups
        const userGroups = visibleGroups.filter(group => group.user_is_member);
        setMyGroups(userGroups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Avatar must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!groupData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSubmitting(true);

    try {
      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const filename = `group_${Date.now()}.${avatarFile.name.split('.').pop()}`;
        avatarUrl = await uploadFile('groupAvatars', filename, avatarFile);
        
        if (!avatarUrl) {
          toast.error('Failed to upload avatar');
          setSubmitting(false);
          return;
        }
      }

      // Create group
      const { data: groupData_result, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupData.name.trim(),
          description: groupData.description.trim() || null,
          avatar_url: avatarUrl,
          is_private: groupData.is_private,
          created_by: profile.id,
          members_count: 1
        })
        .select()
        .single();

      if (groupError) {
        toast.error('Failed to create group');
        console.error('Error creating group:', groupError);
        setSubmitting(false);
        return;
      }

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData_result.id,
          user_id: profile.id,
          role: 'owner'
        });

      if (memberError) {
        toast.error('Failed to add creator as member');
        console.error('Error adding member:', memberError);
        setSubmitting(false);
        return;
      }

      toast.success('Group created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setGroupData({
      name: '',
      description: '',
      is_private: false
    });
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleJoinGroup = async (group: Group) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: profile.id,
          role: 'member'
        });

      if (error) {
        toast.error('Failed to join group');
        console.error('Error joining group:', error);
      } else {
        // Update members count
        await supabase
          .from('groups')
          .update({ members_count: group.members_count + 1 })
          .eq('id', group.id);

        toast.success(`Joined ${group.name}!`);
        loadGroups();
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!profile || !leavingGroup) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', leavingGroup.id)
        .eq('user_id', profile.id);

      if (error) {
        toast.error('Failed to leave group');
        console.error('Error leaving group:', error);
      } else {
        // Update members count
        await supabase
          .from('groups')
          .update({ members_count: leavingGroup.members_count - 1 })
          .eq('id', leavingGroup.id);

        toast.success(`Left ${leavingGroup.name}`);
        loadGroups();
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    } finally {
      setLeavingGroup(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!profile || !deletingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', deletingGroup.id);

      if (error) {
        toast.error('Failed to delete group');
        console.error('Error deleting group:', error);
      } else {
        toast.success(`${deletingGroup.name} deleted successfully`);
        loadGroups();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    } finally {
      setDeletingGroup(null);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
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
        console.error('Error loading group members:', error);
      } else {
        setGroupMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const openGroupModal = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
    loadGroupMembers(group.id);
  };

  const filteredGroups = (activeTab === 'my-groups' ? myGroups : groups).filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600 mt-2">Connect with pet communities and like-minded owners</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-groups')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-groups'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups ({myGroups.length})
          </button>
        </div>

        <div className="mt-4 sm:mt-0 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search groups..."
            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Group Header */}
              <div className="relative h-32 bg-gradient-to-br from-blue-400 to-purple-500">
                {group.avatar_url ? (
                  <img
                    src={group.avatar_url}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-12 w-12 text-white/80" />
                  </div>
                )}
                
                {/* Privacy Badge */}
                <div className="absolute top-2 right-2">
                  {group.is_private ? (
                    <div className="bg-black/50 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                      <Lock className="h-3 w-3" />
                      <span>Private</span>
                    </div>
                  ) : (
                    <div className="bg-black/50 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>Public</span>
                    </div>
                  )}
                </div>

                {/* Group Actions */}
                {group.user_is_member && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Member
                    </div>
                  </div>
                )}
              </div>

              {/* Group Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{group.name}</h3>
                  {group.user_role === 'owner' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                {group.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{group.members_count} member{group.members_count !== 1 ? 's' : ''}</span>
                  </div>
                  <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {group.user_is_member ? (
                    <>
                      <button
                        onClick={() => openGroupModal(group)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Group
                      </button>
                      <Link
                        to={`/messages?group=${group.id}`}
                        className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-center"
                      >
                        Chat
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={() => handleJoinGroup(group)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Join Group
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {activeTab === 'my-groups' ? 'No groups joined yet' : 'No groups found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'my-groups' 
              ? 'Join groups to connect with other pet owners'
              : searchTerm 
                ? 'Try adjusting your search terms'
                : 'Be the first to create a group for your community'
            }
          </p>
          {activeTab === 'my-groups' && (
            <button
              onClick={() => setActiveTab('discover')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>Discover Groups</span>
            </button>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Create Group</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                  {/* Avatar Upload */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Group avatar"
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                        <Camera className="h-3 w-3" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Group photo (optional)</p>
                  </div>

                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={groupData.name}
                      onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter group name"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={groupData.description}
                      onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's this group about?"
                    />
                  </div>

                  {/* Privacy Setting */}
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={groupData.is_private}
                        onChange={(e) => setGroupData(prev => ({ ...prev, is_private: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Private Group</span>
                        <p className="text-sm text-gray-600">Only members can see posts and members</p>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Create Group</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Details Modal */}
      <AnimatePresence>
        {showGroupModal && selectedGroup && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGroupModal(false)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-blue-400 to-purple-500">
                  {selectedGroup.avatar_url ? (
                    <img
                      src={selectedGroup.avatar_url}
                      alt={selectedGroup.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="h-16 w-16 text-white/80" />
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Group Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
                      <p className="text-gray-600">{selectedGroup.members_count} members</p>
                    </div>
                    
                    {selectedGroup.user_role === 'owner' && (
                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingGroup(selectedGroup)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedGroup.description && (
                    <p className="text-gray-700 mb-6">{selectedGroup.description}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mb-6">
                    <button
                      onClick={() => {
                        // Toggle chat view in modal
                        setShowGroupModal(false);
                        // Would open dedicated chat view
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <MessageCircle className="h-4 w-4 inline mr-2" />
                      Open Chat
                    </button>
                    <Link
                      to={`/events?group=${selectedGroup.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
                    >
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Events
                    </Link>
                    {selectedGroup.user_role !== 'owner' && (
                      <button
                        onClick={() => setLeavingGroup(selectedGroup)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                      >
                        <LogOut className="h-4 w-4 inline mr-2" />
                        Leave
                      </button>
                    )}
                  </div>

                  {/* Members List */}
                  {/* Group Chat */}
                  <GroupChat
                    groupId={selectedGroup.id}
                    groupName={selectedGroup.name}
                    userRole={selectedGroup.user_role || 'member'}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Group Confirmation */}
      <ConfirmDialog
        isOpen={!!leavingGroup}
        onClose={() => setLeavingGroup(null)}
        onConfirm={handleLeaveGroup}
        title="Leave Group"
        message={`Are you sure you want to leave "${leavingGroup?.name}"? You'll need to be re-invited to join again.`}
        confirmText="Leave Group"
        type="warning"
      />

      {/* Delete Group Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message={`Are you sure you want to delete "${deletingGroup?.name}"? This action cannot be undone and will remove all group content and members.`}
        confirmText="Delete Group"
        type="danger"
      />
    </div>
  );
};

export default Groups;