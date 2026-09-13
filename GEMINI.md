# Git Workflow Rules for AgriSense Platform

## Mandatory Git Protocol for Collaborators

1. **BEFORE making any modifications or edits to the codebase:**
   - ALWAYS pull latest changes from both remote branches:
     ```bash
     git pull origin devesh
     git pull origin main
     ```
   - Ensure the working tree is fully synced and up-to-date with both branches before starting work.

2. **AFTER changes are successfully implemented and approved:**
   - ALWAYS commit and push ONLY to `origin devesh`:
     ```bash
     git push origin devesh
     ```
   - **CRITICAL RESTRICTION:** NEVER push directly to `origin main` or suggest merging/pushing to `main`. The user is working as a collaborator on branch `devesh`.
