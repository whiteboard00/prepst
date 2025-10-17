<!-- ff28ee49-9568-434b-9c1b-7777542be564 99280db7-d2b0-4b4c-99ee-49d384e7c0fc -->
# Personal User Analytics Enhancement

## Current State

- `/dashboard/analytics` exists but shows basic growth curve list and heatmap
- `/dashboard/progress` shows static scores with placeholder chart
- Admin dashboard has comprehensive analytics but users can't access their personal versions

## Goal

Give regular users rich personal analytics across two pages:

1. **Analytics Page**: Detailed personal metrics (mastery, errors, efficiency)
2. **Progress Page**: Visual charts and growth tracking

---

## Phase 1: Enhance Analytics Page with Personal Metrics

### 1.1 Add New Analytics Cards to `/dashboard/analytics/page.tsx`

Add 6 new sections similar to admin dashboard but showing only user's own data:

**Cards to Add:**

- Error Patterns & Learning Blocks (personal version)
- Cognitive Efficiency (personal time-of-day patterns)
- Confidence Calibration (personal confidence accuracy)
- Recent Activity Timeline
- Weak Topics Alert
- Learning Velocity Summary

**Implementation:**

```typescript:frontend/app/dashboard/analytics/page.tsx
// After existing summary cards, add:

// Personal Error Patterns Card
const [errorStats, setErrorStats] = useState<PersonalErrorStats | null>(null);

// Load personal error patterns
const errorData = await api.getErrorPatternAnalytics();
// Filter to show only user's data (backend already filters)

// Display cards with expandable details
```

**Data Sources (use existing admin endpoints - they auto-filter for non-admin users):**

- `api.getErrorPatternAnalytics()` - already filters by user
- `api.getCognitiveEfficiencyAnalytics()` - already filters by user
- `api.getConfidenceTiming()` - personal confidence data

### 1.2 Add Expandable Detail Views

Create expandable sections showing:

- Error frequency by topic (personal)
- Cognitive blocks (personal skills stuck below 50% mastery)
- Time-of-day performance chart
- Confidence vs accuracy calibration table

---

## Phase 2: Add Visual Charts to Progress Page

### 2.1 Create Growth Curve Chart Component

**New File:** `frontend/components/charts/GrowthCurveChart.tsx`

Use Recharts to create line chart showing:

- SAT Math score over time
- SAT R/W score over time
- Total score trend

**Data Source:**

```typescript
const growthData = await api.getGrowthCurve(undefined, 30);
// Map to chart format with dates and scores
```

### 2.2 Create Mastery Progress Chart

**Add to Progress Page:**

- Bar chart showing mastery % by category
- Line chart showing average mastery over time

**Data Source:**

```typescript
const heatmap = await api.getSkillHeatmap();
// Aggregate by category for bar chart
```

### 2.3 Add Mock Exam Score Chart

**Replace placeholder in `/dashboard/progress/page.tsx`:**

```typescript
// Fetch mock exam history
const mockExams = await api.getMockExamAnalytics();
// Show line chart with exam scores over time
```

---

## Phase 3: Create Reusable Chart Components

### 3.1 LineChart Component

**File:** `frontend/components/charts/LineChart.tsx`

- Generic wrapper around Recharts LineChart
- Props: data, xKey, yKeys, colors, labels
- Used for: growth curves, time-of-day patterns

### 3.2 BarChart Component

**File:** `frontend/components/charts/BarChart.tsx`

- Generic wrapper around Recharts BarChart
- Props: data, xKey, yKey, color
- Used for: mastery by category, error counts

### 3.3 AreaChart Component

**File:** `frontend/components/charts/AreaChart.tsx`

- For showing score distributions
- Props: data, xKey, yKey, fillColor

---

## Phase 4: Add Personal Insights & Recommendations

### 4.1 Insights Section in Analytics Page

Based on user's data, show actionable insights:

- "Your best learning time is 2-4 PM (85% accuracy)"
- "You're overconfident on X topic - actual accuracy 60% vs confidence 80%"
- "Cognitive block detected on Algebra - stuck at 45% mastery for 7 days"
- "Great momentum on Reading Comprehension - 12% improvement this week"

**Logic:**

```typescript
// Analyze cognitive efficiency data
const bestHour = cognitiveEfficiency.time_of_day_patterns
  .sort((a, b) => b.efficiency_score - a.efficiency_score)[0];

// Analyze confidence calibration
const overconfidentTopics = confidenceData.filter(
  d => d.calibration_gap > 15
);

// Analyze plateaus
const plateauSkills = heatmap.skills.filter(s => s.plateau);
```

### 4.2 Weekly Progress Summary

Add summary showing:

- Questions answered this week
- Mastery gained this week
- Streak days
- Predicted score change

---

## Implementation Files

### New Files to Create:

1. `frontend/components/charts/LineChart.tsx`
2. `frontend/components/charts/BarChart.tsx`
3. `frontend/components/charts/AreaChart.tsx`

### Files to Modify:

1. `frontend/app/dashboard/analytics/page.tsx` - Add new analytics cards
2. `frontend/app/dashboard/progress/page.tsx` - Replace placeholder with real charts
3. `frontend/lib/types/index.ts` - Add PersonalInsights interface (if needed)

### Backend (No Changes Needed):

- All analytics endpoints already support user filtering
- Admin sees all data, regular users see only their own

---

## Visual Design

**Analytics Page Layout:**

```
[4 Summary Cards: Avg Mastery | Predicted Math | Predicted R/W | Efficiency]

[Insights Section: 3-4 actionable insights based on data]

[Error Patterns Card] [Cognitive Efficiency Card] [Confidence Card]

[Growth Curve Chart]

[Skill Heatmap with Plateau Warnings] (existing)
```

**Progress Page Layout:**

```
[3 Score Cards: Current | Target | Improvement] (existing)

[Mock Score Progress Chart - Line Chart]

[Mastery Progress Over Time - Area Chart]

[Category Mastery Breakdown - Bar Chart]
```

---

## Dependencies

Already installed:

- `recharts` - for charts
- All backend endpoints exist and auto-filter by user

---

## Testing

1. Login as regular user (non-admin)
2. Navigate to `/dashboard/analytics` - should see personal analytics
3. Navigate to `/dashboard/progress` - should see charts
4. Verify all data is personal (no other users' data visible)
5. Test expandable sections on analytics page
6. Test chart tooltips and interactions

### To-dos

- [ ] Add 6 new analytics cards to /dashboard/analytics/page.tsx with personal error patterns, cognitive efficiency, confidence calibration, activity timeline, weak topics, and velocity summary
- [ ] Create reusable LineChart component using Recharts
- [ ] Create reusable BarChart component using Recharts
- [ ] Create reusable AreaChart component using Recharts
- [ ] Add SAT score growth curve chart to progress page replacing placeholder
- [ ] Add mastery progress charts (by category and over time) to progress page
- [ ] Add actionable insights section to analytics page based on user's patterns