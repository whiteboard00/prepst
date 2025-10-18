import { PracticeSession, SessionTopic } from '@/lib/types';

/**
 * Generate a descriptive name for a practice session based on its topics
 */
export function generateSessionName(
  session: PracticeSession,
  sessionNumber?: number
): string {
  const topics = session.topics || [];
  const sessionNum = sessionNumber || session.session_number || 1;

  if (topics.length === 0) {
    return `Session ${sessionNum}`;
  }

  // Sort topics by number of questions (descending)
  const sortedTopics = [...topics].sort((a, b) => b.num_questions - a.num_questions);

  // Check if it's primarily Math or Reading/Writing
  const mathTopics = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];
  const rwTopics = ['Craft and Structure', 'Expression of Ideas', 'Standard English Conventions', 'Information and Ideas'];

  let mathQuestions = 0;
  let rwQuestions = 0;

  topics.forEach(topic => {
    const topicName = topic.topic_name;
    if (mathTopics.some(mt => topicName.includes(mt))) {
      mathQuestions += topic.num_questions;
    } else if (rwTopics.some(rt => topicName.includes(rt))) {
      rwQuestions += topic.num_questions;
    }
  });

  // Determine session type
  let prefix = '';
  if (mathQuestions > 0 && rwQuestions === 0) {
    prefix = 'Math: ';
  } else if (rwQuestions > 0 && mathQuestions === 0) {
    prefix = 'Reading & Writing: ';
  } else if (mathQuestions > 0 && rwQuestions > 0) {
    prefix = 'Mixed Practice: ';
  }

  // Get top 2 topics for the name
  const topTopics = sortedTopics
    .slice(0, 2)
    .map(t => {
      // Shorten topic names
      let name = t.topic_name;
      name = name.replace('Problem-Solving and Data Analysis', 'Problem Solving');
      name = name.replace('Geometry and Trigonometry', 'Geometry');
      name = name.replace('Standard English Conventions', 'Grammar');
      name = name.replace('Expression of Ideas', 'Writing');
      name = name.replace('Information and Ideas', 'Reading');
      name = name.replace('Craft and Structure', 'Structure');

      // Remove category prefix if it exists
      const colonIndex = name.indexOf(':');
      if (colonIndex !== -1) {
        name = name.substring(colonIndex + 1).trim();
      }

      return name;
    })
    .join(' & ');

  return prefix + topTopics;
}

/**
 * Estimate time to complete a session (in minutes)
 */
export function estimateSessionTime(session: PracticeSession): number {
  const totalQuestions = session.total_questions || 0;

  if (totalQuestions === 0) {
    // Fallback: count questions from topics
    const questionsFromTopics = session.topics?.reduce((sum, topic) => sum + topic.num_questions, 0) || 0;
    if (questionsFromTopics > 0) {
      return Math.round(questionsFromTopics * 2); // 2 minutes per question average
    }
    return 30; // Default estimate
  }

  // Estimate based on question types (we'll assume mixed for now)
  // Math questions: ~2.5 minutes
  // Reading/Writing questions: ~1.5 minutes
  // Average: 2 minutes per question
  return Math.round(totalQuestions * 2);
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `~${hours} hr`;
  }

  return `~${hours} hr ${remainingMinutes} min`;
}

/**
 * Determine session status based on dates and completion
 */
export type SessionStatus = 'completed' | 'in-progress' | 'upcoming' | 'overdue';

export function getSessionStatus(session: PracticeSession): SessionStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day

  const scheduledDate = new Date(session.scheduled_date);
  scheduledDate.setHours(0, 0, 0, 0);

  // Check if completed
  if (session.status === 'completed' || session.completed_at) {
    return 'completed';
  }

  // Check if in progress
  if (session.status === 'in_progress' ||
      (session.started_at && !session.completed_at) ||
      (session.completed_questions && session.completed_questions > 0 &&
       session.completed_questions < (session.total_questions || 0))) {
    return 'in-progress';
  }

  // Check if overdue
  if (scheduledDate < today) {
    return 'overdue';
  }

  // Otherwise it's upcoming
  return 'upcoming';
}

/**
 * Get color scheme based on session status
 */
export function getSessionColorScheme(status: SessionStatus) {
  switch (status) {
    case 'completed':
      return {
        bg: 'bg-green-100',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-500'
      };
    case 'in-progress':
      return {
        bg: 'bg-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-700',
        badge: 'bg-blue-500'
      };
    case 'overdue':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-500'
      };
    case 'upcoming':
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-500'
      };
  }
}

/**
 * Sort sessions by priority (overdue > today > in-progress > upcoming > completed)
 */
export function sortSessionsByPriority(sessions: PracticeSession[]): PracticeSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...sessions].sort((a, b) => {
    const statusA = getSessionStatus(a);
    const statusB = getSessionStatus(b);

    // Priority order
    const priorityMap: Record<SessionStatus, number> = {
      'overdue': 0,
      'in-progress': 1,
      'upcoming': 2,
      'completed': 3
    };

    const priorityDiff = priorityMap[statusA] - priorityMap[statusB];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Within same status, sort by date
    const dateA = new Date(a.scheduled_date).getTime();
    const dateB = new Date(b.scheduled_date).getTime();

    // For completed sessions, sort newest first
    if (statusA === 'completed') {
      return dateB - dateA;
    }

    // For others, sort oldest first
    return dateA - dateB;
  });
}