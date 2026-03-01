---
name: generate-issue
description: Generates and publishes structured GitHub Issues in English. Analyzes provided context, error logs, or user input to create clear bug reports or feature requests. Keywords: issue, bug report, feature request, github, automation.
---

# Skill: Automated Issue Generator

**Summary**
This skill automatically drafts a structured, technical GitHub Issue based on user input, error logs, or project requirements. It ensures all generated content is clear, actionable, written in English, and published directly to the relevant GitHub repository.

## Execution To-Do
- [ ] Verify repository details.
- [ ] Gather context (error logs, user input, or feature requirements).
- [ ] Categorize the issue type (Bug, Feature, or Task).
- [ ] Draft the issue body in English using the correct template.
- [ ] Assign relevant labels.
- [ ] Publish the issue in GitHub.

## Process Steps

**1. Context & Setup**
* Identify the target repository.
* Collect all relevant context: stack traces, screenshots, terminal output, or feature specifications.

**2. Analysis & Categorization**
* Determine if the issue is a **Bug** (unexpected behavior), **Feature** (new functionality), or **Task** (refactoring/chores).
* Identify the core components affected (e.g., Database, UI, Authentication).

**3. Drafting**
* Structure the issue based on its category.
* **For Bugs**: Focus on steps to reproduce, actual behavior, and expected behavior.
* **For Features**: Focus on the user story, business value, and acceptance criteria.

**4. Publishing**
* Apply appropriate labels (e.g., `bug`, `enhancement`, `needs-triage`).
* Use GitHub tools to create the issue.

## Output Formatting Rules

The generated Issue must strictly follow this structure:
* **Headers (`###`)**: Use standard sections (`### Description`, `### Steps to Reproduce`, `### Expected Behavior`, `### Acceptance Criteria`).
* **Code Blocks (` ``` `)**: Use fenced code blocks for any logs, stack traces, or code snippets.
* **Environment Specs**: Include a section for OS, browser, or node version if applicable.
* **Checkboxes (`* [ ]`)**: Use for Acceptance Criteria in feature requests.

## Example Issue Output (Bug)

### Description
The `sessionCheck` middleware throws a 500 Internal Server Error when a user with an expired JWT attempts to access the `/internal/dashboard` route, instead of returning a 401 Unauthorized.

### Steps to Reproduce
1. Log in to the application to receive a valid JWT.
2. Wait for the token to expire (or manually modify the expiration payload).
3. Navigate to `/internal/dashboard`.
4. Observe the 500 error in the API response.

### Expected Behavior
The API should catch the expired token and return a structured `401 Unauthorized` response, allowing the frontend to redirect the user to the login screen.

### Error Logs
```json
{
  "error": "TokenExpiredError",
  "message": "jwt expired",
  "stack": "..."
}