"use client";

import { useState, useRef, useEffect } from "react";
import { useProfile, UserProfileUpdate } from "@/lib/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Edit2, Save, X, Target } from "lucide-react";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
  GRADE_LEVELS,
} from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useAuth();
  const {
    profileData,
    isLoading,
    error,
    updateProfile,
    uploadProfilePhoto,
    getDisplayName,
    getInitials,
  } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfileUpdate>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    if (isEditing) {
      setErrorMessage(null);
      setFieldErrors({});
    }
  }, [isEditing]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedProfile({});
      setIsEditing(false);
    } else if (profileData?.profile) {
      // Start editing with current profile data
      setEditedProfile({
        name: (profileData.profile as any).name ?? "",
        bio: profileData.profile.bio ?? "",
        study_goal: profileData.profile.study_goal ?? "",
        grade_level: profileData.profile.grade_level ?? "",
        school_name: profileData.profile.school_name ?? "",
        phone_number: profileData.profile.phone_number ?? "",
        parent_email: profileData.profile.parent_email ?? "",
      } as any);
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setFieldErrors({});

    try {
      await toast.promise(updateProfile(editedProfile), {
        loading: "Saving profile...",
        success: () => {
          setIsEditing(false);
          setEditedProfile({});
          return "Profile updated successfully!";
        },
        error: (err) => {
          // Parse field-specific errors from the API response
          if (err.message && err.message.includes("phone_number")) {
            setFieldErrors({ phone_number: "Invalid phone number length" });
          } else if (err.message && err.message.includes("parent_email")) {
            setFieldErrors({ parent_email: "Invalid email address" });
          }
          return "Failed to update profile. Please check the errors below.";
        },
      });
    } catch (err: any) {
      // Handle parsing errors for field validation
      if (err.message) {
        try {
          const errorData = JSON.parse(err.message);
          if (Array.isArray(errorData)) {
            const errors: Record<string, string> = {};
            errorData.forEach((error: any) => {
              if (error.loc && error.loc.length > 1) {
                const fieldName = error.loc[error.loc.length - 1];
                errors[fieldName] = error.msg;
              }
            });
            setFieldErrors(errors);
          }
        } catch {
          // If parsing fails, use generic error
          console.error("Failed to parse error:", err);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File size must be less than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    try {
      setUploadingPhoto(true);
      setErrorMessage(null);
      await uploadProfilePhoto(file);
    } catch (err) {
      console.error("Failed to upload photo:", err);
      setErrorMessage("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
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
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information
            </p>
          </div>

          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {errorMessage}</span>
              <span
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setErrorMessage(null)}
              >
                <X className="h-6 w-6 text-red-500" />
              </span>
            </div>
          )}

          <Card>
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Profile Information</CardTitle>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={uploadingPhoto || isSaving}
                    >
                      {isSaving ? (
                        <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      disabled={uploadingPhoto}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                  >
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
                      <h2 className="text-xl font-bold leading-tight tracking-tight">
                        {getDisplayName()}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.email}
                      </p>
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
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={(editedProfile as any).name ?? ""}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            name: e.target.value,
                          } as any)
                        }
                        placeholder="Your full name"
                      />
                    ) : (
                      <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                        {(profile as any).name || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade-level">Grade Level</Label>
                      {isEditing ? (
                        <select
                          id="grade-level"
                          value={editedProfile.grade_level ?? ""}
                          onChange={(e) =>
                            setEditedProfile({
                              ...editedProfile,
                              grade_level: e.target.value,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select grade</option>
                          {GRADE_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                          {profile.grade_level
                            ? `Grade ${profile.grade_level}`
                            : "Not set"}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school">School</Label>
                      {isEditing ? (
                        <Input
                          id="school"
                          value={editedProfile.school_name ?? ""}
                          onChange={(e) =>
                            setEditedProfile({
                              ...editedProfile,
                              school_name: e.target.value,
                            })
                          }
                          placeholder="School name"
                        />
                      ) : (
                        <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                          {profile.school_name || "Not set"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="study_goal">Study Goal</Label>
                    {isEditing ? (
                      <textarea
                        id="study_goal"
                        value={editedProfile.study_goal ?? ""}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            study_goal: e.target.value,
                          })
                        }
                        placeholder="What are your study goals?"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={3}
                      />
                    ) : (
                      <div className="text-sm py-2 px-3 border rounded-md bg-muted/50 min-h-[80px]">
                        {profile.study_goal || "No study goal set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    {isEditing ? (
                      <textarea
                        id="bio"
                        value={editedProfile.bio ?? ""}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            bio: e.target.value,
                          })
                        }
                        placeholder="Tell us about yourself..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={3}
                      />
                    ) : (
                      <div className="text-sm py-2 px-3 border rounded-md bg-muted/50 min-h-[80px]">
                        {profile.bio || "No bio provided"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      {isEditing ? (
                        <>
                          <Input
                            id="phone_number"
                            type="tel"
                            value={editedProfile.phone_number ?? ""}
                            onChange={(e) =>
                              setEditedProfile({
                                ...editedProfile,
                                phone_number: e.target.value,
                              })
                            }
                            placeholder="(123) 456-7890"
                            className={
                              fieldErrors.phone_number ? "border-red-500" : ""
                            }
                          />
                          {fieldErrors.phone_number && (
                            <p className="text-red-500 text-xs italic">
                              {fieldErrors.phone_number}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                          {profile.phone_number || "Not provided"}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_email">
                        Parent/Guardian Email
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            id="parent_email"
                            type="email"
                            value={editedProfile.parent_email ?? ""}
                            onChange={(e) =>
                              setEditedProfile({
                                ...editedProfile,
                                parent_email: e.target.value,
                              })
                            }
                            placeholder="parent@example.com"
                            className={
                              fieldErrors.parent_email ? "border-red-500" : ""
                            }
                          />
                          {fieldErrors.parent_email && (
                            <p className="text-red-500 text-xs italic">
                              {fieldErrors.parent_email}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                          {profile.parent_email || "Not provided"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Take a Diagnostic Test
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Assess your current mastery levels and identify knowledge
                    gaps to get a more personalized study plan.
                  </p>
                  <Button
                    onClick={() => router.push("/diagnostic-test")}
                    className="bg-black hover:bg-gray-800"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Start Diagnostic Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Math Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Math</h3>
                  <span className="text-sm text-muted-foreground">
                    {profileData?.stats?.improvement_math
                      ? `+${profileData.stats.improvement_math}%`
                      : "No data"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {profileData?.stats?.current_math_score || 0}
                  </div>
                  <div className="text-muted-foreground">Current</div>
                  <div className="mx-2">→</div>
                  <div className="text-2xl font-bold text-primary">
                    {profileData?.stats?.target_math_score || 800}
                  </div>
                  <div className="text-muted-foreground">Target</div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((profileData?.stats?.current_math_score || 0) /
                          (profileData?.stats?.target_math_score || 800)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Reading & Writing Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Reading & Writing</h3>
                  <span className="text-sm text-muted-foreground">
                    {profileData?.stats?.improvement_rw
                      ? `+${profileData.stats.improvement_rw}%`
                      : "No data"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {profileData?.stats?.current_rw_score || 0}
                  </div>
                  <div className="text-muted-foreground">Current</div>
                  <div className="mx-2">→</div>
                  <div className="text-2xl font-bold text-primary">
                    {profileData?.stats?.target_rw_score || 800}
                  </div>
                  <div className="text-muted-foreground">Target</div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((profileData?.stats?.current_rw_score || 0) /
                          (profileData?.stats?.target_rw_score || 800)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {/* Streak */}
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {profileData?.streak?.current_streak || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Day Streak
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Best: {profileData?.streak?.longest_streak || 0} days
                  </div>
                </div>

                {/* Hours Studied */}
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {profileData?.stats?.total_study_hours
                      ? profileData.stats.total_study_hours.toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Hours Studied
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profileData?.stats?.total_practice_sessions || 0} sessions
                  </div>
                </div>

                {/* Accuracy */}
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {profileData?.stats?.accuracy_percentage || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                  <div className="text-xs text-muted-foreground">
                    {profileData?.stats?.total_correct_answers || 0}/
                    {profileData?.stats?.total_questions_answered || 0} correct
                  </div>
                </div>

                {/* Days to Test */}
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {profileData?.stats?.days_until_test || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Days to Test
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
