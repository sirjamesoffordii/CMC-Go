<#
.SYNOPSIS
    Add issue to project board and set status.
.DESCRIPTION
    Adds an issue to the CMC Go project board and immediately sets status.
    This prevents items from appearing in limbo (no status).
.PARAMETER IssueNumber
    The issue number to add to the board
.PARAMETER Status
    Status to set (default: Todo). Options: Blocked, AEOS Improvement, Exploratory, Draft (TL), Todo, In Progress, Verify, UI/UX. Review, Done
.EXAMPLE
    .\scripts\add-board-item.ps1 -IssueNumber 123
    .\scripts\add-board-item.ps1 -IssueNumber 123 -Status "Draft (TL)"
    .\scripts\add-board-item.ps1 -IssueNumber 123 -Status "Blocked"
#>
param(
    [Parameter(Mandatory)]
    [int]$IssueNumber,
    
    [ValidateSet("Blocked", "AEOS Improvement", "Exploratory", "Draft (TL)", "Todo", "In Progress", "Verify", "UI/UX. Review", "Done")]
    [string]$Status = "Todo"
)

# Project and field IDs (from AGENTS.md)
$projectId = "PVT_kwHODqX6Qs4BNUfu"
$statusFieldId = "PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA"
$statusOptionIds = @{
    "Blocked" = "652442a1"
    "AEOS Improvement" = "adf06f76"
    "Exploratory" = "041398cc"
    "Draft (TL)" = "687f4500"
    "Todo" = "f75ad846"
    "In Progress" = "47fc9ee4"
    "Verify" = "5351d827"
    "UI/UX. Review" = "576c99fd"
    "Done" = "98236657"
}

$statusOptionId = $statusOptionIds[$Status]
if (-not $statusOptionId) {
    Write-Host "❌ Unknown status: $Status" -ForegroundColor Red
    exit 1
}

Write-Host "Adding issue #$IssueNumber to board..." -ForegroundColor Cyan

# Step 1: Get the issue node ID
$issue = gh issue view $IssueNumber --repo sirjamesoffordii/CMC-Go --json id 2>&1 | ConvertFrom-Json
if (-not $issue -or -not $issue.id) {
    Write-Host "❌ Could not find issue #$IssueNumber" -ForegroundColor Red
    exit 1
}
$issueNodeId = $issue.id

# Step 2: Add to project
$addResult = gh project item-add 4 --owner sirjamesoffordii --url "https://github.com/sirjamesoffordii/CMC-Go/issues/$IssueNumber" --format json 2>&1 | ConvertFrom-Json
if (-not $addResult -or -not $addResult.id) {
    Write-Host "❌ Failed to add issue to board" -ForegroundColor Red
    exit 1
}
$itemId = $addResult.id
Write-Host "✅ Added to board (item: $itemId)" -ForegroundColor Green

# Step 3: Set status via GraphQL
$mutation = @"
mutation {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: "$projectId"
      itemId: "$itemId"
      fieldId: "$statusFieldId"
      value: { singleSelectOptionId: "$statusOptionId" }
    }
  ) {
    projectV2Item {
      id
    }
  }
}
"@

$result = gh api graphql -f query="$mutation" 2>&1 | ConvertFrom-Json
if ($result.errors) {
    Write-Host "❌ Failed to set status: $($result.errors[0].message)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Status set to: $Status" -ForegroundColor Green
Write-Host ""
Write-Host "Issue #$IssueNumber is now in '$Status' on the board" -ForegroundColor Cyan

return @{
    success = $true
    issue = $IssueNumber
    itemId = $itemId
    status = $Status
}
