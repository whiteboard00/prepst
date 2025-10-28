"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Clock, Target, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { PracticeSession } from "@/lib/types";

interface CompletedSessionsCardProps {
  className?: string;
}

export function CompletedSessionsCard({
  className,
}: CompletedSessionsCardProps) {
  const router = useRouter();
  const [completedSessions, setCompletedSessions] = useState<PracticeSession[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [creatingRevision, setCreatingRevision] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletedSessions = async () => {
      try {
        setLoading(true);
        const sessions = await api.getCompletedSessions(10);
        setCompletedSessions(sessions);
      } catch (error) {
        console.error("Failed to fetch completed sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedSessions();
  }, []);

  const handleCreateRevision = async (sessionId: string) => {
    try {
      setCreatingRevision(sessionId);
      const result = await api.createRevisionSession(sessionId, 10);

      if (result.success) {
        // Navigate to the new revision session
        router.push(`/practice/${result.session_id}`);
      }
    } catch (error) {
      console.error("Failed to create revision session:", error);
      // You might want to show a toast notification here
    } finally {
      setCreatingRevision(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyBadgeVariant = (accuracy: number) => {
    if (accuracy >= 80) return "default";
    if (accuracy >= 60) return "secondary";
    return "destructive";
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Completed Study Sessions
          </CardTitle>
          <CardDescription>
            Generate revision sessions from your completed practice sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completedSessions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Completed Study Sessions
          </CardTitle>
          <CardDescription>
            Generate revision sessions from your completed practice sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Completed Sessions Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Complete some practice sessions to see them here and generate
              revision sessions.
            </p>
            <Button onClick={() => router.push("/dashboard/study-plan")}>
              Go to Study Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Completed Study Sessions
        </CardTitle>
        <CardDescription>
          Generate revision sessions from your completed practice sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {completedSessions.map((session) => {
            const accuracy =
              session.total_questions > 0
                ? Math.round(
                    (session.completed_questions / session.total_questions) *
                      100
                  )
                : 0;

            const topics = session.topics || [];
            const mathTopics = topics.filter(
              (t) => t.section === "math"
            ).length;
            const rwTopics = topics.filter(
              (t) => t.section === "reading_writing"
            ).length;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        Session {session.session_number}
                      </h4>
                      <Badge variant={getAccuracyBadgeVariant(accuracy)}>
                        {accuracy}% accuracy
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(
                          session.completed_at || session.created_at || ""
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {session.completed_questions}/{session.total_questions}{" "}
                        questions
                      </div>
                      {mathTopics > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {mathTopics} Math topics
                        </Badge>
                      )}
                      {rwTopics > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rwTopics} RW topics
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${getAccuracyColor(
                        accuracy
                      )}`}
                    >
                      {accuracy}%
                    </div>
                    <p className="text-sm text-gray-500">Accuracy</p>
                  </div>
                  <Button
                    onClick={() => handleCreateRevision(session.id)}
                    disabled={creatingRevision === session.id}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {creatingRevision === session.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Revise
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
