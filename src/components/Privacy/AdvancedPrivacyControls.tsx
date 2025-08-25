import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { firstRow } from '../../lib/firstRow';
import { firstRow } from '../../lib/firstRow';
import { Lock, Users, Globe, Search, X, Plus, Check, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface PrivacyRule {
  id: string;
  owner_id: string;
  scope: string;
  rule: string;
  created_at: string;
}

interface PrivacyRuleOverride {
  id: string;
  rule_id: string;
  target_user_id: string;
  allow: boolean;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface PrivacyScope {
  scope: string;
  label: string;
  description: string;
}

const AdvancedPrivacyControls: React.FC = () => {
  const { profile } = useAuth();
  const [privacyRules, setPrivacyRules] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, PrivacyRuleOverride[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>>([]);

  const privacyScopes: PrivacyScope[] = [
    {
      scope: 'profile',
      label: 'Profile Visibility',
      description: 'Who can see your profile information'
    },
    {
      scope: 'posts',
      label: 'Posts Visibility',
      description: 'Who can see your posts by default'
    },
    {
      scope: 'photos',
      label: 'Photos Visibility',
      description: 'Who can see your photo albums'
    },
    {
      scope: 'reels',
      label: 'Reels Visibility',
      description: 'Who can see your pet reels'
    },
    {
      scope: 'activity',
      label: 'Activity Visibility',
      description: 'Who can see your activity feed'
    }
  ];

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see' },
    { value: 'followers', label: 'Followers', icon: Users, description: 'Only your followers' },
    { value: 'friends', label: 'Friends', icon: Users, description: 'Mutual followers only' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you' },
    { value: 'custom', label: 'Custom', icon: Shield, description: 'Custom rules' }
  ];

  useEffect(() => {
    if (profile) {
      loadPrivacySettings();
      loadAvailableUsers();
    }
  }, [profile]);

  const loadPrivacySettings = async () => {
    if (!profile) return;

    try {
      // Load existing privacy rules
      const { data: rules, error: rulesError } = await supabase
        .from('privacy_rules')
        .select('*')
        .eq('owner_id', profile.id);

      if (rulesError) {
        console.error('Error loading privacy rules:', rulesError);
      } else {
        const rulesMap: Record<string, string> = {};
        (rules || []).forEach(rule => {
          rulesMap[rule.scope] = rule.rule;
        });
        
        // Set defaults for missing scopes
        privacyScopes.forEach(scope => {
          if (!rulesMap[scope.scope]) {
            rulesMap[scope.scope] = scope.scope === 'profile' ? 'public' : 'followers';
          }
        });
        
        setPrivacyRules(rulesMap);
      }

      // Load overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('privacy_rule_overrides')
        .select(`
          *,
          privacy_rules!inner(scope),
          profiles!privacy_rule_overrides_target_user_id_fkey(display_name, avatar_url)
        `)
        .eq('privacy_rules.owner_id', profile.id);

      if (overridesError) {
        console.error('Error loading privacy overrides:', overridesError);
      } else {
        const overridesMap: Record<string, PrivacyRuleOverride[]> = {};
        (overridesData || []).forEach(override => {
          const scope = (override as any).privacy_rules.scope;
          if (!overridesMap[scope]) {
            overridesMap[scope] = [];
          }
          overridesMap[scope].push(override);
        });
        setOverrides(overridesMap);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!profile) return;

    try {
      // Load followers and following for custom rules
      const { data: connections, error } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          profiles!user_follows_following_id_fkey(id, display_name, avatar_url)
        `)
        .eq('follower_id', profile.id);

      if (error) {
        console.error('Error loading available users:', error);
      } else {
        setAvailableUsers((connections || []).map(conn => (conn as any).profiles));
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const updatePrivacyRule = async (scope: string, rule: string) => {
    if (!profile) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('privacy_rules')
        .upsert({
          owner_id: profile.id,
          scope,
          rule
        });

      if (error) {
        toast.error('Failed to update privacy setting');
        console.error('Error updating privacy rule:', error);
      } else {
        setPrivacyRules(prev => ({ ...prev, [scope]: rule }));
        toast.success('Privacy setting updated');
      }
    } catch (error) {
      console.error('Error updating privacy rule:', error);
      toast.error('Failed to update privacy setting');
    } finally {
      setSaving(false);
    }
  };

  const addOverride = async (scope: string, userId: string, allow: boolean) => {
    if (!profile) return;

    try {
      // Get the privacy rule ID for this scope
      const { data: rule } = await supabase
        .from('privacy_rules')
        .select('id')
        .eq('owner_id', profile.id)
        .eq('scope', scope)
        .limit(1);

      const ruleRecord = firstRow(rule);
      if (!ruleRecord) {
        toast.error('Privacy rule not found');
        return;
      }

      const { error } = await supabase
        .from('privacy_rule_overrides')
        .upsert({
          rule_id: ruleRecord.id,
          target_user_id: userId,
          allow
        });

      if (error) {
        toast.error('Failed to add override');
        console.error('Error adding override:', error);
      } else {
        toast.success('Privacy override added');
        loadPrivacySettings();
      }
    } catch (error) {
      console.error('Error adding override:', error);
      toast.error('Failed to add override');
    }
  };

  const removeOverride = async (overrideId: string) => {
    try {
      const { error } = await supabase
        .from('privacy_rule_overrides')
        .delete()
        .eq('id', overrideId);

      if (error) {
        toast.error('Failed to remove override');
        console.error('Error removing override:', error);
      } else {
        toast.success('Privacy override removed');
        loadPrivacySettings();
      }
    } catch (error) {
      console.error('Error removing override:', error);
      toast.error('Failed to remove override');
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Privacy Controls</h3>
        <p className="text-sm text-gray-600 mb-6">
          Control who can see different types of your content. You can set general rules 
          and add specific exceptions for individual users.
        </p>
      </div>

      {privacyScopes.map((scopeConfig) => {
        const currentRule = privacyRules[scopeConfig.scope] || 'public';
        const scopeOverrides = overrides[scopeConfig.scope] || [];
        
        return (
          <div key={scopeConfig.scope} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">{scopeConfig.label}</h4>
                <p className="text-sm text-gray-600">{scopeConfig.description}</p>
              </div>
              
              <select
                value={currentRule}
                onChange={(e) => updatePrivacyRule(scopeConfig.scope, e.target.value)}
                disabled={saving}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {privacyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Overrides */}
            {currentRule === 'custom' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">Custom Rules</h5>
                  <button
                    onClick={() => setShowOverrideModal(scopeConfig.scope)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add Exception
                  </button>
                </div>

                {scopeOverrides.length > 0 ? (
                  <div className="space-y-2">
                    {scopeOverrides.map((override) => (
                      <div key={override.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center space-x-3">
                          {override.profiles?.avatar_url ? (
                            <img
                              src={override.profiles.avatar_url}
                              alt={override.profiles.display_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{override.profiles?.display_name}</p>
                            <p className="text-sm text-gray-600">
                              {override.allow ? 'Allowed' : 'Blocked'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeOverride(override.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No custom rules set</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Override Modal */}
      <AnimatePresence>
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOverrideModal(null)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add Privacy Exception
                  </h3>
                  
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{user.display_name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              addOverride(showOverrideModal!, user.id, true);
                              setShowOverrideModal(null);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Allow
                          </button>
                          <button
                            onClick={() => {
                              addOverride(showOverrideModal!, user.id, false);
                              setShowOverrideModal(null);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Block
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowOverrideModal(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedPrivacyControls;
