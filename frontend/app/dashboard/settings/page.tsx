"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useProfile, UserPreferencesUpdate } from "@/lib/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
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
  Check,
  Settings as SettingsIcon,
  User,
  Palette,
  Trash2,
  Download,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

function SettingsContent() {
  const { profileData, updatePreferences, freezeStreak, unfreezeStreak } =
    useProfile();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [vacationDays, setVacationDays] = useState(7);

  const preferences = profileData?.preferences;
  const streak = profileData?.streak;

  const handlePreferenceChange = async (updates: UserPreferencesUpdate) => {
    try {
      await updatePreferences(updates);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleThemeChange = (theme: "light" | "dark" | "auto") => {
    handlePreferenceChange({ theme });
  };

  const handleNotificationToggle = (type: string, value: boolean) => {
    const currentEmailNotifications = preferences?.email_notifications || {};
    handlePreferenceChange({
      email_notifications: {
        ...currentEmailNotifications,
        [type]: value,
      },
    });
  };

  const handleStudyPreference = (key: string, value: any) => {
    handlePreferenceChange({ [key]: value });
  };

  const handleFreezeStreak = async () => {
    try {
      await freezeStreak(vacationDays);
      setSaveStatus("Streak frozen successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleUnfreezeStreak = async () => {
    try {
      await unfreezeStreak();
      setSaveStatus("Streak unfrozen successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const tabs = [
    { id: "account", label: "Account", icon: Lock },
    { id: "study", label: "Study Preferences", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "display", label: "Display", icon: Monitor },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Save Status */}
          {saveStatus && (
            <Alert
              className={`${
                saveStatus === "saved"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : saveStatus === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <Check className="h-4 w-4" />
              <AlertDescription>
                {saveStatus === "saved"
                  ? "Settings saved successfully"
                  : saveStatus === "error"
                  ? "Failed to save settings"
                  : saveStatus}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-5 bg-muted/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account information and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData?.profile.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Contact support to change your email address
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Button variant="outline" className="w-fit">
                        Change Password
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Two-Factor Authentication</Label>
                      <Button variant="outline" className="w-fit">
                        Enable 2FA
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-fit border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export My Data
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Download all your data in JSON format
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Button variant="destructive" className="w-fit">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Study Preferences Tab */}
            <TabsContent value="study" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Study Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your learning experience and study habits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Preferred Study Time
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["morning", "afternoon", "evening", "night"].map(
                          (time) => (
                            <Button
                              key={time}
                              variant={
                                preferences?.preferred_study_time === time
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleStudyPreference(
                                  "preferred_study_time",
                                  time
                                )
                              }
                              className={`capitalize ${
                                preferences?.preferred_study_time === time
                                  ? "bg-[#866ffe] hover:bg-[#7c3aed]"
                                  : ""
                              }`}
                            >
                              {time}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Session Length</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map((length) => (
                          <Button
                            key={length}
                            variant={
                              preferences?.session_length_preference === length
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              handleStudyPreference(
                                "session_length_preference",
                                length
                              )
                            }
                            className={`${
                              preferences?.session_length_preference === length
                                ? "bg-[#866ffe] hover:bg-[#7c3aed]"
                                : ""
                            }`}
                          >
                            {length} min
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Learning Style
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["visual", "reading", "practice", "balanced"].map(
                          (style) => (
                            <Button
                              key={style}
                              variant={
                                preferences?.learning_style === style
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleStudyPreference("learning_style", style)
                              }
                              className={`capitalize ${
                                preferences?.learning_style === style
                                  ? "bg-[#866ffe] hover:bg-[#7c3aed]"
                                  : ""
                              }`}
                            >
                              {style}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Difficulty Adaptation
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {["aggressive", "balanced", "gentle"].map((level) => (
                          <Button
                            key={level}
                            variant={
                              preferences?.difficulty_adaptation === level
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              handleStudyPreference(
                                "difficulty_adaptation",
                                level
                              )
                            }
                            className={`capitalize ${
                              preferences?.difficulty_adaptation === level
                                ? "bg-[#866ffe] hover:bg-[#7c3aed]"
                                : ""
                            }`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Streak Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your study streak and vacation mode
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {streak?.streak_frozen_until ? (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span>
                            Streak frozen until{" "}
                            {new Date(
                              streak.streak_frozen_until
                            ).toLocaleDateString()}
                          </span>
                          <Button
                            onClick={handleUnfreezeStreak}
                            size="sm"
                            className="ml-4"
                          >
                            Unfreeze Streak
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Vacation Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Freeze your streak when you can't study (max 30 days)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={vacationDays}
                          onChange={(e) =>
                            setVacationDays(Number(e.target.value))
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          days
                        </span>
                        <Button
                          onClick={handleFreezeStreak}
                          className="bg-[#866ffe] hover:bg-[#7c3aed]"
                        >
                          Freeze Streak
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose which email notifications you'd like to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      key: "daily_reminder",
                      label: "Daily Study Reminder",
                      icon: Clock,
                      description: "Get reminded to study daily",
                    },
                    {
                      key: "weekly_progress",
                      label: "Weekly Progress Report",
                      icon: Mail,
                      description: "Weekly summary of your progress",
                    },
                    {
                      key: "achievement_unlocked",
                      label: "Achievement Unlocked",
                      icon: Globe,
                      description: "Celebrate your achievements",
                    },
                    {
                      key: "streak_reminder",
                      label: "Streak Reminders",
                      icon: Bell,
                      description: "Keep your streak alive",
                    },
                    {
                      key: "parent_reports",
                      label: "Parent Progress Reports",
                      icon: Mail,
                      description: "Share progress with parents",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={
                          preferences?.email_notifications?.[item.key] || false
                        }
                        onCheckedChange={(checked) =>
                          handleNotificationToggle(item.key, checked)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Browser notifications for real-time updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-fit">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Enable Push Notifications
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Theme
                  </CardTitle>
                  <CardDescription>
                    Choose your preferred color scheme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={preferences?.theme || "auto"}
                    onValueChange={(value) =>
                      handleThemeChange(value as "light" | "dark" | "auto")
                    }
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="space-y-2">
                      <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Sun className="w-6 h-6 text-yellow-500" />
                        <span className="text-sm font-medium">Light</span>
                        <RadioGroupItem value="light" className="sr-only" />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Moon className="w-6 h-6 text-blue-500" />
                        <span className="text-sm font-medium">Dark</span>
                        <RadioGroupItem value="dark" className="sr-only" />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Monitor className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">Auto</span>
                        <RadioGroupItem value="auto" className="sr-only" />
                      </label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Font Size</CardTitle>
                  <CardDescription>
                    Adjust the text size for better readability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={preferences?.font_size || "normal"}
                    onValueChange={(value) =>
                      handlePreferenceChange({ font_size: value })
                    }
                    className="grid grid-cols-3 gap-4"
                  >
                    {["small", "normal", "large"].map((size) => (
                      <div key={size} className="space-y-2">
                        <label className="flex flex-col items-center space-y-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <span
                            className={`capitalize ${
                              size === "small"
                                ? "text-sm"
                                : size === "normal"
                                ? "text-base"
                                : "text-lg"
                            }`}
                          >
                            {size}
                          </span>
                          <RadioGroupItem value={size} className="sr-only" />
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>
                    Customize your experience for better accessibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="reduce-animations">
                        Reduce Animations
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Minimize motion for better focus
                      </p>
                    </div>
                    <Switch
                      id="reduce-animations"
                      checked={preferences?.reduce_animations || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange({ reduce_animations: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Profile Visibility
                  </CardTitle>
                  <CardDescription>
                    Control who can see your profile and progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={preferences?.profile_visibility || "private"}
                    onValueChange={(value) =>
                      handlePreferenceChange({ profile_visibility: value })
                    }
                    className="space-y-3"
                  >
                    {[
                      {
                        value: "private",
                        label: "Private",
                        description: "Only you can see your profile",
                        icon: Lock,
                      },
                      {
                        value: "friends",
                        label: "Friends Only",
                        description: "Only friends can see your profile",
                        icon: Eye,
                      },
                      {
                        value: "public",
                        label: "Public",
                        description: "Anyone can see your profile",
                        icon: Globe,
                      },
                    ].map((option) => (
                      <div key={option.value} className="space-y-2">
                        <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <option.icon className="w-5 h-5 text-muted-foreground mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">{option.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                          <RadioGroupItem value={option.value} />
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leaderboard Settings</CardTitle>
                  <CardDescription>
                    Control your visibility on public leaderboards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="leaderboard">Show on Leaderboard</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow your scores to appear on public leaderboards
                      </p>
                    </div>
                    <Switch
                      id="leaderboard"
                      checked={preferences?.show_on_leaderboard || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange({ show_on_leaderboard: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                  <CardDescription>
                    Manage your data and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-between">
                    <span>Download My Data</span>
                    <Badge variant="secondary">JSON format</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Privacy Policy</span>
                    <Badge variant="secondary">External link</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Terms of Service</span>
                    <Badge variant="secondary">External link</Badge>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Sign Out Button */}
          <Card className="border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
