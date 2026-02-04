param(
  # repo in owner/name format; defaults by parsing `git remote get-url origin`
  [string]$Repo,

  [ValidateSet('worktree','pr','issue-comment')]
  [string]$Mode,

  # worktree mode
  [string]$WorktreePath,
  [string]$Branch,
  [string]$BaseRef = 'origin/staging',

  # pr mode
  [string]$Base = 'staging',
  [string]$Title,
  [string]$BodyFile,

  # issue-comment mode
  [int]$Issue,
  [string]$Body
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoFromOrigin {
  $originUrl = (git remote get-url origin 2>$null)
  if (-not $originUrl) { throw "Repo not provided and git origin remote not found. Pass -Repo owner/name." }
  $m = [regex]::Match($originUrl, 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(?:\.git)?$')
  if (-not $m.Success) { throw "Could not parse GitHub repo from origin URL: $originUrl. Pass -Repo owner/name." }
  return "$($m.Groups['owner'].Value)/$($m.Groups['repo'].Value)"
}

function Resolve-Repo {
  if ($Repo) { return $Repo }
  return (Resolve-RepoFromOrigin)
}

function Require-Gh {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (-not $gh) { throw "Requires GitHub CLI (gh). Install it and run 'gh auth login'." }
}

if (-not $Mode) {
  throw "-Mode is required. Use: worktree | pr | issue-comment"
}

switch ($Mode) {
  'worktree' {
    if (-not $WorktreePath) { throw "worktree mode requires -WorktreePath" }
    if (-not $Branch) { throw "worktree mode requires -Branch" }

    git fetch --prune origin | Out-Null

    if (Test-Path $WorktreePath) {
      throw "Worktree already exists: $WorktreePath"
    }

    git worktree add -b $Branch $WorktreePath $BaseRef
    Write-Host "Created worktree:" $WorktreePath -ForegroundColor Green
    Write-Host "Next:" -ForegroundColor Cyan
    Write-Host "  Set-Location \"$WorktreePath\"" -ForegroundColor Cyan
    Write-Host "  git status -sb" -ForegroundColor Cyan
  }

  'pr' {
    Require-Gh
    $repoName = Resolve-Repo
    if (-not $Title) { throw "pr mode requires -Title" }

    $args = @('pr','create','-R',$repoName,'--base',$Base,'--title',$Title)
    if ($BodyFile) {
      if (-not (Test-Path $BodyFile)) { throw "BodyFile not found: $BodyFile" }
      $args += @('--body-file',$BodyFile)
    }

    & gh @args
  }

  'issue-comment' {
    Require-Gh
    $repoName = Resolve-Repo
    if (-not $Issue) { throw "issue-comment mode requires -Issue" }
    if (-not $Body) { throw "issue-comment mode requires -Body" }

    gh issue comment $Issue -R $repoName -b $Body
  }
}
