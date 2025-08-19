import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { isEnabled } from '../../lib/flags';
import { telemetry } from '../../lib/telemetry';
import { 
  Trophy, Star, Award, Crown, Shield, Heart, 
  Camera, Users, Calendar, MapPin, Zap, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Achievement {
  key: string;
  title: string;
  description: string;
  points: number;
  achieved_at?: string;
  progress?: number;
  total?: number;
}

interface UserStats {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  achievementsUnlocked: number;
  totalAchievements: number;
}

const AchievementSystem: React.FC = () => {
  const { profile } = useAuth();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    level: 1,
    nextLevelPoints: 100,
    achievementsUnlocked: 0,
    totalAchievements: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState<Achievement | null>(null);

  useEffect(() => {
    if (profile) {
      checkFeatureFlag();
      loadAchievements();
    }
  }, [profile]);

  const checkFeatureFlag = async () => {
    if (!profile) return;
    
    const enabled = await isEnabled("gamification_v1", profile.id);
    setIsFeatureEnabled(enabled);
  };

  const loadAchievements = async () => {
    if (!profile) return;

    try {
      // Load all achievements with user progress
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });

      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', profile.id);

      if (allAchievements) {
        // Merge achievements with user progress
        const achievementsWithProgress = await Promise.all(
          allAchievements.map(async (achievement) => {
            const userAchievement = userAchievements?.find(ua => ua.key === achievement.key);
            const progress = await calculateProgress(achievement.key);
            
            return {
              ...achievement,
              achieved_at: userAchievement?.achieved_at,
              ...progress
            };
          })
        );

        setAchievements(achievementsWithProgress);

        // Calculate user stats
        const unlockedAchievements = userAchievements || [];
        const totalPoints = unlockedAchievements.reduce((sum, ua) => {
          const achievement = allAchievements.find(a => a.key === ua.key);
          return sum + (achievement?.points || 0);
        }, 0);

        const level = Math.floor(totalPoints / 100) + 1;
        const nextLevelPoints = level * 100;

        setUserStats({
          totalPoints,
          level,
          nextLevelPoints,
          achievementsUnlocked: unlockedAchievements.length,
          totalAchievements: allAchievements.length
        });
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async (achievementKey: string): Promise<{ progress?: number; total?: number }> => {
    if (!profile) return {};

    try {
      switch (achievementKey) {
        case 'first_pet':
          const { count: petCount } = await supabase
            .from('pets')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profile.id);
          return { progress: Math.min(petCount || 0, 1), total: 1 };

        case 'first_post':
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', profile.id);
          return { progress: Math.min(postCount || 0, 1), total: 1 };

        case 'health_tracker':
          const { count: healthCount } = await supabase
            .from('health_records')
            .select('*, pets!inner(owner_id)', { count: 'exact', head: true })
            .eq('pets.owner_id', profile.id);
          return { progress: Math.min(healthCount || 0, 5), total: 5 };

        case 'social_butterfly':
          const { count: followCount } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.id);
          return { progress: Math.min(followCount || 0, 10), total: 10 };

        case 'pet_photographer':
          const { data: posts } = await supabase
            .from('posts')
            .select('media_urls')
            .eq('author_id', profile.id)
            .not('media_urls', 'is', null);
          
          const photoCount = posts?.reduce((sum, post) => 
            sum + (post.media_urls?.length || 0), 0) || 0;
          return { progress: Math.min(photoCount, 25), total: 25 };

        default:
          return {};
      }
    } catch (error) {
      console.error('Error calculating progress for', achievementKey, error);
      return {};
    }
  };

  const checkAndUnlockAchievements = async () => {
    if (!profile) return;

    const unlockedAchievements: Achievement[] = [];

    for (const achievement of achievements) {
      if (achievement.achieved_at) continue; // Already unlocked

      const shouldUnlock = await shouldUnlockAchievement(achievement);
      if (shouldUnlock) {
        try {
          await supabase
            .from('user_achievements')
            .insert({
              user_id: profile.id,
              key: achievement.key
            });

          unlockedAchievements.push(achievement);
          
          await telemetry.gamification.achievementUnlocked({
            achievement_key: achievement.key,
            points: achievement.points
          });
        } catch (error) {
          console.error('Error unlocking achievement:', error);
        }
      }
    }

    if (unlockedAchievements.length > 0) {
      // Show celebration for first achievement
      setShowCelebration(unlockedAchievements[0]);
      setTimeout(() => setShowCelebration(null), 5000);
      
      // Reload to update UI
      loadAchievements();
    }
  };

  const shouldUnlockAchievement = async (achievement: Achievement): Promise<boolean> => {
    if (!achievement.progress || !achievement.total) return false;
    return achievement.progress >= achievement.total;
  };

  const getAchievementIcon = (key: string) => {
    switch (key) {
      case 'first_pet': return Heart;
      case 'first_post': return Camera;
      case 'health_tracker': return Shield;
      case 'social_butterfly': return Users;
      case 'pet_photographer': return Camera;
      case 'community_helper': return MapPin;
      case 'early_adopter': return Crown;
      default: return Trophy;
    }
  };

  const getAchievementColor = (key: string) => {
    switch (key) {
      case 'first_pet': return 'text-pink-600 bg-pink-100';
      case 'first_post': return 'text-blue-600 bg-blue-100';
      case 'health_tracker': return 'text-green-600 bg-green-100';
      case 'social_butterfly': return 'text-purple-600 bg-purple-100';
      case 'pet_photographer': return 'text-orange-600 bg-orange-100';
      case 'community_helper': return 'text-red-600 bg-red-100';
      case 'early_adopter': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 10) return Crown;
    if (level >= 5) return Award;
    return Star;
  };

  // Check for new achievements periodically
  useEffect(() => {
    if (isFeatureEnabled && achievements.length > 0) {
      checkAndUnlockAchievements();
    }
  }, [isFeatureEnabled, achievements.length]);

  if (!isFeatureEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const LevelIcon = getLevelIcon(userStats.level);
  const progressToNextLevel = ((userStats.totalPoints % 100) / 100) * 100;

  return (
    <div className="space-y-6">
      {/* User Level & Progress */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <LevelIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Level {userStats.level}</h2>
              <p className="text-blue-100">{userStats.totalPoints} total points</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-blue-100">Next Level</p>
            <p className="text-lg font-semibold">{userStats.nextLevelPoints - userStats.totalPoints} points</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-blue-100 mb-1">
            <span>Progress to Level {userStats.level + 1}</span>
            <span>{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-white h-2 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Achievements</h3>
          <span className="text-sm text-gray-600">
            {userStats.achievementsUnlocked} of {userStats.totalAchievements} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => {
            const AchievementIcon = getAchievementIcon(achievement.key);
            const colorClasses = getAchievementColor(achievement.key);
            const isUnlocked = !!achievement.achieved_at;
            const hasProgress = achievement.progress !== undefined && achievement.total !== undefined;
            
            return (
              <motion.div
                key={achievement.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isUnlocked 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    isUnlocked ? 'bg-green-100 text-green-600' : colorClasses
                  }`}>
                    {isUnlocked ? (
                      <Trophy className="h-5 w-5" />
                    ) : (
                      <AchievementIcon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-semibold ${
                        isUnlocked ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {achievement.title}
                      </h4>
                      <span className={`text-sm font-medium ${
                        isUnlocked ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {achievement.points} pts
                      </span>
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      isUnlocked ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {achievement.description}
                    </p>

                    {/* Progress Bar */}
                    {hasProgress && !isUnlocked && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{achievement.progress}/{achievement.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min((achievement.progress! / achievement.total!) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Achievement Date */}
                    {isUnlocked && achievement.achieved_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Unlocked {new Date(achievement.achieved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowCelebration(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
              className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center"
            >
              {/* Celebration Animation */}
              <div className="mb-6">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: 2
                  }}
                  className="inline-block p-4 bg-yellow-100 rounded-full"
                >
                  <Trophy className="h-12 w-12 text-yellow-600" />
                </motion.div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Achievement Unlocked! 🎉
              </h2>
              
              <h3 className="text-xl font-semibold text-yellow-600 mb-2">
                {showCelebration.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {showCelebration.description}
              </p>
              
              <div className="flex items-center justify-center space-x-2 text-lg font-bold text-yellow-600">
                <Star className="h-5 w-5" />
                <span>+{showCelebration.points} points</span>
              </div>

              <button
                onClick={() => setShowCelebration(null)}
                className="mt-6 bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementSystem;

// Helper function to trigger achievement checks
export async function checkAchievements(userId: string, eventType: string): Promise<void> {
  try {
    const enabled = await isEnabled("gamification_v1", userId);
    if (!enabled) return;

    // This would typically be called after user actions
    // For now, we'll just log the event
    await telemetry.gamification.achievementUnlocked({
      user_id: userId,
      trigger_event: eventType
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}