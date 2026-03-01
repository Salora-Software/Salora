---
name: generate-pr
description: Generates and publishes structured Pull Request descriptions in English. Analyzes changes via Git and GitHub tools to create a technical changelog. Keywords: pull request, pr, github, git diff, changelog, automation.
---

# Skill: Automated Pull Request Generator

**Summary**
This skill automatically drafts a structured, technical Pull Request (PR) description by correlating local repository changes with the GitHub project context. It ensures all generated content, including technical explanations, is written in English and publishes it directly to GitHub.

## Execution To-Do
- [ ] Verify repository details and target branch.
- [ ] Check for existing open PRs for the current branch.
- [ ] Analyze code diffs.
- [ ] Categorize changes by technical domain.
- [ ] Draft the description in English.
- [ ] Publish or update the PR in GitHub.

## Process Steps

**1. Context & Setup**
* Identify the repository URL using `git remote -v`.
* Get the current branch name and determine the target branch (typically `main` or `develop`).
* Use GitHub tools (e.g., GitHub CLI or GitHub MCP) to check if a PR already exists for the current branch.

**2. Code Analysis**
* Use local `git diff` or GitHub API tools to inspect the actual changes.
* Focus on modified functions, updated schemas, and new API endpoints.

**3. Domain Categorization**
* Group the analyzed changes into logical technical domains (e.g., Backend, Frontend, Database, Security).

**4. Publishing**
* Generate the text using the Output Formatting Rules below.
* Use GitHub tools to create or update the PR description.

## Output Formatting Rules

The generated PR description must strictly follow this hierarchy for maximum readability:
* **Domain Headers (`####`)**: Categorize by type of work (e.g., `#### API & Schema`, `#### UI Components`).
* **Checkboxes (`* [x]`)**: Represent each technical adjustment as a checked item.
* **Component Labels (`**Component**:`)**: Start every item with the specific component or file group.
* **Description**: A factual, English explanation of the change.

## Example PR Output

#### Backend & API Routing
* [x] **Auth Middleware**: Added `sessionCheck` to `/internal` routes to block unauthorized access.
* [x] **Prisma Service**: Extended query logic with a `where` clause for tenant isolation.

#### Validation & Logic
* [x] **User Schema**: Updated `z.object` in `user.schema.ts` with optional profile fields to prevent runtime errors during registration.
* [x] **CASL Ability**: Added new `can('read', 'Project')` rule for the 'viewer' role.