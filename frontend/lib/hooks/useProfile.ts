import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { components } from "@/lib/types/api.generated";

// Use generated types from OpenAPI
export type UserProfile = components["schemas"]["UserProfile"];
export type UserPreferences = components["schemas"]["UserPreferences"];
export type UserPreferencesUpdate =
  components["schemas"]["UserPreferencesUpdate"];
export type UserProfileUpdate = components["schemas"]["UserProfileUpdate"];
export type UserStreak = components["schemas"]["UserStreak"];
export type UserProfileStats = components["schemas"]["UserProfileStats"];
export type UserAchievement = components["schemas"]["UserAchievement"];
export type ProfileResponse = components["schemas"]["ProfileResponse"];

// Use ProfileResponse as ProfileData since it matches the API response
export type ProfileData = ProfileResponse;

export function useProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(() => {
    // Initialize with user data from auth if available
    if (!user) return null;

    const now = new Date().toISOString();
    const email = user.email || "";
    const fullName =
      user.user_metadata?.full_name || email.split("@")[0] || "User";

    const initialProfile: UserProfile = {
      id: user.id,
      email: email,
      name: user.user_metadata?.name || fullName,
      profile_photo_url: user.user_metadata?.avatar_url || null,
      created_at: now,
      updated_at: now,
      bio: null,
      study_goal: null,
      grade_level: null,
      school_name: null,
      phone_number: null,
      parent_email: null,
      timezone: "America/New_York",
      onboarding_completed: false,
      role: "user",
    } as any;

    const initialPreferences: UserPreferences = {
      id: "", // Will be set by the server
      user_id: user.id,
      theme: "light",
      font_size: "normal",
      reduce_animations: false,
      preferred_study_time: "evening",
      session_length_preference: 30,
      learning_style: "balanced",
      difficulty_adaptation: "balanced",
      email_notifications: {},
      push_notifications: {},
      profile_visibility: "private",
      show_on_leaderboard: false,
      created_at: now,
      updated_at: now,
    };

    return {
      profile: initialProfile,
      preferences: initialPreferences,
      streak: {
        id: "", // Will be set by the server
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
        last_study_date: now,
        streak_frozen_until: null,
        total_study_days: 0,
        created_at: now,
        updated_at: now,
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
        improvement_rw: 0,
      },
      recent_achievements: [],
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

      const response = await api.get("/api/profile");
      setProfileData(response);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: UserProfileUpdate) => {
    try {
      // Convert empty strings to null for optional fields
      const cleanedUpdates = {
        ...updates,
        timezone: updates.timezone || "America/New_York",
        phone_number: updates.phone_number?.trim() || null,
        parent_email: updates.parent_email?.trim() || null,
        bio: updates.bio?.trim() || null,
        study_goal: updates.study_goal?.trim() || null,
        grade_level: updates.grade_level?.trim() || null,
        school_name: updates.school_name?.trim() || null,
      };

      // Optimistically update the UI first
      setProfileData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            ...updates,
            timezone:
              updates.timezone || prev.profile.timezone || "America/New_York",
            ...((updates as any).name ? { name: (updates as any).name } : {}),
          },
        };
      });

      // Then send the update to the server
      const response = await api.patch("/api/profile", cleanedUpdates);

      return response;
    } catch (err: any) {
      console.error("Error updating profile:", err);
      throw err;
    }
  }, []);

  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate) => {
      try {
        const response = await api.patch("/api/preferences", updates);

        // Update local state
        if (profileData) {
          setProfileData({
            ...profileData,
            preferences: response,
          });
        }

        // Apply theme if changed
        if (
          updates.theme &&
          ["light", "dark", "auto"].includes(updates.theme)
        ) {
          applyTheme(updates.theme as "light" | "dark" | "auto");
        }

        return response;
      } catch (err: any) {
        console.error("Error updating preferences:", err);
        throw err;
      }
    },
    [profileData]
  );

  const uploadProfilePhoto = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Don't set Content-Type header - let browser set it with boundary
        const response = await api.post("/api/profile/photo", formData);

        // Update local state with new photo URL
        if (profileData) {
          setProfileData({
            ...profileData,
            profile: {
              ...profileData.profile,
              profile_photo_url: response.profile_photo_url,
            },
          });
        }

        return response.profile_photo_url;
      } catch (err: any) {
        console.error("Error uploading profile photo:", err);
        throw err;
      }
    },
    [profileData]
  );

  const deleteProfilePhoto = useCallback(async () => {
    try {
      await api.delete("/api/profile/photo");

      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          profile: {
            ...profileData.profile,
            profile_photo_url: undefined,
          },
        });
      }
    } catch (err: any) {
      console.error("Error deleting profile photo:", err);
      throw err;
    }
  }, [profileData]);

  const freezeStreak = useCallback(
    async (days: number) => {
      try {
        const response = await api.post("/api/streak/freeze", { days });

        // Refetch profile to get updated streak
        await fetchProfile();

        return response.data;
      } catch (err: any) {
        console.error("Error freezing streak:", err);
        throw err;
      }
    },
    [fetchProfile]
  );

  const unfreezeStreak = useCallback(async () => {
    try {
      const response = await api.post("/api/streak/unfreeze");

      // Refetch profile to get updated streak
      await fetchProfile();

      return response;
    } catch (err: any) {
      console.error("Error unfreezing streak:", err);
      throw err;
    }
  }, [fetchProfile]);

  const getDisplayName = useCallback(() => {
    if (!profileData) return "";
    const { profile } = profileData;

    // First, try the name field (new schema)
    if ((profile as any).name) {
      return (profile as any).name;
    }

    // Fall back to combining first_name and last_name (old schema)
    if ((profile as any).first_name || (profile as any).last_name) {
      return [(profile as any).first_name, (profile as any).last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    // Try full_name (old schema)
    if ((profile as any).full_name) {
      return (profile as any).full_name;
    }

    // Fall back to auth user metadata
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }

    // Only show email as last resort
    if (profile.email) {
      return profile.email.split("@")[0];
    }

    return "";
  }, [profileData, user]);

  const getInitials = useCallback(() => {
    const displayName = getDisplayName();
    if (!displayName) return "U";

    const parts = displayName.split(" ");
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
    getInitials,
  };
}

// Helper function to apply theme
function applyTheme(theme: "light" | "dark" | "auto") {
  if (theme === "auto") {
    // Use system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  } else {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }

  // Save to localStorage for persistence
  localStorage.setItem("theme", theme);
}
