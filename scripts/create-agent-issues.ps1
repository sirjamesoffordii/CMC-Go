Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [string]$Repo = 'sirjamesoffordii/CMC-Go'
)

function Require-Gh {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (-not $gh) {
    throw "GitHub CLI (gh) is not installed. Install it (e.g. winget install --id GitHub.cli) and run 'gh auth login'."
  }
}

function Get-LabelSet {
  $labels = @{}
  try {
    $json = gh label list --repo $Repo --limit 200 --json name 2>$null | ConvertFrom-Json
    foreach ($l in $json) { $labels[$l.name] = $true }
  } catch {
    # If label listing fails, proceed without labels.
  }
  return $labels
}

function New-Issue {
  param(
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Body,
    [string[]]$Labels = @()
  )

  $args = @('issue','create','--repo',$Repo,'--title',$Title,'--body',$Body)
  $labelSet = $script:LabelSet
  foreach ($lab in $Labels) {
    if ($labelSet.ContainsKey($lab)) {
      $args += @('--label',$lab)
    }
  }

  gh @args
}

Require-Gh
$script:LabelSet = Get-LabelSet

$issues = @(
  @{ Title = 'Explorer: Audit “ahead of staging” branches and propose merge order'; Labels = @('role:explorer'); Body = @'
STATUS: In Progress

CONTEXT:
- `origin/staging` is working truth.
- These remote branches are ahead of `origin/staging` and need triage:
  - `origin/agent/docs/agent-playbook-nav`
  - `origin/agent/setup-agent-workflow`
  - `origin/copilot/update-key-agent-docs`

ACCEPTANCE CRITERIA:
- Produce a short merge plan recommending order (risk-based) and why.
- For each branch: list what surfaces change (docs-only vs client/server/db), likely conflicts, and required gates.
- Identify any dependency constraints (must merge together / must not merge together).

EVIDENCE REQUIRED:
- `git log --oneline --max-count=20 <branch>`
- `git diff --name-only origin/staging...<branch>`

NEXT:
- Post the plan as an Issue comment with the evidence.
'@ },

  @{ Title = 'Builder: Merge docs playbook nav into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth. Merge `origin/agent/docs/agent-playbook-nav` into `staging` as a small, reviewable change.

ACCEPTANCE CRITERIA:
- `staging` includes the docs improvements from `origin/agent/docs/agent-playbook-nav`.
- Keep changes tightly scoped (docs/prompts only).
- Push to `origin/staging`.

EVIDENCE REQUIRED:
- `pnpm check`
- `pnpm test`
- `git status -sb` shows `staging...origin/staging` in sync after push.
'@ },

  @{ Title = 'Builder: Merge setup-agent-workflow (onboarding/registration) into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth.
- Merge `origin/agent/setup-agent-workflow` separately (contains app behavior changes).

ACCEPTANCE CRITERIA:
- Merge is isolated (not combined with other branches).
- Resolve conflicts with the smallest safe diff.
- Push to `origin/staging`.

EVIDENCE REQUIRED:
- `pnpm check`
- `pnpm test`
- If UI flow changed, run: `pnpm -s playwright test e2e/smoke.spec.ts` (paste output)
'@ },

  @{ Title = 'Builder: Evaluate merge of copilot/update-key-agent-docs into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth.
- Branch `origin/copilot/update-key-agent-docs` includes code changes (client + server) and must be merged with full evidence gates.

ACCEPTANCE CRITERIA:
- Either:
  - A) Merge into `staging`, push to `origin/staging`, and provide full evidence gates.
  - OR
  - B) If not safe to merge: post a Coordinator escalation comment explaining why + propose a safe slice (specific commits/files).

EVIDENCE REQUIRED (for option A):
- `pnpm check`
- `pnpm test`
- `pnpm -s playwright test e2e/smoke.spec.ts`
'@ },

  @{ Title = 'Verifier: Run post-merge gates for each staging merge'; Labels = @('role:verifier'); Body = @'
STATUS: In Progress

CONTEXT:
- After each merge lands in `origin/staging`, independently verify.

ACCEPTANCE CRITERIA:
- For each merge commit: comment with commands run + results + verdict.

VERIFICATION CHECKLIST:
- `pnpm check`
- `pnpm test`
- If UI affected: `pnpm -s playwright test e2e/smoke.spec.ts`
'@ },

  @{ Title = 'Browser Operator: Deployed staging smoke check after merges'; Labels = @('role:browser-operator'); Body = @'
STATUS: In Progress

CONTEXT:
- After merges land in `origin/staging`, do a fast deployed smoke check.

ACCEPTANCE CRITERIA:
- Record click-steps + evidence (screenshots/URLs).
- Prefer read-only verification; only change config if explicitly tasked.
- Report regressions with repro steps.
'@ }
)

Write-Host "Creating $($issues.Count) issues in $Repo..." -ForegroundColor Cyan
foreach ($i in $issues) {
  $url = New-Issue -Title $i.Title -Body $i.Body -Labels $i.Labels
  Write-Host $url -ForegroundColor Green
}
