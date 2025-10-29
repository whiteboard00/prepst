"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { WrongAnswer } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function RevisionPage() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loadingWrongAnswers, setLoadingWrongAnswers] = useState(true);
  const [creatingSessionId, setCreatingSessionId] = useState<string | null>(
    null
  );

  // Safely strip HTML. If stem is null/undefined, show a fallback to avoid runtime errors
  const stripHtml = (
    html?: string | null,
    fallback: string = "Question text unavailable"
  ) => (typeof html === "string" ? html.replace(/<[^>]*>/g, "") : fallback);

  // Fetch wrong answers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingWrongAnswers(true);
        const wrongAnswersData = await api.getWrongAnswers(20);

        setWrongAnswers(wrongAnswersData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoadingWrongAnswers(false);
      }
    };

    fetchData();
  }, []);

  // Removed drill-related actions from revision page

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Revision Sessions
          </h1>
          <p className="text-gray-600 mt-2">
            Review and reinforce your knowledge with targeted practice
          </p>
        </div>
      </div>

      {/* All drill-related sections moved to Drill page */}

      {/* Wrong Answers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions You Got Wrong</CardTitle>
              <CardDescription>Simple list of question titles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWrongAnswers ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : wrongAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Wrong Answers Yet
              </h3>
              <p className="text-gray-500">
                Start practicing to see questions you need to review here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wrongAnswers.map((wrongAnswer) => (
                <button
                  key={wrongAnswer.session_question_id}
                  className="w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={creatingSessionId !== null}
                  onClick={async () => {
                    try {
                      setCreatingSessionId(wrongAnswer.session.id);
                      const res = await api.createRevisionSession(
                        wrongAnswer.session.id,
                        1
                      );
                      window.location.href = `/practice/${res.session_id}`;
                    } catch (e) {
                      console.error(e);
                      setCreatingSessionId(null);
                    }
                  }}
                >
                  {stripHtml(wrongAnswer.question?.stem)}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
