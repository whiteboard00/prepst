"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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

// --- Schema ---
const studyPlanSchema = z.object({
  pastScoreEBRW: z.coerce
    .number()
    .min(200, "Score must be at least 200")
    .max(800, "Score cannot exceed 800"),
  pastScoreMath: z.coerce
    .number()
    .min(200, "Score must be at least 200")
    .max(800, "Score cannot exceed 800"),
  targetScore: z.coerce
    .number()
    .min(400, "Target score must be at least 400")
    .max(1600, "Target score cannot exceed 1600"),
  testDate: z
    .date()
    .min(new Date(), { message: "Test date must be in the future." }),
});

type StudyPlanFormData = z.infer<typeof studyPlanSchema>;

// --- The Form Component ---
export function StudyPlanForm() {
  const form = useForm({
    resolver: zodResolver(studyPlanSchema),
    defaultValues: {
      pastScoreEBRW: 600,
      pastScoreMath: 650,
      targetScore: 1400,
      testDate: new Date(),
    },
  });

  function onSubmit(data: StudyPlanFormData) {
    console.log("Form Submitted! Data:", data);
    alert(
      `Plan created! Target: ${data.targetScore}, Test Date: ${format(
        data.testDate,
        "PPP"
      )}`
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Study Plan</CardTitle>
        <CardDescription>
          Tell us your goals, and we'll generate a personalized plan for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <fieldset className="grid grid-cols-1 gap-6 p-4 border rounded-md">
              <legend className="px-2 text-lg font-medium">
                Past Score Report
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pastScoreEBRW"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evidence-Based Reading & Writing</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 650"
                          {...field}
                          value={field.value?.toString() || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pastScoreMath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Math</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 700"
                          {...field}
                          value={field.value?.toString() || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>
                Enter your most recent scores. If you don't have them, provide
                your best estimate.
              </FormDescription>
            </fieldset>

            <FormField
              control={form.control}
              name="targetScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Score</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 1500"
                      {...field}
                      value={field.value?.toString() || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    What's the total score you're aiming for?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Generate My Plan
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
