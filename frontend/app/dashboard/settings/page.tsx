'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useProfile, UserPreferencesUpdate } from '@/lib/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Moon,
  Sun,
  Monitor,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Clock,
  BookOpen,
  Zap,
  Shield,
  AlertCircle,
  Check
} from 'lucide-react';

function SettingsContent() {
  const { profileData, updatePreferences, freezeStreak, unfreezeStreak } = useProfile();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [vacationDays, setVacationDays] = useState(7);

  const preferences = profileData?.preferences;
  const streak = profileData?.streak;

  const handlePreferenceChange = async (updates: UserPreferencesUpdate) => {
    try {
      await updatePreferences(updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    handlePreferenceChange({ theme });
  };

  const handleNotificationToggle = (type: string, value: boolean) => {
    const currentEmailNotifications = preferences?.email_notifications || {};
    handlePreferenceChange({
      email_notifications: {
        ...currentEmailNotifications,
        [type]: value
      }
    });
  };

  const handleStudyPreference = (key: string, value: any) => {
    handlePreferenceChange({ [key]: value });
  };

  const handleFreezeStreak = async () => {
    try {
      await freezeStreak(vacationDays);
      setSaveStatus('Streak frozen successfully');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUnfreezeStreak = async () => {
    try {
      await unfreezeStreak();
      setSaveStatus('Streak unfrozen successfully');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'study', label: 'Study Preferences', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-semibold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            saveStatus === 'saved'
              ? 'bg-green-100 text-green-700'
              : saveStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {saveStatus === 'saved' ? (
            <Check className="w-4 h-4" />
          ) : saveStatus === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : null}
          {saveStatus === 'saved'
            ? 'Settings saved successfully'
            : saveStatus === 'error'
            ? 'Failed to save settings'
            : saveStatus}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData?.profile.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    Change Password
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Two-Factor Authentication
                  </label>
                  <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    Enable 2FA
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>
              <div className="space-y-4">
                <div>
                  <button className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50">
                    Export My Data
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Download all your data in JSON format
                  </p>
                </div>
                <div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Account
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Preferences Tab */}
        {activeTab === 'study' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Study Preferences</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Preferred Study Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['morning', 'afternoon', 'evening', 'night'].map((time) => (
                      <button
                        key={time}
                        onClick={() => handleStudyPreference('preferred_study_time', time)}
                        className={`px-3 py-2 rounded-md capitalize ${
                          preferences?.preferred_study_time === time
                            ? 'bg-purple-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Length
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((length) => (
                      <button
                        key={length}
                        onClick={() => handleStudyPreference('session_length_preference', length)}
                        className={`px-3 py-2 rounded-md ${
                          preferences?.session_length_preference === length
                            ? 'bg-purple-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {length} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Learning Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['visual', 'reading', 'practice', 'balanced'].map((style) => (
                      <button
                        key={style}
                        onClick={() => handleStudyPreference('learning_style', style)}
                        className={`px-3 py-2 rounded-md capitalize ${
                          preferences?.learning_style === style
                            ? 'bg-purple-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Zap className="w-4 h-4 inline mr-1" />
                    Difficulty Adaptation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['aggressive', 'balanced', 'gentle'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleStudyPreference('difficulty_adaptation', level)}
                        className={`px-3 py-2 rounded-md capitalize ${
                          preferences?.difficulty_adaptation === level
                            ? 'bg-purple-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Streak Settings</h3>
              <div className="space-y-4">
                {streak?.streak_frozen_until ? (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Streak frozen until{' '}
                      {new Date(streak.streak_frozen_until).toLocaleDateString()}
                    </p>
                    <button
                      onClick={handleUnfreezeStreak}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      Unfreeze Streak
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vacation Mode
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Freeze your streak when you can't study (max 30 days)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={vacationDays}
                        onChange={(e) => setVacationDays(Number(e.target.value))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <span className="text-sm text-gray-600">days</span>
                      <button
                        onClick={handleFreezeStreak}
                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                      >
                        Freeze Streak
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
              <div className="space-y-3">
                {[
                  { key: 'daily_reminder', label: 'Daily Study Reminder', icon: Clock },
                  { key: 'weekly_progress', label: 'Weekly Progress Report', icon: Mail },
                  {
                    key: 'achievement_unlocked',
                    label: 'Achievement Unlocked',
                    icon: Globe
                  },
                  { key: 'streak_reminder', label: 'Streak Reminders', icon: Bell },
                  { key: 'parent_reports', label: 'Parent Progress Reports', icon: Mail }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences?.email_notifications?.[item.key] || false}
                      onChange={(e) => handleNotificationToggle(item.key, e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
              <p className="text-sm text-gray-600 mb-4">
                Browser notifications for real-time updates
              </p>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Smartphone className="w-4 h-4 inline mr-2" />
                Enable Push Notifications
              </button>
            </div>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    preferences?.theme === 'light'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium">Light</p>
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    preferences?.theme === 'dark'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Moon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium">Dark</p>
                </button>
                <button
                  onClick={() => handleThemeChange('auto')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    preferences?.theme === 'auto'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                  <p className="text-sm font-medium">Auto</p>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Font Size</h3>
              <div className="grid grid-cols-3 gap-3">
                {['small', 'normal', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePreferenceChange({ font_size: size })}
                    className={`p-3 rounded-lg border-2 transition-colors capitalize ${
                      preferences?.font_size === size
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="text-sm font-medium">Reduce Animations</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimize motion for better focus
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences?.reduce_animations || false}
                  onChange={(e) =>
                    handlePreferenceChange({ reduce_animations: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Profile Visibility</h3>
              <div className="space-y-3">
                {[
                  {
                    value: 'private',
                    label: 'Private',
                    description: 'Only you can see your profile',
                    icon: Lock
                  },
                  {
                    value: 'friends',
                    label: 'Friends Only',
                    description: 'Only friends can see your profile',
                    icon: Eye
                  },
                  {
                    value: 'public',
                    label: 'Public',
                    description: 'Anyone can see your profile',
                    icon: Globe
                  }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      preferences?.profile_visibility === option.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={preferences?.profile_visibility === option.value}
                      onChange={() =>
                        handlePreferenceChange({ profile_visibility: option.value })
                      }
                      className="sr-only"
                    />
                    <option.icon className="w-5 h-5 text-gray-500 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="text-sm font-medium">Show on Leaderboard</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow your scores to appear on public leaderboards
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences?.show_on_leaderboard || false}
                  onChange={(e) =>
                    handlePreferenceChange({ show_on_leaderboard: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Data & Privacy</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Download My Data</span>
                    <span className="text-xs text-gray-500">JSON format</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Privacy Policy</span>
                    <span className="text-xs text-gray-500">External link</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Terms of Service</span>
                    <span className="text-xs text-gray-500">External link</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Button */}
      <div className="mt-6 text-center">
        <button
          onClick={signOut}
          className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}