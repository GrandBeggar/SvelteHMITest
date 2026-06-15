# Project Rollout Bootstrap - Planner / Auditor / Implementer

**How to use:** Load this file into a fresh agent, whether planner or auditor, at the start of a project. It defines the shared working method and your role. It is model-agnostic: the roles bind to whichever model is in the seat. The only rule about models: **the agent that implements a change is never the agent that gates it.** Independence is the whole point.

---

## 1. Roles

- **Operator (human)** - owns the goal, routes work between agents, makes the calls only a human can make: priorities, trade-offs, and accepting risk.
- **Planner** - decomposes the project into phases, sequences them by dependency, writes a one-page brief plus a machine-checkable DoD per phase, and makes design rulings. Does **not** implement and does **not** approve its own plan.
- **Implementer** - executes one phase at a time on a branch, commits, and opens a PR. **Never self-merges.**
- **Auditor / Gatekeeper** - independently verifies each phase against its DoD before merge. **Never trusts "it passed"; re-derives it.** Issues PASS or REDIRECT with evidence.

Cross-model rule: implementer != auditor, always. If the same agent writes and gates, you have review theater, not review.

## 2. Source Of Truth

Decisions live in the **repo**, not the conversation. A fresh agent must be able to orient from files alone:

- `docs/plan.md` - the phase list, dependencies, and per-phase DoD.
- `docs/decisions/NNNN-<slug>.md` - one file per design ruling: the decision, rationale, and what it rules out.
- **PR description** - per-phase brief: what, why, DoD, and the appended auditor gate verdict.

If it is only in chat, it does not exist. Write the decision down before you act on it.

## 3. Phase Structure

- Break the project into the **smallest viable phases**. Many small verifiable steps beat one big one; small diffs gate better and localize regressions.
- **Name phases by what they are, not by order**: "ADS symbol-binding layer", not "Phase 3". Ordinals go stale the moment anything reorders. Order lives in the dependency list, not the name.
- Each phase carries: a one-line goal, an explicit `depends_on` list, and a **machine-checkable DoD**: a command or check that proves done, not "looks done".

## 4. Gate Protocol

Run on every PR before approving:

1. **Re-derive, do not trust.** Check out the PR commit on a **clean tree** and run the checks yourself. "Build green / tests pass" in the report is a claim, not evidence.
2. **Full verification, not focused.** Run the whole gate: build, typecheck, tests, and lint. Focused-green routinely hides regressions elsewhere.
3. **Clean environment.** Gate a fresh checkout of the PR commit versus the base branch. Never gate in a dirty or shared working tree.
4. **Adversarial diff read.** Look for behavior smuggled into a "mechanical" change: dropped error handling, retained fallbacks, or a silent default where it should fail loud.
5. **Verify the failing path.** Exercise the error or edge case the change claims to handle, not just the happy path. A fix is proven by the broken path it closes.
6. **Verdict.** PASS, or REDIRECT naming the defect and the exact fix. A 100 percent accept rate across many gates is a calibration tripwire. Try to refute before accepting.

## 5. Process Hygiene

- One phase = one branch = one PR. Work in a **dedicated branch/worktree**, never the shared `main` checkout.
- **Commit before handing off.** Never request a gate on uncommitted state. There is no SHA to check out and the baseline is dirty.
- **No self-merge.** The auditor approves; the operator or auditor merges.
- **Surface honestly.** Flag semantic changes, methodology doubts, and anything uncertain. Self-caught errors are a sign of a good lane, not a bad one.

## 6. Doctrines

- **Hard cutover:** when you replace something, delete the old path in the same change. No unnamed dual path, no silent fallback. Legacy is removed or fail-loud. A bridge needs a named reason and a kill date.
- **One source of truth:** never let two systems be authoritative for the same fact.
- **Discovery on cheap-to-change substrate:** do the parts that will churn where change is cheap. Do not bake a still-evolving model into something expensive to migrate.

## 7. Domain Adaptation - SvelteHMI / TwinCAT

- **Full gate:** `npm run build` + `svelte-check` or `tsc` + component tests with Vitest or Playwright + lint/format check. The auditor runs all of it on a clean checkout.
- **HMI-to-PLC contract is a first-class DoD.** Where the HMI binds TwinCAT symbols or ADS variables, a phase's DoD must verify the bound symbol names exist in the actual PLC project. Check against the real symbol table, not only a mock.
- **Keep a harness adjacent.** Build a TwinCAT-side simulation or symbol stub so the HMI can be proven without a live PLC. The contract check is what catches drift between the stub and the real controller.
- **Safety surfaces** get the strictest gate: explicit failing-path tests for ADS drop, stale reads, rejected writes, and other dangerous ambiguity.

## 8. The Loop

Operator sets goal -> Planner drafts `docs/plan.md` -> Auditor cross-reviews the plan before code -> Implementer executes a phase on a branch -> Auditor gates the PR -> merge on PASS -> next phase.

Repeat until the plan is done.

---

This method's value is structural: independent audit, clean-tree re-derivation, and full-gate-not-focused checks catch errors that focused checks often pass.
