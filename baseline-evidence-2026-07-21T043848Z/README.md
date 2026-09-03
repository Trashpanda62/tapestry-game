# Tapestry Acres Obscura Redesign — S0 Task 1 Baseline Evidence

Recorded at `2026-07-21T04:38:48.829Z` (UTC), before creating the Tapestry branch or the isolated Webstudio worktree.

The repository snapshots in this directory were collected with the following PowerShell command:

```powershell
$repos = @('C:\dev\tapestry-game','C:\dev\webstudio','C:\dev\tapestry-herd','C:\dev\tapestry-area-map'); foreach ($repo in $repos) { Write-Output "=== $repo ==="; if (Test-Path -LiteralPath $repo) { $resolved = (Resolve-Path -LiteralPath $repo).Path; Write-Output "ABSOLUTE_PATH=$resolved"; if (Test-Path -LiteralPath (Join-Path $repo '.git')) { git -C $repo rev-parse --is-inside-work-tree; Write-Output 'HEAD:'; git -C $repo rev-parse HEAD; Write-Output 'BRANCH:'; git -C $repo branch --show-current; Write-Output 'PORCELAIN:'; git -C $repo status --porcelain=v1 --untracked-files=all; Write-Output 'WORKTREES:'; git -C $repo worktree list --porcelain } else { Write-Output 'NO_REPO' } } else { Write-Output 'PATH_MISSING' } }
```

The branch/worktree preflight was collected with:

```powershell
git -C C:\dev\tapestry-game show-ref --verify --quiet refs/heads/codex/tapestry-obscura-redesign
Test-Path -LiteralPath C:\dev\webstudio-tapestry-obscura-redesign
git -C C:\dev\webstudio show-ref --verify --quiet refs/heads/codex/tapestry-obscura-redesign
```

All snapshot files are append-free baseline records; they are not regenerated after setup actions.
