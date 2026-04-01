---
name: system-status
description: Shows DaSage system status using all enhancement layers
whenToUse: When user asks about system status, capabilities, or enhancements
version: 1.0.0
features:
  - ENHANCED_SKILLS
  - MEMORY_LAYERS
  - FEATURE_FLAGS
enabled: true
tokens: auto
---

# System Status Skill

Shows comprehensive system status by integrating Enhanced Skills, Memory Layers, and Feature Flags.

## What This Demonstrates

This skill uses all three enhancement systems:
1. **Enhanced Skills** - Discovers and lists all loaded skills
2. **Memory Layers** - Shows memory statistics by layer
3. **Feature Flags** - Displays enabled/disabled features

## Output Format

```
🐙 DaSage System Status

=== User Context ===
Name: Robert
Timezone: America/New_York

=== Skills (Enhanced System) ===
Total: X skills loaded
- skill-creator (bundled)
- example-enhanced (user)
- memory-layers (bundled)
- feature-flags (bundled)
- system-status (bundled)

=== Memory Layers ===
Total: X entries
- Working: X entries (daily logs)
- Project: X entries (MEMORY.md)
- Personal: X entries (MEMORY.local.md)

=== Feature Flags ===
Enabled: X/Y
- ENHANCED_SKILLS: ✅
- MEMORY_LAYERS: ✅
- FEATURE_FLAGS: ✅
- AUTO_MEMORY_REVIEW: ❌

=== Integration Status ===
✅ Enhanced Skills: Active
✅ Memory Layers: Active
✅ Feature Flags: Active
✅ Core Integration: Wired

The Emperor protects! 🐙⚔️
```

## Tools

### getSystemStatus

Get comprehensive system status.

**Returns:**
- `user`: User context
- `skills`: Loaded skills with sources
- `memory`: Memory statistics by layer
- `features`: Feature flag states
- `integration`: Integration status

**Example:**
```typescript
const status = await getSystemStatus()
console.log(`Loaded ${status.skills.length} skills`)
console.log(`Memory: ${status.memory.total} entries`)
```

### showSkillsBreakdown

Show detailed skill breakdown.

**Returns:**
- Skills grouped by source
- Token estimates
- Feature requirements

### showMemoryBreakdown

Show memory layer breakdown.

**Returns:**
- Entries per layer
- Classification suggestions
- Duplicates found

### showFeatureStatus

Show feature flag status.

**Returns:**
- Enabled features
- Disabled features
- Required for current skills

## Behaviors

### autoReportStatus

Automatically report status on startup.

**Trigger:** After initialization
**Action:** Display system status if FEATURE_SHOW_STATUS is enabled

### reportEnhancementLevel

Report which enhancement systems are active.

**Levels:**
- **Basic:** Legacy system only
- **Enhanced:** Skills + Memory + Flags active
- **Full:** All systems + integration layer

## Configuration

### Feature Flags

```json
{
  "features": {
    "SYSTEM_STATUS_AUTO": false,
    "SYSTEM_STATUS_VERBOSE": false
  }
}
```

### Skills

This skill requires:
- `ENHANCED_SKILLS`: true
- `MEMORY_LAYERS`: true
- `FEATURE_FLAGS`: true

If any feature is disabled, skill shows degraded status.

## Examples

### Example 1: Full System Status

```
User: Show system status
Assistant: 
🐙 DaSage System Status

=== Skills ===
Total: 5 skills
- skill-creator (bundled)
- enhanced-skills (bundled)
- memory-layers (bundled)
- feature-flags (bundled)
- system-status (bundled)

=== Memory ===
Total: 23 entries
- Working: 18 entries
- Project: 3 entries
- Personal: 2 entries

=== Features ===
All enhancement systems: ✅ ACTIVE

The Emperor protects! 🐙⚔️
```

### Example 2: Degraded Mode

```
User: Show system status
Assistant:
🐙 DaSage System Status

⚠️ Running in legacy mode
- Enhanced Skills: ❌ (enable ENHANCED_SKILLS)
- Memory Layers: ❌ (enable MEMORY_LAYERS)
- Feature Flags: ❌ (enable FEATURE_FLAGS)

To activate enhancements:
1. Set flags in config.json
2. Restart DaSage
3. Run system status again
```

## Commands

### `/status`

Show system status (alias for skill invocation).

### `/status --verbose`

Show detailed status with all entries.

### `/status --skills`

Show only skills status.

### `/status --memory`

Show only memory status.

### `/status --features`

Show only feature flag status.

## Implementation

Uses the integration layer:
```typescript
import { getEnhancedContext, logSystemStatus } from '../.openclaw/core-integration'

const context = await getEnhancedContext()
logSystemStatus(context)
```
