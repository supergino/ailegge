# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Development Environment Setup
The primary environment for this project is a modern JavaScript/TypeScript stack, likely based on Next.js given the README context. All commands related to building, linting, and testing should be executed within this environment.

### Common Commands
For standard development tasks, use these conventions:
- **Build:** `npm run build` (or `yarn build`) for compiling frontend assets and preparing the application for deployment.
- **Linting:** `npm run lint` to check code style and potential issues in the codebase. Always apply fixes suggested by the linter.
- **Run Tests:** To execute all unit/integration tests, use `npm run test`. For a single specific test file, use `npm run test -- <filename>` or the equivalent command provided by your testing framework (e.g., Jest).

### High-Level Architecture Overview
The application IusMente is structured around a core principle of **Dual Persona** and **Jurisdictional Filtering**. When designing new features or refactoring, consider these architectural boundaries:

1.  **Persona Layer:** Any feature that interacts with the user experience or response generation must clearly distinguish between the 'Tutor Didattico' (empathetic/supportive) mode and the 'Rigore d'Esame' (formal/academic) mode. Changes here impact the core UX/interaction logic.
2.  **Jurisdiction Engine:** All content processing and factual grounding must be routed through a dedicated filtering mechanism that strictly enforces the scope (e.g., Italian law vs. EU Law). This engine is critical for data integrity. Never implement logic directly in response generation; always route through this filter.
3.  **Presentation Layer:** The UI components are responsible for displaying the metadata (models used and sources consulted) transparently, adhering to the principle of complete transparency outlined in the project's philosophy.

## 📜 Project Philosophy Summary
Remember: The goal is to create an interactive learning tool that balances empathy with rigorous academic formality. Every design decision must serve this duality.
