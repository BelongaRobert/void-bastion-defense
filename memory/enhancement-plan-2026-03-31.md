# DaSage Enhancement Plan - 2026-03-31

## Phase 1: Enhanced Skill System

### 1.1 Frontmatter-Based Skill Definitions
- Skills defined in `.md` files with YAML frontmatter
- Auto-discovery from multiple sources
- Token estimation for performance

### 1.2 Skill Registration System
- `registerSkill()` function with metadata
- Bundled vs dynamic skills
- Feature flag support

### 1.3 Multi-Source Skill Loading
- `~/.openclaw/skills/` (user skills)
- `~/.openclaw/workspace/skills/` (project skills)
- `~/.openclaw/workspace/.openclaw/skills/` (project-local)

## Phase 2: Memory Layer System

### 2.1 Memory Layers
- `MEMORY.md` - Project conventions (like CLAUDE.md)
- `MEMORY.local.md` - Personal preferences
- `memory/YYYY-MM-DD.md` - Daily working notes

### 2.2 Memory Review Skill
- Automated classification of entries
- Duplicate detection
- Promotion suggestions

## Phase 3: Feature Flags

### 3.1 Config-Based Flags
- `features:` section in config
- Conditional skill loading
- A/B testing capability

## Implementation Order:
1. Skill registration system
2. Frontmatter parser
3. Multi-source loader
4. Memory layers
5. Memory review skill
6. Feature flags
