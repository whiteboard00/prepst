'use client';

import { useState, useRef } from 'react';
import { useProfile, UserProfileUpdate } from '@/lib/hooks/useProfile';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Edit2, Save, X } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const {
    profileData,
    isLoading,
    error,
    updateProfile,
    uploadProfilePhoto,
  } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfileUpdate>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedProfile({});
      setIsEditing(false);
    } else if (profileData?.profile) {
      // Start editing with current profile data
      setEditedProfile({
        first_name: profileData.profile.first_name ?? '',
        last_name: profileData.profile.last_name ?? '',
        bio: profileData.profile.bio ?? '',
        study_goal: profileData.profile.study_goal ?? '',
        grade_level: profileData.profile.grade_level ?? '',
        school_name: profileData.profile.school_name ?? '',
        phone_number: profileData.profile.phone_number ?? '',
        parent_email: profileData.profile.parent_email ?? ''
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

  const getInitials = () => {
    const profile = profileData?.profile;
    if (!profile) return 'U';
    
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
    return profile.email?.[0].toUpperCase() || 'U';
  };

  const getDisplayName = (currentUser: any) => {
    // Don't show anything until profile is loaded
    if (isLoading || !profileData) {
      return '';
    }
    
    const profile = profileData.profile;
    
    // First, try to combine first and last name
    if (profile.first_name || profile.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    }
    
    // Then try full_name if first/last aren't available
    if (profile.full_name) {
      return profile.full_name;
    }
    
    // Fall back to auth user metadata
    if (currentUser?.user_metadata?.full_name) {
      return currentUser.user_metadata.full_name;
    }
    
    // Only show email as last resort
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    
    return '';
  };

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

  const { profile } = profileData || {};
  if (!profile) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Profile Information</CardTitle>
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveProfile} disabled={uploadingPhoto}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditToggle} disabled={uploadingPhoto}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEditToggle}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="space-y-4 w-full md:w-1/3">
              <div className="space-y-2">
                <div className="relative">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                    {profile.profile_photo_url ? (
                      <img 
                        src={profile.profile_photo_url} 
                        alt="Profile" 
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials()
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold leading-tight tracking-tight">{getDisplayName(user)}</h2>
                  <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                  {(profile.grade_level || profile.school_name) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {profile.grade_level && (
                        <span>Grade {profile.grade_level}</span>
                      )}
                      {profile.school_name && (
                        <>
                          {profile.grade_level && <span>•</span>}
                          <span>{profile.school_name}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first-name"
                      value={editedProfile.first_name ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, first_name: e.target.value })
                      }
                      placeholder="First name"
                    />
                  ) : (
                    <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                      {profile.first_name || 'Not set'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last-name"
                      value={editedProfile.last_name ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, last_name: e.target.value })
                      }
                      placeholder="Last name"
                    />
                  ) : (
                    <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                      {profile.last_name || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade-level">Grade Level</Label>
                  {isEditing ? (
                    <select
                      id="grade-level"
                      value={editedProfile.grade_level ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, grade_level: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  ) : (
                    <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                      {profile.grade_level ? `Grade ${profile.grade_level}` : 'Not set'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  {isEditing ? (
                    <Input
                      id="school"
                      value={editedProfile.school_name ?? ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, school_name: e.target.value })
                      }
                      placeholder="School name"
                    />
                  ) : (
                    <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                      {profile.school_name || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    value={editedProfile.bio ?? ''}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, bio: e.target.value })
                    }
                    placeholder="Tell us about yourself..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                ) : (
                  <div className="text-sm py-2 px-3 border rounded-md bg-muted/50 min-h-[80px]">
                    {profile.bio || 'No bio provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
