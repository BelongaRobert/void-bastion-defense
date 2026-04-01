# SKILL.md - Enhanced Skills System

> Advanced skill management with frontmatter-based definitions, multi-source loading, and feature flags.
> Use when: creating skills with frontmatter, managing skill sources, or working with feature-flagged capabilities.

## Overview

This skill provides an enhanced skill system for OpenClaw that supports:
- Frontmatter-based skill definitions in `.md` files
- Multiple skill sources (user, project, bundled)
- Automatic skill discovery and registration
- Feature flags for conditional loading
- Token estimation for performance

## Skill Sources (Priority Order)

Skills are loaded from multiple sources in this order (later sources override earlier):

1. **Bundled Skills** - `~/.openclaw/workspace/skills/`
   - Skills that ship with OpenClaw
   - Core functionality

2. **User Skills** - `~/.openclaw/skills/`
   - User-created skills
   - Personal customizations

3. **Project Skills** - `~/.openclaw/workspace/.openclaw/skills/`
   - Project-specific skills
   - Local overrides

## Frontmatter Format

Skills are defined in `.md` files with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does
whenToUse: When to invoke this skill
version: 1.0.0
features:
  - MY_FEATURE_FLAG
enabled: true
tokens: auto  # or specific number
---

# My Skill

Skill content here...
```

## Tools

### registerSkill

Register a skill with the enhanced system.

**Parameters:**
- `name` (string): Unique skill name
- `source` (enum): 'bundled' | 'user' | 'project'
- `frontmatter` (object): Parsed frontmatter data
- `content` (string): Skill content

**Example:**
```javascript
registerSkill({
  name: 'my-skill',
  source: 'user',
  frontmatter: {
    description: 'My custom skill',
    whenToUse: 'When you need X',
    features: ['ADVANCED_MODE']
  },
  content: '# My Skill\n\nContent here...'
})
```

### parseFrontmatter

Parse YAML frontmatter from skill file.

**Parameters:**
- `filePath` (string): Path to skill file

**Returns:**
- `data` (object): Parsed frontmatter
- `content` (string): Content after frontmatter

**Example:**
```javascript
const { data, content } = parseFrontmatter('~/.openclaw/skills/my-skill/skill.md')
```

### estimateTokens

Estimate token count for skill content.

**Parameters:**
- `content` (string): Content to estimate

**Returns:**
- `tokens` (number): Estimated token count

**Example:**
```javascript
const tokens = estimateTokens(skillContent)
```

### loadSkillsFromDir

Load all skills from a directory.

**Parameters:**
- `dir` (string): Directory path
- `options` (object): { recursive: boolean, featureFlags: string[] }

**Returns:**
- `skills` (array): Array of loaded skills

**Example:**
```javascript
const skills = loadSkillsFromDir('~/.openclaw/skills', {
  recursive: true,
  featureFlags: ['BETA_FEATURES']
})
```

### isFeatureEnabled

Check if a feature flag is enabled.

**Parameters:**
- `flag` (string): Feature flag name

**Returns:**
- `enabled` (boolean): Whether flag is enabled

**Example:**
```javascript
if (isFeatureEnabled('ADVANCED_MODE')) {
  // Load advanced features
}
```

## Behaviors

### autoDiscoverSkills

Automatically discover and load skills from all sources.

**Trigger:** On startup or when skills change
**Action:** 
1. Scan all skill directories
2. Parse frontmatter from skill files
3. Register valid skills
4. Filter by feature flags

### handleSkillHotReload

Watch skill directories for changes and reload.

**Trigger:** File change detected in skill directory
**Action:**
1. Parse changed file
2. Validate frontmatter
3. Update skill registration
4. Log changes

## Configuration

### Feature Flags

Enable features in `~/.openclaw/config.json`:

```json
{
  "features": {
    "ADVANCED_SKILLS": true,
    "BETA_FEATURES": false,
    "EXPERIMENTAL_AI": false
  }
}
```

### Skill Directories

Configure additional skill directories:

```json
{
  "skillPaths": [
    "~/custom-skills",
    "./project-skills"
  ]
}
```

## Creating Skills

### Step 1: Create Skill File

```bash
mkdir -p ~/.openclaw/skills/my-enhanced-skill
cat > ~/.openclaw/skills/my-enhanced-skill/skill.md << 'EOF'
---
name: my-enhanced-skill
description: Description of what this skill does
whenToUse: When to use this skill
version: 1.0.0
features: []
enabled: true
---

# My Enhanced Skill

Skill content with enhanced capabilities...
EOF
```

### Step 2: Skill is Auto-Discovered

Skills with `.md` extension in skill directories are automatically:
- Parsed for frontmatter
- Registered on startup
- Hot-reloaded on changes

### Step 3: Use the Skill

Skills work normally through OpenClaw's skill system.

## Examples

### Example 1: Feature-Flagged Skill

```markdown
---
name: advanced-search
description: Advanced web search with filters
whenToUse: When you need filtered search results
features:
  - ADVANCED_SEARCH
enabled: true
---

# Advanced Search

This skill provides advanced search capabilities...
```

### Example 2: User Preference Skill

```markdown
---
name: my-preferences
description: Personal preferences for DaSage
whenToUse: Always load as context
enabled: true
tokens: 50
---

# My Preferences

- I prefer concise responses
- Always explain trade-offs
- Run tests before committing
```

### Example 3: Project-Specific Skill

```markdown
---
name: cacao-conventions
description: Code conventions for cacao-farm project
whenToUse: When working on cacao-farm
enabled: true
---

# Cacao Farm Conventions

- Use TypeScript for all new files
- Prefer functional components
- Dark mode is default
```

## Migration from SKILL.md

Old skills in `SKILL.md` format continue to work. To migrate:

1. Rename to `.md` extension
2. Add frontmatter block at top
3. Move description to frontmatter
4. Keep existing content

**Before:**
```markdown
# SKILL.md - my-skill

> Description here
> Use when: triggers
```

**After:**
```markdown
---
name: my-skill
description: Description here
whenToUse: triggers
---

# My Skill

Content here...
```

## Performance

### Token Estimation

Skills are automatically token-estimated for:
- Budget management
- Loading priority
- Performance monitoring

### Lazy Loading

Skills can be lazy-loaded:
```yaml
---
lazy: true
---
```

Loaded only when first invoked.

## Troubleshooting

### Skill not loading?
- Check `.md` extension
- Validate YAML frontmatter
- Check feature flags
- Verify skill directory in config

### Frontmatter errors?
- Use valid YAML syntax
- Quote strings with special characters
- No trailing colons without values

### Feature flags not working?
- Check config.json format
- Ensure flag names match exactly
- Restart OpenClaw after config changes

## References

- [SKILL.md Spec](SKILL.md) - Standard skill format
- [ClawHub](https://clawhub.ai) - Skill registry
