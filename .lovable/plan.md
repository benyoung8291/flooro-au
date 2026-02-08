

# Fix Sign-Up Flow and Add Domain-Based Organization Matching

## Bug 1: Stuck on Onboarding Screen After Org Creation

### Root Cause

After creating an organization, the Onboarding page calls `navigate('/dashboard')`. The Dashboard then checks `profile.organization_id` -- but the profile query cache was only **invalidated**, not updated. During the refetch window, Dashboard reads the stale cached profile (with `organization_id: null`) and redirects right back to `/onboarding`. This creates an infinite loop.

### Fix

Three changes to break the race condition:

**A. Optimistic cache update in Onboarding.tsx**

After `createOrg.mutateAsync()` returns the new org, immediately update the profile cache using `queryClient.setQueryData` so Dashboard never sees stale data:

```text
const org = await createOrg.mutateAsync(orgName.trim());
queryClient.setQueryData(['profile', user.id], (old) => ({
  ...old,
  organization_id: org.id
}));
navigate('/dashboard');
```

**B. Guard in Onboarding.tsx**

Add a `useEffect` that redirects to `/dashboard` if the profile already has an `organization_id`. This catches cases where a user lands on `/onboarding` but their profile was already updated (e.g., by a page refresh after creation, or by the org member linking trigger):

```text
useEffect(() => {
  if (profile && profile.organization_id) {
    navigate('/dashboard', { replace: true });
  }
}, [profile, navigate]);
```

**C. Await profile refetch in Dashboard redirect**

Change Dashboard's redirect logic to only redirect when the profile query is **not refetching**. This prevents the redirect from firing on stale data during a refetch:

```text
const { data: profile, isLoading, isRefetching } = useUserProfile();

useEffect(() => {
  if (!isLoading && !isRefetching && profile && !profile.organization_id) {
    navigate('/onboarding');
  }
}, [profile, isLoading, isRefetching, navigate]);
```

---

## Bug 2: Domain-Based Organization Matching

When a new user signs up with a custom domain email (e.g., `jack@acmeflooring.com`), the system should check if any existing organizations already have members with the same email domain and offer to request access rather than creating a duplicate.

### Database Changes

**A. New `access_requests` table**

Stores pending requests from users wanting to join an existing organization:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | The requesting user |
| organization_id | uuid | The org they want to join |
| email | text | User's email |
| full_name | text | User's name |
| status | text | 'pending', 'approved', 'denied' |
| reviewed_by | uuid | Admin who reviewed (nullable) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users can view/create their own requests. Org admins can view and update requests for their org.

**B. New database function `check_domain_organizations`**

A SECURITY DEFINER function that:
1. Takes the current user's email from `auth.uid()`
2. Extracts the domain portion
3. Checks against a hardcoded list of common free email domains (gmail.com, hotmail.com, outlook.com, yahoo.com, bigpond.com, icloud.com, etc.)
4. If it's a custom domain, queries `profiles` for other users with matching email domain who have an `organization_id` set
5. Returns the matching organization names and IDs (only the org name is shown to the user)

**C. New database function `approve_access_request`**

A SECURITY DEFINER function that:
1. Takes a request ID
2. Verifies the calling user is an admin of the target org
3. Updates the request status to 'approved'
4. Sets the requesting user's `profile.organization_id` to the org
5. Creates an `organization_members` record
6. Assigns a 'user' role

### Onboarding Page Redesign

The Onboarding page becomes a multi-step flow:

**Step 1: Domain Check (automatic)**
- When the page loads, call `check_domain_organizations` 
- If no matching orgs found, skip straight to Step 2a
- If matching orgs found, show Step 2b

**Step 2a: Create Organization (current behavior, fixed)**
- Same form as today, with the cache fix applied
- Shows when no domain match exists OR user explicitly chooses "Create new"

**Step 2b: Join Existing Organization**
- Shows a card: "We found an organization using your email domain"
- Displays the org name(s) found
- Two buttons:
  - **"Request Access"** -- creates an access_request record, shows a confirmation message ("Your request has been sent to the organization admin. You'll be notified when approved.")
  - **"Create a New Organization Instead"** -- link/button that goes to Step 2a, with a note: "This will create a separate organization account"

**Step 3: Pending State**
- If the user has a pending access request, show a waiting screen: "Your access request is pending approval. The organization admin has been notified."
- Include a "Create my own organization instead" fallback link

### Admin Notification

**Settings > Team tab update:**
- Add a "Pending Requests" section at the top of the team members list
- Shows access request cards with the requester's name, email, and a timestamp
- "Approve" and "Deny" buttons on each request
- Approve calls `approve_access_request` RPC

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | `access_requests` table, `check_domain_organizations` function, `approve_access_request` function |
| `src/hooks/useAccessRequests.ts` | Hook for creating/fetching access requests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useUserProfile.ts` | Export `queryClient` usage, update `useUserProfile` to expose `isRefetching` |
| `src/pages/Onboarding.tsx` | Complete rewrite: multi-step flow with domain check, request access, create org |
| `src/pages/Dashboard.tsx` | Fix redirect to wait for refetch completion |
| `src/components/team/MembersList.tsx` | Add pending access requests section |

## Implementation Order

1. Create database migration (access_requests table + RPC functions)
2. Fix Bug 1: Update Onboarding.tsx with optimistic cache update and guard redirect
3. Fix Bug 1: Update Dashboard.tsx redirect to check `isRefetching`
4. Create `useAccessRequests.ts` hook
5. Redesign Onboarding.tsx with domain check and multi-step flow
6. Update MembersList.tsx with pending requests section for admins
