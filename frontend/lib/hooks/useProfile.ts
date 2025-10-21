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
      first_name: user.user_metadata?.first_name || fullName.split(' ')[0] || '',
      last_name: user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || '',
      profile_photo_url: user.user_metadata?.avatar_url || '',
      created_at: now,
      updated_at: now,
      bio: '',
      study_goal: '',
      grade_level: '',
      school_name: '',
      phone_number: '',
      parent_email: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_verified: false,
      last_active_at: now
    };
    
    return { 
      profile: initialProfile,
      preferences: {
        theme: 'light',
        notifications_enabled: true,
        email_notifications: true,
        updated_at: now
      },
      streak: {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: now,
        total_days: 0
      },
      stats: {
        total_study_time: 0,
        total_questions_answered: 0,
        correct_answers: 0,
        accuracy: 0,
        subjects_studied: 0
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
      const response = await api.patch('/api/profile', updates);

      // Update local state
      setProfileData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            ...updates,
            // Update full_name if first_name or last_name was updated
            ...(updates.first_name || updates.last_name ? {
              full_name: [updates.first_name || prev.profile.first_name, updates.last_name || prev.profile.last_name]
                .filter(Boolean)
                .join(' ')
            } : {})
          }
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
    unfreezeStreak
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