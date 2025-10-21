import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { components } from '@/lib/types/api.generated';

// Use generated types from OpenAPI
export type UserProfile = components['schemas']['UserProfile'];
export type UserPreferences = components['schemas']['UserPreferences'];
export type UserPreferencesUpdate = components['schemas']['UserPreferencesUpdate'];
export type UserProfileUpdate = components['schemas']['UserProfileUpdate'];
export type UserStreak = components['schemas']['UserStreak'];
export type UserProfileStats = components['schemas']['UserProfileStats'];
export type UserAchievement = components['schemas']['UserAchievement'];
export type ProfileResponse = components['schemas']['ProfileResponse'];

// Use ProfileResponse as ProfileData since it matches the API response
export type ProfileData = ProfileResponse;

export function useProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(() => {
    // Initialize with user data from auth if available
    if (!user) return null;
    
    const now = new Date().toISOString();
    const email = user.email || '';
    const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'User';
    
    const initialProfile: UserProfile = {
      id: user.id,
      email: email,
      full_name: fullName,
      first_name: user.user_metadata?.first_name || fullName.split(' ')[0] || null,
      last_name: user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || null,
      profile_photo_url: user.user_metadata?.avatar_url || null,
      created_at: now,
      updated_at: now,
      bio: null,
      study_goal: null,
      grade_level: null,
      school_name: null,
      phone_number: null,
      parent_email: null,
      timezone: 'America/New_York',
      onboarding_completed: false,
      role: 'user'
    };
    
    const initialPreferences: UserPreferences = {
      id: '', // Will be set by the server
      user_id: user.id,
      theme: 'light',
      font_size: 'normal',
      reduce_animations: false,
      preferred_study_time: 'evening',
      session_length_preference: 30,
      learning_style: 'balanced',
      difficulty_adaptation: 'balanced',
      email_notifications: {},
      push_notifications: {},
      profile_visibility: 'private',
      show_on_leaderboard: false,
      created_at: now,
      updated_at: now
    };
    
    return { 
      profile: initialProfile,
      preferences: initialPreferences,
      streak: {
        id: '', // Will be set by the server
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
        last_study_date: now,
        streak_frozen_until: null,
        total_study_days: 0,
        created_at: now,
        updated_at: now
      },
      stats: {
        total_practice_sessions: 0,
        total_questions_answered: 0,
        total_correct_answers: 0,
        accuracy_percentage: 0,
        total_study_hours: 0,
        average_session_duration: 0,
        total_subjects_studied: 0,
        total_quizzes_taken: 0,
        total_flashcards_studied: 0,
        total_notes_taken: 0,
        improvement_math: 0,
        improvement_ebrw: 0,
        improvement_rw: 0
      },
      recent_achievements: []
    };
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/api/profile');
      setProfileData(response);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: UserProfileUpdate) => {
    try {
      // Ensure timezone is a string before sending to API
      const updatesWithStringTimezone = {
        ...updates,
        timezone: updates.timezone || 'America/New_York'
      };

      const response = await api.patch('/api/profile', updatesWithStringTimezone);

      // Update local state
      setProfileData(prev => {
        if (!prev) return null;
        
        // Create updated profile with proper typing
        const updatedProfile = {
          ...prev.profile,
          ...updates,
          // Ensure timezone is always a string with fallback
          timezone: updates.timezone || prev.profile.timezone || 'America/New_York',
          // Update full_name if first_name or last_name was updated
          ...(updates.first_name || updates.last_name ? {
            full_name: [
              updates.first_name ?? prev.profile.first_name,
              updates.last_name ?? prev.profile.last_name
            ].filter(Boolean).join(' ')
          } : {})
        };

        return {
          ...prev,
          profile: updatedProfile
        };
      });

      return response;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw err;
    }
  }, []);

  const updatePreferences = useCallback(async (updates: UserPreferencesUpdate) => {
    try {
      const response = await api.patch('/api/preferences', updates);

      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          preferences: response
        });
      }

      // Apply theme if changed
      if (updates.theme && ['light', 'dark', 'auto'].includes(updates.theme)) {
        applyTheme(updates.theme as 'light' | 'dark' | 'auto');
      }

      return response;
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  }, [profileData]);

  const uploadProfilePhoto = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Don't set Content-Type header - let browser set it with boundary
      const response = await api.post('/api/profile/photo', formData);

      // Update local state with new photo URL
      if (profileData) {
        setProfileData({
          ...profileData,
          profile: {
            ...profileData.profile,
            profile_photo_url: response.profile_photo_url
          }
        });
      }

      return response.profile_photo_url;
    } catch (err: any) {
      console.error('Error uploading profile photo:', err);
      throw err;
    }
  }, [profileData]);

  const deleteProfilePhoto = useCallback(async () => {
    try {
      await api.delete('/api/profile/photo');

      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          profile: {
            ...profileData.profile,
            profile_photo_url: undefined
          }
        });
      }
    } catch (err: any) {
      console.error('Error deleting profile photo:', err);
      throw err;
    }
  }, [profileData]);

  const freezeStreak = useCallback(async (days: number) => {
    try {
      const response = await api.post('/api/streak/freeze', { days });

      // Refetch profile to get updated streak
      await fetchProfile();

      return response.data;
    } catch (err: any) {
      console.error('Error freezing streak:', err);
      throw err;
    }
  }, [fetchProfile]);

  const unfreezeStreak = useCallback(async () => {
    try {
      const response = await api.post('/api/streak/unfreeze');

      // Refetch profile to get updated streak
      await fetchProfile();

      return response;
    } catch (err: any) {
      console.error('Error unfreezing streak:', err);
      throw err;
    }
  }, [fetchProfile]);

  const getDisplayName = useCallback(() => {
    if (!profileData) return '';
    const { profile } = profileData;
    if (profile.first_name || profile.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    }
    if (profile.full_name) {
      return profile.full_name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    return '';
  }, [profileData, user]);

  const getInitials = useCallback(() => {
    const displayName = getDisplayName();
    if (!displayName) return 'U';

    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName[0].toUpperCase();
  }, [getDisplayName]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
    updatePreferences,
    uploadProfilePhoto,
    deleteProfilePhoto,
    freezeStreak,
    unfreezeStreak,
    getDisplayName,
    getInitials
  };
}

// Helper function to apply theme
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  // Save to localStorage for persistence
  localStorage.setItem('theme', theme);
}