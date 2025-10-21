'use client';

import { useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useProfile, UserProfileUpdate } from '@/lib/hooks/useProfile';
import {
  Camera,
  Edit2,
  Trophy,
  Flame,
  Clock,
  Target,
  Calendar,
  Award,
  TrendingUp,
  Save,
  X,
  Upload
} from 'lucide-react';

function ProfileContent() {
  const {
    profileData,
    isLoading,
    error,
    updateProfile,
    uploadProfilePhoto,
    deleteProfilePhoto
  } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfileUpdate>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const { profile, streak, stats, recent_achievements } = profileData;

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedProfile({});
      setIsEditing(false);
    } else {
      // Start editing
      setEditedProfile({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        bio: profile.bio ?? '',
        study_goal: profile.study_goal ?? '',
        grade_level: profile.grade_level ?? '',
        school_name: profile.school_name ?? '',
        phone_number: profile.phone_number ?? '',
        parent_email: profile.parent_email ?? ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Filter out empty strings to avoid validation errors
      const cleanedProfile = Object.fromEntries(
        Object.entries(editedProfile).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );
      
      await updateProfile(cleanedProfile);
      setIsEditing(false);
      setEditedProfile({});
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile. Please try again.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    try {
      setUploadingPhoto(true);
      await uploadProfilePhoto(file);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (confirm('Are you sure you want to delete your profile photo?')) {
      try {
        await deleteProfilePhoto();
      } catch (err) {
        console.error('Failed to delete photo:', err);
      }
    }
  };

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile.full_name) {
      const parts = profile.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return profile.full_name[0].toUpperCase();
    }
    return profile.email[0].toUpperCase();
  };

  const getDisplayName = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.full_name || profile.email.split('@')[0];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your personal information and achievements</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                {profile.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-white">
                    {getInitials()}
                  </span>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-500 text-white rounded-full p-2 hover:bg-purple-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploadingPhoto}
                  title="Upload photo"
                >
                  {uploadingPhoto ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="First name"
                      value={editedProfile.first_name ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, first_name: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={editedProfile.last_name ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, last_name: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <select
                    value={editedProfile.grade_level ?? ''}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, grade_level: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                    <option value="gap_year">Gap Year</option>
                    <option value="college">College</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="School name"
                    value={editedProfile.school_name ?? ''}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, school_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{getDisplayName()}</h2>
                  <p className="text-sm sm:text-base text-gray-600 truncate">{profile.email}</p>
                  {profile.grade_level && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Grade {profile.grade_level}
                      {profile.school_name && ` • ${profile.school_name}`}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Edit/Save Button */}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleEditToggle}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleEditToggle}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Bio and Study Goal */}
        {isEditing && (
          <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={editedProfile.bio ?? ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Study Goal</label>
              <textarea
                value={editedProfile.study_goal ?? ''}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, study_goal: e.target.value })
                }
                placeholder="What are your SAT goals?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              />
            </div>
          </div>
        )}

        {!isEditing && (profile.bio || profile.study_goal) && (
          <div className="mt-6 space-y-4">
            {profile.bio && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">About</h3>
                <p className="text-gray-600">{profile.bio}</p>
              </div>
            )}
            {profile.study_goal && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Study Goal</h3>
                <p className="text-gray-600">{profile.study_goal}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Streak Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{streak?.current_streak || 0}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Day Streak</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Best: {streak?.longest_streak || 0} days
          </div>
        </div>

        {/* Total Study Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total_study_hours.toFixed(1) || 0}</p>
              <p className="text-sm text-gray-500">Hours Studied</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {stats?.total_practice_sessions || 0} sessions
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.accuracy_percentage.toFixed(0) || 0}%</p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {stats?.total_correct_answers || 0}/{stats?.total_questions_answered || 0} correct
          </div>
        </div>

        {/* Days Until Test */}
        {stats?.days_until_test !== undefined && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.days_until_test}</p>
                <p className="text-sm text-gray-500">Days to Test</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">Stay focused!</div>
          </div>
        )}
      </div>

      {/* Progress Overview */}
      {stats && (stats.current_math_score || stats.current_rw_score) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Progress Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Math Progress */}
            {stats.current_math_score && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Math</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold">{stats.current_math_score}</p>
                    <p className="text-sm text-gray-500">Current</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.target_math_score}</p>
                    <p className="text-sm text-gray-500">Target</p>
                  </div>
                  {stats.improvement_math !== undefined && (
                    <div className="ml-auto">
                      <p
                        className={`text-lg font-semibold ${
                          (stats.improvement_math ?? 0) > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}
                      >
                        {(stats.improvement_math ?? 0) > 0 ? '+' : ''}
                        {stats.improvement_math}
                      </p>
                      <p className="text-sm text-gray-500">Improvement</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* R/W Progress */}
            {stats.current_rw_score && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reading & Writing</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold">{stats.current_rw_score}</p>
                    <p className="text-sm text-gray-500">Current</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.target_rw_score}</p>
                    <p className="text-sm text-gray-500">Target</p>
                  </div>
                  {stats.improvement_rw !== undefined && (
                    <div className="ml-auto">
                      <p
                        className={`text-lg font-semibold ${
                          (stats.improvement_rw ?? 0) > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}
                      >
                        {(stats.improvement_rw ?? 0) > 0 ? '+' : ''}
                        {stats.improvement_rw}
                      </p>
                      <p className="text-sm text-gray-500">Improvement</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {recent_achievements && recent_achievements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent Achievements
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent_achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <div className="text-2xl">{achievement.achievement_icon || '🏆'}</div>
                <div>
                  <p className="font-semibold text-sm">{achievement.achievement_name}</p>
                  {achievement.achievement_description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {achievement.achievement_description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}