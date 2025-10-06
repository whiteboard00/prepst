buyan's hard written docs:
last updated:
10/05/2025

## technical depth:

1.  architecture philosophy:
    <br>
    client-side state + api calls (user_id in localStorage)
    currently only have component-level state
2.  data flow pattern
    User fills form
    <br>↓<br>
    Validate with Zod schema (client-side)
    <br>↓<br>
    POST /api/v1/users (server-side validation)
    <br>↓<br>
    Backend: Initialize 30 topic masteries (EMA algorithm)
    <br>↓<br>
    Response: UserProfile with all masteries
    <br>↓<br>
    Frontend: Save user_id to localStorage
    <br>↓<br>
    Navigate to /dashboard
    <br>↓<br>
    Dashboard: Fetch user_id from localStorage
    <br>↓<br>
    Parallel API calls:
    <br><br>
    GET /api/v1/users/{id}/progress<br>
    <br>POST /api/v1/recommendations/next
    <br>↓<br>
    Render dashboard with data
    <br><br>

- study session flow ????
  POST /api/v1/sessions <br>
  Body: `{user_id, topic, num_questions: 10}`
  <br>
  Backend: query question bank, return `{ session_id, questions: [...ids] }`
  <br>↓<br>
  Frontend: navigate to /study/[session_id]
  `GET /api/v1/questions/{questions[0]}`
  <br>↓<br>
  Display question + answer choices
  <br>↓<br>
  User selects answer
  <br>↓<br>
  Show confidence picker (4 emojis)
  <br>↓<br>
  User picks confidence
  <br>↓<br>
  `POST /api/v1/sessions/{session_id}/answers`
  <br>
  `Body: {` <br>
  `question_id, topic, is_correct, `
  <br>
  `difficulty, time_taken, expected_time,` <br>
  `confidence, user_id `
  <br>
  }
  <br>↓<br>
  Backend: <br>
  1. calculate scoring engine:
  2. update mastery via EMA
  3. return question performance with breakdown
     <br>↓<br>
     Frontend: <br>
  - show feedback
  - explanation
  - performance score
  - "next question" button
    <br>↓<br>
    load next question...

## decisions, why?:

<br>
confidence answer after selection <br><br>
immediate feedback - is most effective

## error handling

Layer 1: Network (API client)

```
async function fetchAPI<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error; // Re-throw for layer 2
  }
}
```

Layer 2: Component (catch and display)

```
async function loadData() {
  try {
    const data = await userAPI.getUserProgress(userId);
    setProgress(data);
  } catch (error) {
    setError(error.message); // Show to user
  }
}
```

Layer 3: UI (user-friendly message)

```
{error && (
  <Alert variant="destructive">
    <AlertTitle>Couldn't load your progress</AlertTitle>
    <AlertDescription>
      {error}
      <Button onClick={loadData}>Try Again</Button>
    </AlertDescription>
  </Alert>
)}
```
