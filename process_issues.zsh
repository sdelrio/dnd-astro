#!/bin/zsh

# GitHub Issues Processing Script with Dry-Run Mode
# Usage: ./process_issues.zsh [--dry-run]
# 
# Without --dry-run: Performs actual operations (creates branches, PRs, commits, etc.)
# With --dry-run: Only displays what would happen without making any changes

# Parse arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "=== DRY-RUN MODE ENABLED ==="
    echo "No actual changes will be made to branches, PRs, or issues."
    echo ""
fi

# Ensure the working directory is clean and ready
echo "Starting GitHub Issues processing..."

# Loop through issues labeled `ready-for-agent`
function process_issues() {
    local next_issue

    while : ; do
        # Fetch the next ticket labeled `ready-for-agent`
        next_issue=$(gh issue list --label "ready-for-agent" --json number --jq ".[] | .number" | head -n 1)

        if [[ -z "$next_issue" ]]; then
            echo "No more issues to process. Exiting..."
            break
        fi

        echo ""
        echo "=== Processing issue #$next_issue ==="

        # Display what would happen in dry-run mode
        if [[ "$DRY_RUN" == true ]]; then
            echo "[DRY-RUN] Would fetch details for issue #$next_issue"
            echo "[DRY-RUN] Would clear/reset context for new ticket"
            echo "[DRY-RUN] Would create/checkout branch: issue-$next_issue"
            echo "[DRY-RUN] Would run /tdd implementation for issue #$next_issue"
            echo "[DRY-RUN] Would run /code-review after implementation"
            echo "[DRY-RUN] Would post code review results as PR comment"
            echo "[DRY-RUN] Would check PR status and potentially merge"
            echo "[DRY-RUN] Would clear context after ticket completion"
            echo ""
            # Skip actual processing and continue to next issue
            continue
        fi

        # --- Real Mode Operations ---

        # 1. Fetch issue details
        echo "Fetching issue #$next_issue details..."
        gh issue view "$next_issue" --json title,body,labels --jq ".title" || {
            echo "Failed to retrieve issue details for #$next_issue"
            break
        }

        # 2. Branch creation/check
        branch_name="issue-$next_issue"
        echo "Checking branch: $branch_name..."
        if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
            echo "Branch $branch_name already exists. Switching to it..."
            git checkout "$branch_name"
        else
            echo "Creating new branch $branch_name..."
            git checkout -b "$branch_name"
        fi

        # 3. Start TDD implementation
        echo "Starting implementation using TDD for issue #$next_issue..."
        opencode tdd --ticket "$next_issue"

        # 4. Commit changes
        echo "Committing changes for ticket #$next_issue..."
        git add .
        git commit -m "Implement fixes for issue #$next_issue" -m "This commit addresses the tasks and requirements specified in issue #$next_issue."

        # 5. PR creation
        echo "Creating a Pull Request for branch: $branch_name..."
        # Push branch to remote
        echo "Pushing branch $branch_name to remote..."
        git push -u origin "$branch_name"

        # Create a pull request (PR)
        pr_url=$(gh pr create --title "Fixes issue #$next_issue" --body "This PR resolves issue #$next_issue and includes the necessary fixes and improvements.")
        echo "Pull Request created: $pr_url"

        # 6. Code review
        echo "Running code review for changes..."
        review_output=$(opencode code-review)
        echo "$review_output"

        # 7. Post code review summary to PR
        pr_url=$(gh pr view --json url --jq ".url")
        if [[ -n "$pr_url" ]]; then
            echo "Posting code review summary to PR: $pr_url"
            gh pr comment "$pr_url" --body "$review_output"
        else
            echo "No associated PR found, skipping comment."
        fi

        # 8. Handle code review fixes if needed
        if echo "$review_output" | grep -q "fixes needed"; then
            echo "Applying fixes suggested by code review..."
            opencode tdd --fix || {
                echo "Automatic fixes failed. Please review manually."
                break
            }

            echo "Adding new commit for fixes..."
            git add . && git commit -m "Fixes from code review for issue #$next_issue"
        fi

        # 9. Verify PR checks and merge
        echo "Verifying PR checks for issue #$next_issue..."
        echo "Fetching PR details for branch: $branch_name..."
        pr_url=$(gh pr view --json url --jq ".url")
        if [[ -z "$pr_url" ]]; then
            echo "No PR found for branch $branch_name. Stopping processing."
            break
        fi

        echo "Verifying checks for PR: $pr_url..."
        if gh pr checks; then
            echo "All checks passed. Squash merging the PR for issue #$next_issue..."
            gh pr merge --squash
            echo "PR for issue #$next_issue merged successfully."
        else
            echo "PR checks failed. Please fix the errors before retrying."
            echo "Stopping further processing for manual intervention."
            break
        fi

        # 10. Clear context after ticket completion (only in real mode)
        echo "Ticket #$next_issue complete. Context will be cleared for next ticket."

    done
}

# Run the processing function
process_issues