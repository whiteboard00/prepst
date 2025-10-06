"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- API & Storage ---
import { userAPI } from "@/lib/api";
import { saveUserToStorage } from "@/lib/storage";
import type { CreateUserRequest } from "@/lib/types";

// --- Schema (Updated for Math/English separately) ---
const studyPlanSchema = z.object({
  pastScoreMath: z.coerce
    .number()
    .min(200, "Math score must be at least 200")
    .max(800, "Math score cannot exceed 800"),
  pastScoreEnglish: z.coerce
    .number()
    .min(200, "English score must be at least 200")
    .max(800, "English score cannot exceed 800"),
  targetScoreMath: z.coerce
    .number()
    .min(200, "Target Math score must be at least 200")
    .max(800, "Target Math score cannot exceed 800"),
  targetScoreEnglish: z.coerce
    .number()
    .min(200, "Target English score must be at least 200")
    .max(800, "Target English score cannot exceed 800"),
  testDate: z
    .date()
    .min(new Date(), { message: "Test date must be in the future." }),
  hoursPerDay: z.coerce
    .number()
    .min(0.25, "Study time must be at least 15 minutes (0.25 hours)")
    .max(8, "Study time cannot exceed 8 hours per day"),
});

type StudyPlanFormData = z.infer<typeof studyPlanSchema>;

// --- Helper: Calculate Recommended Study Hours ---
function calculateRecommendedHours(
  pastMath: number,
  pastEnglish: number,
  targetMath: number,
  targetEnglish: number,
  testDate: Date
): number {
  const today = new Date();
  const daysRemaining = differenceInDays(testDate, today);

  if (daysRemaining <= 0) return 2; // Default if date is today or past

  // Calculate total point gap
  const mathGap = Math.max(0, targetMath - pastMath);
  const englishGap = Math.max(0, targetEnglish - pastEnglish);
  const totalGap = mathGap + englishGap;

  if (totalGap === 0) return 0.5; // Already at target

  // Rough estimate: 10 SAT points improvement ≈ 1 hour of focused study per day
  // Spread over the days remaining
  const pointsPerDay = totalGap / daysRemaining;
  const hoursNeeded = pointsPerDay / 10;

  // Clamp between 0.5 and 4 hours
  return Math.max(0.5, Math.min(4, Math.round(hoursNeeded * 4) / 4)); // Round to nearest 0.25
}

// --- The Form Component ---
export function StudyPlanForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(studyPlanSchema),
    defaultValues: {
      pastScoreMath: 650,
      pastScoreEnglish: 600,
      targetScoreMath: 750,
      targetScoreEnglish: 700,
      testDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      hoursPerDay: 1.5,
    },
  });

  // Watch form values for real-time recommendation
  const formValues = form.watch();

  // Calculate recommended hours dynamically
  const recommendedHours = calculateRecommendedHours(
    typeof formValues.pastScoreMath === "number"
      ? formValues.pastScoreMath
      : 650,
    typeof formValues.pastScoreEnglish === "number"
      ? formValues.pastScoreEnglish
      : 600,
    typeof formValues.targetScoreMath === "number"
      ? formValues.targetScoreMath
      : 750,
    typeof formValues.targetScoreEnglish === "number"
      ? formValues.targetScoreEnglish
      : 700,
    formValues.testDate instanceof Date
      ? formValues.testDate
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );

  async function onSubmit(data: StudyPlanFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate a unique user ID
      const userId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Prepare API request
      const createUserRequest: CreateUserRequest = {
        user_id: userId,
        past_math_score: data.pastScoreMath,
        past_english_score: data.pastScoreEnglish,
        target_math_score: data.targetScoreMath,
        target_english_score: data.targetScoreEnglish,
        test_date: data.testDate.toISOString(),
      };

      // Call API to create user profile
      const userProfile = await userAPI.createUser(createUserRequest);

      // Save user ID to localStorage
      saveUserToStorage(userProfile.user_id);

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to create user profile:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create your profile. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Study Plan</CardTitle>
        <CardDescription>
          Tell us your current scores and goals. We'll use AI to create a
          personalized adaptive learning plan for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Error Message */}
            {error && (
              <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Past Scores */}
            <fieldset className="grid grid-cols-1 gap-6 p-4 border rounded-md">
              <legend className="px-2 text-lg font-medium">
                Past Score Report
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pastScoreMath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Math</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 650"
                          {...field}
                          value={field.value?.toString() || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pastScoreEnglish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English (Reading & Writing)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 600"
                          {...field}
                          value={field.value?.toString() || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>
                Enter your most recent SAT scores (200-800 each). If you haven't
                taken the SAT yet, provide your best estimate.
              </FormDescription>
            </fieldset>

            {/* Target Scores */}
            <fieldset className="grid grid-cols-1 gap-6 p-4 border rounded-md">
              <legend className="px-2 text-lg font-medium">
                Target Scores
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetScoreMath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Math Goal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 750"
                          {...field}
                          value={field.value?.toString() || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetScoreEnglish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English Goal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 700"
                          {...field}
                          value={field.value?.toString() || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>
                What scores are you aiming for? (200-800 each)
              </FormDescription>
            </fieldset>

            {/* Test Date */}
            <FormField
              control={form.control}
              name="testDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Intended Test Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When do you plan to take the SAT?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Study Hours Per Day */}
            <FormField
              control={form.control}
              name="hoursPerDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study Hours Per Day</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., 1.5"
                        {...field}
                        value={field.value?.toString() || ""}
                        disabled={isSubmitting}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <div className="space-y-2">
                    <FormDescription>
                      How many hours can you commit to studying each day?
                    </FormDescription>
                    <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-2 rounded-md inline-block">
                      💡 AI Recommendation: {recommendedHours}{" "}
                      {recommendedHours === 1 ? "hour" : "hours"} per day
                      {formValues.testDate instanceof Date && (
                        <span className="text-muted-foreground ml-1">
                          ({differenceInDays(formValues.testDate, new Date())}{" "}
                          days until test)
                        </span>
                      )}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Your Plan...
                </>
              ) : (
                "Generate My Adaptive Learning Plan"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
