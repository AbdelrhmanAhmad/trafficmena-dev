# js-compound-engineering Settings

## Review Agents

review_agents:
- js-kieran-typescript-reviewer
- js-kieran-nodejs-reviewer
- js-modern-nodejs-reviewer
- js-code-simplicity-reviewer
- js-security-sentinel
- js-performance-oracle
- js-julik-frontend-races-reviewer

## Notes

- Edit this file to change which agents run during `/js-workflows:review`
- The agents `js-agent-native-reviewer` and `js-learnings-researcher` always run regardless of this setting
- Conditional agents (schema-drift-detector, data-migration-expert, deployment-verification-agent) run based on PR file patterns
- Re-run `/js-compound-engineering:js-setup` to reconfigure interactively
