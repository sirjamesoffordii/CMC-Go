<#
.SYNOPSIS
    Archives Done items from the project board, keeping the most recent N items.

.DESCRIPTION
    This script archives items in "Done" status from the CMC Go project board,
    preserving the most recent items (default: 50) for historical reference.
    
    GitHub Projects also has built-in auto-archive that runs automatically,
    but this script can be run manually or by PE for immediate cleanup.

.PARAMETER KeepRecent
    Number of recent Done items to keep (default: 50)

.PARAMETER DryRun
    Preview what would be archived without actually archiving

.EXAMPLE
    .\archive-old-done.ps1
    Archives Done items, keeping the 50 most recent

.EXAMPLE
    .\archive-old-done.ps1 -KeepRecent 25 -DryRun
    Preview archiving, would keep 25 most recent
#>

param(
    [int]$KeepRecent = 50,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Project IDs
$projectId = "PVT_kwHODqX6Qs4BNUfu"
$statusFieldId = "PVTSSF_lAHODqX6Qs4BNUfuzg8WaYA"
$doneOptionId = "98236657"

Write-Host "=== Archive Old Done Items ===" -ForegroundColor Cyan
Write-Host "Keeping: $KeepRecent most recent Done items"
if ($DryRun) { Write-Host "[DRY RUN]" -ForegroundColor Yellow }
Write-Host ""

# Get all Done items with their updated timestamps
$query = @"
query {
  node(id: "$projectId") {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          updatedAt
          isArchived
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
            }
          }
          content {
            ... on Issue {
              number
              title
              closedAt
            }
            ... on PullRequest {
              number
              title
              closedAt
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
"@

$allDoneItems = @()
$cursor = $null
$pageCount = 0

Write-Host "Fetching Done items..." -ForegroundColor Gray

do {
    $pageCount++
    
    if ($cursor) {
        $paginatedQuery = $query -replace 'items\(first: 100\)', "items(first: 100, after: `"$cursor`")"
    } else {
        $paginatedQuery = $query
    }
    
    $result = gh api graphql -f query=$paginatedQuery 2>&1 | ConvertFrom-Json
    
    if ($result.errors) {
        Write-Error "GraphQL error: $($result.errors | ConvertTo-Json)"
        exit 1
    }
    
    $items = $result.data.node.items.nodes
    $pageInfo = $result.data.node.items.pageInfo
    
    foreach ($item in $items) {
        if (-not $item.isArchived -and $item.fieldValueByName.name -eq "Done" -and $item.content) {
            $allDoneItems += [PSCustomObject]@{
                Id = $item.id
                Number = $item.content.number
                Title = $item.content.title
                ClosedAt = $item.content.closedAt
                UpdatedAt = $item.updatedAt
            }
        }
    }
    
    $cursor = $pageInfo.endCursor
    
} while ($pageInfo.hasNextPage -and $pageCount -lt 10)

Write-Host "Found $($allDoneItems.Count) Done items (not archived)" -ForegroundColor Gray

if ($allDoneItems.Count -le $KeepRecent) {
    Write-Host "`n✅ No cleanup needed - only $($allDoneItems.Count) Done items (below threshold of $KeepRecent)" -ForegroundColor Green
    exit 0
}

# Sort by closedAt (most recent first), fallback to updatedAt
$sortedItems = $allDoneItems | Sort-Object { 
    if ($_.ClosedAt) { [DateTime]$_.ClosedAt } else { [DateTime]$_.UpdatedAt }
} -Descending

$itemsToKeep = $sortedItems | Select-Object -First $KeepRecent
$itemsToArchive = $sortedItems | Select-Object -Skip $KeepRecent

Write-Host "`nKeeping $($itemsToKeep.Count) recent items:" -ForegroundColor Green
$itemsToKeep | Select-Object -First 5 | ForEach-Object {
    Write-Host "  #$($_.Number): $($_.Title.Substring(0, [Math]::Min(50, $_.Title.Length)))..." -ForegroundColor Gray
}
if ($itemsToKeep.Count -gt 5) {
    Write-Host "  ... and $($itemsToKeep.Count - 5) more" -ForegroundColor Gray
}

Write-Host "`nArchiving $($itemsToArchive.Count) older items:" -ForegroundColor Yellow
$itemsToArchive | Select-Object -First 5 | ForEach-Object {
    Write-Host "  #$($_.Number): $($_.Title.Substring(0, [Math]::Min(50, $_.Title.Length)))..." -ForegroundColor Gray
}
if ($itemsToArchive.Count -gt 5) {
    Write-Host "  ... and $($itemsToArchive.Count - 5) more" -ForegroundColor Gray
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would archive $($itemsToArchive.Count) items" -ForegroundColor Yellow
    exit 0
}

# Archive the old items
$archived = 0
$failed = 0

foreach ($item in $itemsToArchive) {
    $mutation = @"
mutation {
  archiveProjectV2Item(input: {projectId: "$projectId", itemId: "$($item.Id)"}) {
    item { id }
  }
}
"@
    
    try {
        $result = gh api graphql -f query=$mutation 2>&1
        if ($result -match "error") {
            $failed++
            Write-Host "  ❌ Failed: #$($item.Number)" -ForegroundColor Red
        } else {
            $archived++
        }
    } catch {
        $failed++
    }
    
    # Rate limit protection
    if ($archived % 20 -eq 0) {
        Start-Sleep -Milliseconds 500
    }
}

Write-Host "`n✅ Archived: $archived items" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "❌ Failed: $failed items" -ForegroundColor Red
}

Write-Host "`nDone items remaining on board: $KeepRecent (most recent)" -ForegroundColor Cyan
