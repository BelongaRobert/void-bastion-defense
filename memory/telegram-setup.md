# Telegram Setup Notes

**Bot:** @DaSageClawBot  
**Token:** 8789992079:AAFsCvDBTz53VAizLypOKwp6wLmSwIgL4Nw

## Working Config (openclaw.json)

```json
"telegram": {
  "enabled": true,
  "dmPolicy": "open",
  "botToken": "8789992079:AAFsCvDBTz53VAizLypOKwp6wLmSwIgL4Nw",
  "allowFrom": ["*"],
  "groupPolicy": "allowlist",
  "streaming": "partial"
}
```

## Key Points
- Group Privacy must be OFF in BotFather settings
- dmPolicy: "open" required for DMs to work without pairing
- allowFrom: ["*"] required when dmPolicy is "open"
- Sessions are separate per channel (TUI ≠ Telegram)

## Usage
- DMs work for quick access
- Main development work stays in TUI for better context continuity
