OnYou

A Gamified Focus Timer with a Virtual Pet

OnYou is a productivity application designed to help users build consistent focus habits through timed work sessions, virtual pet interactions, and a reward system.

Users can complete focus sessions, earn coins and apples, monitor their virtual pet’s feeding progress, and review their focus history.

The project is developed using AI-assisted software engineering practices, Agile Scrum, and structured AI development instructions.

⸻

1. Project Overview

1.1 Project Goals

OnYou aims to:

* Encourage consistent focus habits.
* Provide a simple and engaging focus timer.
* Reward completed focus sessions.
* Visualize productivity through a virtual pet.
* Support secure account-based session management.
* Maintain a clear development workflow using GitHub Scrum.

1.2 Core Features

The MVP includes:

1. User registration and authentication.
2. Password reset.
3. Virtual pet creation and management.
4. Focus sessions of 15, 25, or 50 minutes.
5. Account-owned session management.
6. Heartbeat-based session presence tracking.
7. Coin and apple rewards.
8. Daily feeding progress.
9. Session history.
10. Responsive and accessible interfaces.

The authoritative product requirements are defined in:

OnYou_PRD_v2_9.md

The authoritative UI design reference is:

OnYou_web_mockups.html

⸻

2. Technology Stack

Category	Technology
Framework	Next.js
Language	TypeScript
Styling	Tailwind CSS
ORM	Prisma
Database	PostgreSQL
Deployment	Vercel
Database Hosting	Neon
Unit Testing	Vitest
E2E Testing	Playwright
API Documentation	OpenAPI / Swagger
Version Control	Git / GitHub
AI Development Tool	Cursor

The final implementation must follow the versions and architecture conventions defined in AGENTS.md.

The HW3 reward experiments use a minimal TypeScript/Vitest environment rather than the full Next.js application.

⸻

3. Repository Structure

The main repository is organized as follows:

OnYou/
│
├── AGENTS.md
├── README.md
├── OnYou_PRD_v2_9.md
├── OnYou_web_mockups.html
├── table.tsv
│
├── docs/
│   │
│   ├── hw3/
│   │   ├── HW3_AGENTS_BASELINE.md
│   │   ├── HW3_AGENTS_pre_v2_9.md
│   │   ├── HW3_Scrum_Setup_Report.md
│   │   ├── HW3_Before_After_Experiment_Plan.md
│   │   ├── HW3_Before_After_Results.md
│   │   ├── HW3_Three_Way_Experiment_Results.md
│   │   ├── HW3_Rules_Refinement_Report.md
│   │   ├── HW3_AGENTS_Simplification_Report.md
│   │   ├── HW3_PRD_Update_Analysis.md
│   │   └── HW3_PRD_v2_9_Sync_Report.md
│   │
│   └── archive/
│       ├── OnYou_PRD.md
│       ├── OnYou_PRD v2.md
│       │
│       └── rules/
│           ├── AGENTS_pre_v2_9.md
│           ├── AGENTS_HW3_experiment_baseline.md
│           └── AGENTS_v3_before_simplification.md
│
├── hw3-experiment/
│   ├── hidden-eval/
│   └── eval-run/
│
└── .scrum-setup/

Some folders contain experiment artifacts or local automation scripts rather than production application code.

The two archived PRDs and the eight HW3 reports have already been moved into their respective documentation folders.

The two original HW3_AGENTS_*.md files should also be moved to docs/hw3/ if that cleanup has not yet been completed.

Historical files are preserved for traceability. They are not authoritative development instructions.

⸻

4. Documentation Organization

4.1 Active Project Documents

File	Purpose
AGENTS.md	Current AI development rules
OnYou_PRD_v2_9.md	Authoritative product requirements
OnYou_web_mockups.html	UI design and user flow reference
table.tsv	Original 30-issue sprint planning table
README.md	Project documentation and testing guide

4.2 Archived PRD Versions

Previous PRD versions were moved from the repository root into:

docs/archive/

The archived files are:

* OnYou_PRD.md
* OnYou_PRD v2.md

These files are retained to document the evolution of product requirements.

PRD v2.9 is the only active product specification.

The transition to v2.9 introduced account-owned sessions, heartbeat-based presence tracking, and updated multi-tab session behavior.

4.3 Archived AI Rules

Previous versions of the AI development rules are stored in:

docs/archive/rules/

File	Description
AGENTS_pre_v2_9.md	Rules before the PRD v2.9 synchronization
AGENTS_HW3_experiment_baseline.md	Frozen rules used in the original experiment
AGENTS_v3_before_simplification.md	Rules snapshot before the final simplification

The original versions were copied rather than overwritten.

File comparisons were performed using diff -q to verify the archived copies matched their sources.

⸻

5. AGENTS.md Development History

The project uses AGENTS.md to provide persistent development instructions to AI coding agents.

5.1 Rules Evolution

The rules evolved through several stages:

Stage 1 — Initial Rules

Established the project context, technology stack, architecture, naming conventions, testing strategy, and GitHub workflow.

Stage 2 — PRD v2.9 Synchronization

Updated the rules to reflect:

* Account-owned focus sessions.
* One active session per account.
* Multi-tab session participation.
* Heartbeats every 10 seconds.
* A 30-second presence deadline.
* Exactly-once reward processing.
* Removal of the obsolete sessionStorage completion-token model.

Stage 3 — Experiment-Based Refinement

The original Before/After Experiment identified differences in naming conventions, test organization, and development workflow.

The rules were refined to clarify:

* Internal enum tokens versus user-facing labels.
* Red–Green–Refactor testing evidence.
* Avoidance of unnecessary no-op expressions.

Stage 4 — Rules Simplification

The live AGENTS.md was shortened from 502 lines to 247 lines.

This represents an approximately 50.8% reduction in line count.

The simplified version preserves essential development instructions while referring to the PRD and mockups for detailed product requirements.

5.2 Current Rules

The active file is:

AGENTS.md — Version 5

Historical rule files must not override the active rules.

Detailed changes are documented in:

docs/hw3/HW3_Rules_Refinement_Report.md

docs/hw3/HW3_AGENTS_Simplification_Report.md

The original experiment baseline has been preserved and must not be modified.

⸻

6. Agile Scrum Workflow

6.1 GitHub Repository

Repository:

https://github.com/venuschen999/OnYou

6.2 GitHub Project Board

Project Board:

https://github.com/users/CollinsCao/projects/3

The board uses five workflow statuses:

1. Backlog
2. Sprint Todo
3. In Progress
4. In Review
5. Done

The project contains 30 planned GitHub Issues.

6.3 Sprint Milestones

Sprint	Start Date	End Date	Issues
Sprint 1	October 24, 2026	November 2, 2026	#1–18
Sprint 2	November 3, 2026	November 11, 2026	#19–30

Sprint 1 focuses on infrastructure, authentication, focus sessions, and reward processing.

Sprint 2 focuses on feeding progress, the dashboard, history, password reset, testing, and documentation.

6.4 GitHub Issue Management

Each issue includes:

* An actionable title.
* A feature description.
* Acceptance criteria.
* Labels and priority.
* Sprint milestone.
* Assigned owner.
* Relevant dependencies.

The original issue planning table is preserved in:

table.tsv

The final issue descriptions were synchronized with PRD v2.9.

6.5 Scrum Setup Evidence

The setup process and verification results are documented in:

docs/hw3/HW3_Scrum_Setup_Report.md

The Project Board is publicly accessible, but its formal repository association remains limited by the difference between the Project owner and repository owner.

⸻

7. HW3 — Context Engineering Experiment

7.1 Experiment Objective

The experiment evaluates whether AI development instructions improve the quality and consistency of AI-generated implementations.

The selected feature was:

GitHub Issue #11 — Reward Calculation Module

The main experiment compares:

* BEFORE: Without AGENTS.md
* AFTER: With the frozen original AGENTS.md

A third experiment evaluates the simplified rules.

7.2 Experimental Conditions

Condition	Rules	Description
BEFORE	None	Implementation without project-specific AGENTS.md
AFTER	Original baseline	Implementation with frozen project rules
SIMPLIFIED	Version 5	Additional test using the shortened rules

The first two runs used Cursor Grok 4.6.

The exact model used for the simplified run was not recorded in the saved transcript, so the third run cannot be treated as a fully model-controlled comparison.

All implementations were generated in separate workspaces.

⸻

8. Experiment Workspace Locations

The three implementation workspaces are located outside the main repository.

project2/
│
├── OnYou/
│
├── OnYou-experiment-before/
│
├── OnYou-experiment-after/
│
└── OnYou-experiment-simplified/

8.1 BEFORE Workspace

Path:

../OnYou-experiment-before/

Purpose:

Evaluate AI-generated code without the project-specific rules file.

8.2 AFTER Workspace

Path:

../OnYou-experiment-after/

Purpose:

Evaluate AI-generated code with the frozen original rules.

The workspace includes an AGENTS.md copied from the preserved experiment baseline.

8.3 SIMPLIFIED Workspace

Path:

../OnYou-experiment-simplified/

Purpose:

Evaluate the simplified AGENTS.md Version 5.

The workspace starts without implementation code.

8.4 Important Reproducibility Note

These sibling experiment workspaces are local directories.

They are not automatically included when the main OnYou repository is pushed to GitHub.

The experiment reports and independent evaluation materials are stored in the main repository, but reproducing the implementation runs requires access to the corresponding generated source trees or archived copies of those trees.

⸻

9. Reward Calculation Requirements

The feature requirements come from PRD v2.9 and GitHub Issue #11.

9.1 Coins

Each completed focus minute earns one coin.

Coins accumulate across sessions and do not reset daily.

9.2 Feeding Minutes

Completed session minutes are added to the feeding progress for the corresponding feeding day.

Feeding minutes are capped at 50 per day.

Minutes beyond the cap are discarded.

9.3 Apples

Each 25 feeding minutes earns one apple.

Users can earn up to two apples per feeding day.

Unused feeding progress carries forward within the same feeding day.

9.4 Feeding States

Apples	Pet State
0	Starving
1	Hungry
2	Full

9.5 Abandoned Sessions

Abandoned sessions do not generate coins or feeding minutes.

Existing rewards remain unchanged.

9.6 Timezone Handling

The feeding day is determined using the session’s endTime in the user’s IANA timezone.

The system must not use the current processing time to decide which feeding day receives the session reward.

⸻

10. Testing Strategy

The experiment uses:

* TypeScript compiler checks.
* Vitest unit tests.
* Independent hidden tests.
* Code coverage measurements.
* Acceptance criteria validation.
* Manual code organization and workflow review.

The same independent hidden test suite was used to evaluate all three implementations.

10.1 Test Dependencies

The experimental workspaces use:

Dependency	Version
TypeScript	5.9.3
Vitest	3.2.4
@vitest/coverage-v8	3.2.4
@types/node	22.x

The exact installed dependency versions are recorded in each workspace’s package-lock.json.

The original experiment configuration required @types/node for TypeScript checking. This dependency was added consistently to the evaluation environments.

⸻

11. How to Run Unit Tests

Open one of the experiment workspaces.

For example:

cd ../OnYou-experiment-before

Install dependencies:

npm ci

Run the unit tests:

npm test -- --run

Run TypeScript checking:

npm run typecheck

Run code coverage:

npm run test:coverage

Repeat the same commands in:

../OnYou-experiment-after/
../OnYou-experiment-simplified/

11.1 What the Commands Do

Command	Purpose
npm ci	Install dependencies using the lockfile
npm test -- --run	Execute the Vitest unit tests
npm run typecheck	Run TypeScript checks without emitting files
npm run test:coverage	Measure code coverage

The test commands above apply to the experiment workspaces, not automatically to the main OnYou repository.

⸻

12. Independent Hidden Test Evaluation

12.1 Hidden Test Location

The independent test suite is stored under:

hw3-experiment/hidden-eval/

The evaluation artifacts and adapters are stored under:

hw3-experiment/eval-run/

These directories are separate from the generated implementation code.

12.2 Evaluation Method

The evaluation process was:

1. Generate the implementation in an isolated workspace.
2. Preserve the generated source code.
3. Finish the AI implementation run.
4. Run independent tests against the completed implementation.
5. Use external adapters where function signatures differ.
6. Record the actual test results.
7. Compare the implementations against the same acceptance criteria.

The evaluation did not modify the original generated implementation trees.

Hidden test assertions were not changed to improve results.

12.3 Running Hidden Tests

The hidden suite consists of 14 independent tests.

It was executed using the evaluation harness prepared under:

hw3-experiment/

Because the implementation APIs differ, the evaluation uses compatibility adapters.

For exact reproduction, consult:

docs/hw3/HW3_Before_After_Results.md

docs/hw3/HW3_Three_Way_Experiment_Results.md

The hidden suite must be run using the documented evaluation harness, rather than assuming that copying the test files directly into an implementation workspace will work without API adaptation.

The test reports contain the recorded execution results.

⸻

13. Experiment Results

13.1 Functional Results

Metric	BEFORE	AFTER	SIMPLIFIED
Unit Tests	16/16	16/16	19/19
Hidden Tests	14/14	14/14	14/14
TypeScript Errors	0	0	0
Acceptance Criteria	7/7	7/7	7/7
Executable Domain Coverage	100%	100%	100%

All three implementations passed the same independent hidden tests.

The original Before/After comparison found no measurable difference in functional correctness.

13.2 Observed Development Differences

The original WITH RULES implementation demonstrated:

* Naming conventions aligned with the baseline rules.
* Unit tests placed in the specified test directory.
* Explicit user story references in comments.
* Evidence of a test-first implementation sequence.

The WITHOUT RULES implementation also produced correct domain logic and passing tests, but differed in naming and organization.

The simplified-rules implementation documented an additional refactoring step and generated 19 unit tests.

However, the simplified run did not provide a complete independently verified Red–Green–Refactor record.

13.3 Interpretation

The experiment suggests that project instructions can influence coding conventions, file organization, and development workflow.

It does not demonstrate improved reward correctness.

The simplified rules preserved correctness on the evaluated test cases, but this does not establish that shorter rules are generally more effective.

⸻

14. Experiment Limitations

The experiment has several limitations:

1. Each condition was evaluated using a single AI generation run.
2. The simplified run did not preserve an explicit model identifier.
3. The simplified run did not independently verify that Cursor injected the rules into the model context.
4. The Red-phase test evidence was incomplete.
5. The 14 hidden tests did not cover every possible cross-day prior-state scenario.
6. All experiments focused on one domain feature rather than the full application.

These limitations are documented to avoid overinterpreting the results.

⸻

15. HW3 Reports and Evidence

All HW3 reports have been organized under:

docs/hw3/

Report	Purpose
HW3_Scrum_Setup_Report.md	GitHub Project Board, issues, milestones, and workflow configuration
HW3_Before_After_Experiment_Plan.md	Experiment hypothesis, controls, methodology, and evaluation criteria
HW3_Before_After_Results.md	Original No Rules vs. Original Rules evaluation
HW3_Three_Way_Experiment_Results.md	Additional simplified-rules evaluation
HW3_Rules_Refinement_Report.md	Evidence-based changes to AGENTS.md
HW3_AGENTS_Simplification_Report.md	Rules-file reduction and preservation checks
HW3_PRD_Update_Analysis.md	Analysis of changes introduced by PRD v2.9
HW3_PRD_v2_9_Sync_Report.md	Documentation and GitHub Issue synchronization record

15.1 Are the Results Updated in the Reports?

Yes. The results have been recorded in the following existing reports:

Original Before/After Results

docs/hw3/HW3_Before_After_Results.md

Includes the 16/16 unit-test results, 14/14 independent hidden-test results, acceptance checks, architecture observations, and comparison between the first two implementations.

Three-Way Experiment Results

docs/hw3/HW3_Three_Way_Experiment_Results.md

Includes the simplified-rules results, 19/19 unit tests, 14/14 hidden tests, TypeScript validation, code coverage, and experimental limitations.

Rules Refinement

docs/hw3/HW3_Rules_Refinement_Report.md

Documents the rules that were refined based on the initial experiment.

Rules Simplification

docs/hw3/HW3_AGENTS_Simplification_Report.md

Documents the reduction from 502 to 247 lines and the preservation of essential project requirements.

15.2 Documentation Relocation

The reports were originally generated in the root directory.

They were later moved to:

docs/hw3/

This relocation changes their paths, not their recorded experimental results.

The README uses the current documentation paths.

Any relative links inside the reports should be checked after relocation.

15.3 Submission Notes

The main HW3 deliverables are:

* GitHub repository and Project Board.
* Active AGENTS.md.
* Before/After code and test evidence.
* Experiment comparison report.
* Final reflection document prepared by the team.

The three-way experiment is supplementary evidence supporting the later rules refinement and simplification process.

⸻

16. Reproducibility and Evidence Integrity

The project preserves the original evaluation evidence.

During the experiments:

* The initial BEFORE implementation was preserved.
* The initial AFTER implementation was preserved.
* The frozen baseline rules were not modified.
* The independent hidden-test expectations were not changed.
* Evaluation adapters were kept outside generated implementation trees.
* The simplified implementation was evaluated separately.

The experiment results reflect actual recorded executions.

Any future modifications should be documented separately rather than retroactively changing the original results.

⸻

17. Development Status and Next Steps

As of October 28, 2026:

Completed

* PRD v2.9 synchronization.
* GitHub Scrum setup.
* 30 planned Issues.
* Two Sprint Milestones.
* AI development rules.
* Original Before/After Experiment.
* Independent hidden-test evaluation.
* Evidence-based rules refinement.
* Rules simplification.
* Supplementary simplified-rules experiment.

Remaining

* Final verification of repository documentation.
* GitHub commits and push.
* Final team reflection and submission.
* Application implementation according to Sprint priorities.

The experiments are isolated HW3 evidence and do not constitute completion of the production application.

⸻

18. Team Collaboration

The project is developed collaboratively.

Team responsibilities include:

Team Member A

* Product definition and PRD.
* Mockups and user flows.
* Technical planning.
* Initial AI development rules.
* Final reflection and submission.

Team Member B

* GitHub Scrum workflow.
* Issue and milestone configuration.
* Before/After Experiment.
* Independent test evaluation.
* Rules refinement and simplification.
* HW3 technical documentation.

The team uses GitHub Issues and the Project Board to coordinate development.

⸻

19. References

GitHub Repository

https://github.com/venuschen999/OnYou

GitHub Project Board

https://github.com/users/CollinsCao/projects/3

Sprint 1 Milestone

https://github.com/venuschen999/OnYou/milestone/1

Sprint 2 Milestone

https://github.com/venuschen999/OnYou/milestone/2

Active Product Requirements

OnYou_PRD_v2_9.md

Active AI Development Rules

AGENTS.md

HW3 Reports

docs/hw3/

⸻

Summary

OnYou combines gamified productivity features with an AI-assisted Agile development workflow.

The HW3 experiments demonstrated that all three evaluated implementations achieved the same measured functional correctness.

Project-specific AI rules influenced observable coding conventions, file organization, and aspects of the development workflow.

Subsequent refinement and simplification reduced the active rules file from 502 to 247 lines while preserving the tested reward behavior.

The repository preserves the experiment reports, historical rules, and evaluation evidence to support transparency and reproducibility.