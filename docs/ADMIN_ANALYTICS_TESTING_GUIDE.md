# Admin Analytics Dashboard - Testing Guide

## Quick Start

### 1. Set Up Admin User

First, you need to designate a user as an admin in the database:

```sql
-- Option 1: Update existing user
UPDATE users
SET role = 'admin'
WHERE email = 'your_email@example.com';

-- Option 2: Check current role
SELECT email, role FROM users;
```

### 2. Start Services

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Access Dashboard

1. Login with your admin user account
2. Navigate to: `http://localhost:3000/dashboard/admin/analytics`
3. You should see "Admin View - All Users Data" badge

## Testing Checklist

### ✅ Basic Functionality

- [ ] **Page Loads**

  - Dashboard displays without errors
  - Loading spinner shows initially
  - All 6 cards are visible

- [ ] **Admin Badge**

  - Shows "Admin View - All Users Data" for admin users
  - Does NOT show for regular users

- [ ] **Navigation Link**
  - "Admin Analytics" link visible in sidebar (Settings icon)
  - Only visible to admin users
  - Link navigates to correct page

### ✅ Data Display

- [ ] **Mastery Tracking Card**

  - Shows total records count
  - Shows average mastery percentage
  - Status is green (success) if data exists

- [ ] **Confidence & Timing Card**

  - Shows total answered questions
  - Shows average confidence (1-5 scale)
  - Shows average time spent
  - Status is green if data exists

- [ ] **Learning Events Card**

  - Shows total events count
  - Shows number of event types
  - Status is green if data exists

- [ ] **Performance Snapshots Card**

  - Shows total snapshots count
  - Status is green if data exists

- [ ] **User Progress Card**

  - Shows total users with data
  - Status is green if data exists

- [ ] **Question Difficulty Card**
  - Only visible to admin users
  - Shows total calibrated questions
  - Shows avg difficulty and discrimination

### ✅ Interactive Features

- [ ] **Refresh Button**

  - Located in top-right corner
  - Shows loading spinner when clicked
  - Updates "Last updated" timestamp
  - Reloads all data

- [ ] **View Details Buttons**

  - Each card has a "View Details" button
  - Clicking expands detailed view below
  - Clicking again collapses the view
  - Only one card can be expanded at a time

- [ ] **Expandable Sections**

  - **Mastery Details:**

    - Shows data table with pagination
    - Displays user IDs, skill IDs, mastery, attempts
    - Export button works

  - **Confidence Details:**

    - Shows statistics summary
    - Displays bar chart of confidence distribution
    - Chart is responsive and interactive

  - **Events Details:**

    - Shows event breakdown list
    - Displays bar chart of event types
    - Chart colors are green

  - **Snapshots Details:**

    - Shows data table with pagination
    - Displays predicted SAT scores
    - Export button works

  - **Progress Details:**

    - Shows data table with pagination
    - Displays skills tracked, mastery, accuracy
    - Export button works

  - **Difficulty Details:**
    - Shows data table with pagination
    - Displays IRT parameters
    - Export button works

### ✅ Table Features

- [ ] **Pagination**

  - Shows "Previous" and "Next" buttons
  - Shows current page number
  - Buttons disabled when appropriate
  - Shows entry count (e.g., "Showing 1 to 5 of 10 entries")

- [ ] **Export CSV**
  - Export button present on each table
  - Clicking downloads a CSV file
  - Filename includes timestamp
  - CSV contains all data (not just current page)
  - Opens correctly in spreadsheet apps

### ✅ Charts

- [ ] **Confidence Distribution Chart**

  - Bar chart shows confidence levels 1-5
  - Bars are blue (#3b82f6)
  - Hover shows tooltip with exact count
  - Chart is responsive

- [ ] **Event Types Chart**
  - Bar chart shows event types
  - Bars are green (#10b981)
  - Hover shows tooltip with exact count
  - Chart is responsive

### ✅ Role-Based Access

#### As Admin User:

- [ ] See all users' data (multiple user IDs in tables)
- [ ] See "Admin View" badge
- [ ] Access Question Difficulty section
- [ ] "Admin Analytics" link in sidebar

#### As Regular User:

- [ ] See only personal data (single user ID)
- [ ] No "Admin View" badge
- [ ] Question Difficulty may show "Admin access required"
- [ ] No "Admin Analytics" link in sidebar (or it shows personal data)

### ✅ Error Handling

- [ ] **No Data Scenarios**

  - Empty tables show "No data available"
  - Cards show "No data available" message
  - Status changes to warning (yellow)

- [ ] **API Errors**

  - Shows error message
  - Provides "Retry" button
  - Error message is user-friendly

- [ ] **Network Issues**
  - Handles offline gracefully
  - Shows appropriate error message

### ✅ Responsive Design

- [ ] **Desktop (> 1024px)**

  - All cards visible in grid
  - Tables display full width
  - Charts render correctly

- [ ] **Tablet (768px - 1024px)**

  - Cards stack in 2 columns
  - Tables are scrollable
  - Charts remain readable

- [ ] **Mobile (< 768px)**
  - Cards stack vertically
  - Tables scroll horizontally
  - Charts scale appropriately
  - Touch interactions work

## Test Data Generation

If you don't have enough data to test, generate some:

### 1. Complete Practice Sessions

```bash
# Login and complete a practice session
# Answer questions with different confidence levels
# Complete the session to trigger snapshot
```

### 2. Verify Data in Database

```sql
-- Check mastery records
SELECT COUNT(*) FROM user_skill_mastery;

-- Check confidence data
SELECT COUNT(*) FROM session_questions WHERE confidence_score IS NOT NULL;

-- Check learning events
SELECT COUNT(*), event_type FROM learning_events GROUP BY event_type;

-- Check snapshots
SELECT COUNT(*) FROM user_performance_snapshots;
```

### 3. Run Python Check Script

```bash
cd backend
python scripts/check_analytics.py
```

This should show if data is being collected properly.

## Common Issues & Solutions

### Issue: No Admin Badge Shows

**Solution:**

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then logout and login again.

### Issue: Tables Show No Data

**Solution:**

- Complete at least one practice session
- Answer questions with confidence ratings
- Complete the session to trigger snapshot
- Refresh the dashboard

### Issue: Charts Not Rendering

**Solution:**

- Check browser console for errors
- Verify recharts is installed: `npm list recharts`
- Clear browser cache
- Try different browser

### Issue: Export Not Working

**Solution:**

- Check browser download settings
- Allow popups for localhost
- Check browser console for errors

### Issue: Refresh Button Does Nothing

**Solution:**

- Check browser console for API errors
- Verify backend is running
- Check network tab for failed requests

## Performance Testing

### Load Test

- [ ] Dashboard loads in < 3 seconds
- [ ] Refresh completes in < 2 seconds
- [ ] Charts render smoothly
- [ ] Tables paginate without lag
- [ ] Export completes in < 1 second

### Data Scale Test

- [ ] Works with 0 records (shows empty states)
- [ ] Works with 10 records
- [ ] Works with 100 records
- [ ] Works with 1000+ records (pagination helps)

## Browser Compatibility

Test in:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Mac/iOS)
- [ ] Mobile browsers

## Acceptance Criteria

### Must Have ✅

- [x] All 6 sections display correctly
- [x] Data loads from backend
- [x] Role-based access works
- [x] Tables have pagination
- [x] Export to CSV works
- [x] Refresh button works
- [x] Charts render properly
- [x] Navigation link appears for admins

### Nice to Have

- [ ] Smooth animations
- [ ] Keyboard shortcuts
- [ ] Dark mode support
- [ ] Print-friendly layout
- [ ] Auto-refresh option

## Final Verification

Run through this complete scenario:

1. **Setup**

   - Set user as admin in database
   - Login to application
   - Navigate to dashboard

2. **Initial Load**

   - See admin badge
   - See all 6 cards
   - Data loads correctly

3. **Interaction**

   - Click "View Details" on each card
   - Verify tables display
   - Navigate pagination
   - Export each table to CSV
   - View charts

4. **Refresh**

   - Click refresh button
   - Verify data reloads
   - Timestamp updates

5. **Role Change**
   - Remove admin role
   - Logout and login
   - Verify limited access

✅ **If all steps pass, the dashboard is ready for production!**

## Reporting Issues

When reporting issues, include:

1. Browser and version
2. User role (admin/regular)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Network tab errors (if any)

## Next Steps After Testing

1. ✅ Test with real user data
2. ✅ Gather user feedback
3. ✅ Monitor performance metrics
4. ✅ Add more visualizations
5. ✅ Implement auto-refresh
6. ✅ Add data filters
7. ✅ Create user documentation
