---
name: generate-mr
description: Generates and publishes structured Merge Request descriptions in English. Analyzes changes via Git and the GitLab MCP to create a technical changelog. Keywords: merge request, mr, gitlab mcp, git diff, changelog, automation.
---

# Skill: Automated Merge Request Generator

**Summary**
This skill automatically drafts a structured, technical Merge Request (MR) description by correlating local repository changes with the GitLab project context. It ensures all generated content, including technical explanations, is written in English and publishes it directly to GitLab via the MCP.

## Execution To-Do
- [ ] Verify project ID and target branch.
- [ ] Check for existing draft MRs.
- [ ] Analyze code diffs (local or remote).
- [ ] Categorize changes by technical domain.
- [ ] Draft the description in English.
- [ ] Publish or update the MR in GitLab.

## Process Steps

**1. Context & Setup**
* Identify the project ID using `git remote -v`.
* Get the current branch name and determine the target branch (typically `main` or `develop`).
* Use `mcp_gitlab_get_merge_request` to check if a draft MR already exists for the current branch.

**2. Code Analysis**
* Use a combination of local `git diff` or `mcp_gitlab_get_merge_request_diffs` to inspect the actual changes.
* Focus on modified functions, updated schemas (e.g., Zod/Prisma), and new API endpoints.

**3. Domain Categorization**
* Group the analyzed changes into logical technical domains (e.g., Backend, Frontend, Database, Security).

**4. Publishing**
* Generate the text using the Output Formatting Rules below.
* Use `mcp_gitlab_create_merge_request` or `mcp_gitlab_update_merge_request` to post the description to GitLab.

## Output Formatting Rules

The generated MR description must strictly follow this hierarchy for maximum readability:
* **Domain Headers (`####`)**: Categorize by type of work (e.g., `#### API & Schema`, `#### UI Components`).
* **Checkboxes (`* [x]`)**: Represent each technical adjustment as a checked item.
* **Component Labels (`**Component**:`)**: Start every item with the specific component or file group.
* **Description**: A factual, English explanation of the change.

## Example MR Output

#### Backend & API Routing
* [x] **Auth Middleware**: Added `sessionCheck` to `/internal` routes to block unauthorized access.
* [x] **Prisma Service**: Extended query logic with a `where` clause for tenant isolation.

#### Validation & Logic
* [x] **User Schema**: Updated `z.object` in `user.schema.ts` with optional profile fields to prevent runtime errors during registration.
* [x] **CASL Ability**: Added new `can('read', 'Project')` rule for the 'viewer' role.