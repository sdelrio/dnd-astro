#!/bin/zsh

# This script processes GitHub Issues in dependency-based order with automation for implementation, testing, and code review. 
# Ensure you have `opencode`, `/tdd`, `/code-review` configured, and PR permissions.

# Ensure the working directory is clean and ready
echo "Starting GitHub Issues processing..."

# Loop through issues labeled `ready-for-agent`
function process_issues() {
    local next_issue

    while : ; do
        # Fetch the next ticket that has all blockers resolved
        next_issue=$(gh issue list --label "ready-for-agent" --json number --jq ".[] | .number" | head -n 1)

        if [[ -z "$next_issue" ]]; then
        echo "No more issues to process. Exiting..."
        break

        # Clear context at the end of the ticket
        echo "Clearing context using opencode (end of ticket)..."
        opencode clear || echo "Context clearing failed, continuing..."

        fi

        echo "Processing issue #$next_issue"
        gh issue view "$next_issue" --json title,body,labels --jq ".title" || {
            echo "Failed to retrieve issue details for #$next_issue"
            break
        }

        # Clear context at the start of the ticket
        echo "Clearing context using opencode (start of ticket)..."
        opencode clear || echo "Context clearing failed, continuing..."

        # Create a branch for the ticket
        branch_name="issue-$next_issue"
        # Check if branch already exists
        if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
            echo "Branch $branch_name already exists. Switching to it..."
            git checkout "$branch_name"
        else
            echo "Creating new branch $branch_name..."
            git checkout -b "$branch_name"
        fi

        # Start TDD for the issue
        echo "Starting implementation using TDD for issue #$next_issue..."
        opencode tdd --ticket "$next_issue"

        # Commit changes
        echo "Committing changes for ticket #$next_issue..."
        git add .
        git commit -m "Implement fixes for issue #$next_issue" -m "This commit addresses the tasks and requirements specified in issue #$next_issue."

        # Create a pull request (PR)
        echo "Creating a Pull Request for branch: $branch_name..."
        # Push branch to remote
        echo "Pushing branch $branch_name to remote..."
        git push -u origin "$branch_name"

        # Create a pull request (PR)
        pr_url=$(gh pr create --title "Fixes issue #$next_issue" --body "This PR resolves issue #$next_issue and includes the necessary fixes and improvements.")
        echo "Pull Request created: $pr_url"

        # Check code review
        echo "Running code review for changes..."
        review_output=$(opencode code-review)
        echo "$review_output"

        # Post the code review result as a PR comment
        pr_url=$(gh pr view --json url --jq ".url")
        if [[ -n "$pr_url" ]]; then
            echo "Posting code review summary to PR: $pr_url"
            gh pr comment "$pr_url" --body "$review_output"
        else
            echo "No associated PR found, skipping comment."
        fi

        # Check if any fixes or changes are needed
        if echo "$review_output" | grep -q "fixes needed"; then
            echo "Applying fixes suggested by code review..."
            opencode tdd --fix || {
                echo "Automatic fixes failed. Please review manually."
                break
            }

            echo "Adding new commit for fixes..."
            git add . && git commit -m "Fixes from code review for issue #$next_issue"
        fi

        # Finalize and verify all PR checks
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
    done
}

process_issues