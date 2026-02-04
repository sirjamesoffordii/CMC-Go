---
name: Profile Setup
description: VS Code profile setup for AEOS agents and model isolation.
---

# VS Code Profile Setup for AEOS Agents

VS Code profiles provide guaranteed model isolation for each agent. Each profile saves its own Copilot model selection independently.

## Step-by-Step: Create & Configure Profiles

### 1. Create Principal Engineer Profile

1. Click the **profile icon** (person icon) in bottom-left corner of VS Code
2. Click **"New Profile"**
3. Name it: `Principal Engineer`
4. Click **"Create"**
5. Select what to copy from Default (recommended: check all boxes)
6. VS Code reopens with the new profile

### 2. Set Model for Principal Engineer

1. Make sure you're on "Principal Engineer" profile (check bottom-left)
2. Open **Copilot Chat** (Ctrl+Shift+I or click chat icon)
3. In the chat input area, click the **model dropdown** (shows current model)
4. Select **"GPT-5.2"**
5. ✅ Done! This profile will always use GPT-5.2

### 3. Create Tech Lead Profile

1. Click the profile icon in bottom-left
2. Click **"New Profile"**
3. Name it: `Tech Lead`
4. Click **"Create"**
5. Select what to copy from Default
6. VS Code reopens with the Tech Lead profile

### 4. Set Model for Tech Lead

1. Make sure you're on "Tech Lead" profile
2. Open Copilot Chat
3. Click the model dropdown
4. Select **"GPT-5.2"**
5. ✅ Done! This profile will always use GPT-5.2

### 5. Create Software Engineer Profile

1. Click the profile icon in bottom-left
2. Click **"New Profile"**
3. Name it: `Software Engineer`
4. Click **"Create"**
5. Select what to copy from Default
6. VS Code reopens with the Software Engineer profile

### 6. Set Model for Software Engineer

1. Make sure you're on "Software Engineer" profile
2. Open Copilot Chat
3. Click the model dropdown
4. Select **"GPT-5.2"**
5. ✅ Done! This profile will always use GPT-5.2

## How to Verify Profile Setup

Check each profile has the correct model:

1. Click profile icon → Select "Principal Engineer"
2. Open Copilot Chat
3. Check model dropdown shows **"GPT-5.2"**
4. Repeat for other profiles

## Using Spawn Scripts

With isolated user-data-dirs, use `aeos-spawn.ps1`:

```powershell
# Spawn agents with auto-activation
.\scripts\aeos-spawn.ps1 -Agent PE
.\scripts\aeos-spawn.ps1 -Agent TL
.\scripts\aeos-spawn.ps1 -Agent SE

# Spawn all agents at once
.\scripts\aeos-spawn.ps1 -All
```

## Troubleshooting

**Q: The profile shows the wrong model**
A: You need to manually change the model in that profile's chat dropdown. Profile model selections are saved per-profile.

**Q: Can I change the model later?**
A: Yes! Just switch to that profile and select a different model from the chat dropdown.

**Q: Do I need to recreate profiles if I close VS Code?**
A: No! Profiles are permanent. Once created and configured, they persist forever.

**Q: What if I delete a profile?**
A: You'll need to recreate it and set the model again.

## Profile Names (Must Match Exactly)

The spawn script expects these exact profile names:

- `Principal Engineer`
- `Tech Lead`
- `Software Engineer`

These are configured in `scripts/aeos-spawn.ps1`.
