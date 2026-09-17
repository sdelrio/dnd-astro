---
description: Process GitHub Issues labeled ready-for-agent sequentially with TDD implementation and code review.
---

# Process GitHub Issues

Process GitHub Issues labeled `ready-for-agent` strictly one at a time in dependency order based on blockers.

## Critical: Process Tickets Strictly Sequentially

Even if multiple tickets share the same dependency and could theoretically be parallelized, **always process them one at a time**. Tickets in the same feature area modify the same files and will cause merge conflicts if worked on concurrently. The dependency order determines the **sequence**, not parallelism.

1. Sort tickets by dependency order (no blockers first, then tickets blocked by the first group, etc.)
2. Process the first ticket fully (implement, PR, merge) before starting the next
3. After each merge, pull main before starting the next ticket

## Steps for Each Ticket

For each ticket, launch a subagent that will:

1. **Ensure on updated main branch** - Check current branch. If not on main, switch to main first, then pull latest.

2. **Create branch and commit** - Create a branch with a name referencing the GitHub issue, commit changes with good commit messages:
   - Short message follows conventional commits format
   - Long message provides detailed explanation

3. **Implement using TDD** - Use the `/tdd` skill for test-driven development implementation.

4. **Run code review** - After implementation, run `/code-review` to review changes. Fix issues if no human intervention is needed.

5. **Verify Astro build** - Make sure the Astro build passes successfully.

6. **Handle GitHub checks** - Wait for GitHub checks to succeed. Fix them if they fail. Merge automatically if no issues; request human input for complex cases.

7. **Add review summary** - Add a review summary to a new comment in the PR.

8. **Merge the PR** - Squash merge the PR before moving to the next ticket.

9. **Move to next ticket** - When current work is fully merged, pull main and start the next ticket.

## Summary

After processing all tickets, summarize progress including:
- Number of tickets processed
- Success/failure status for each
- Any issues that required human intervention
- Overall completion status