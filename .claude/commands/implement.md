Read CLAUDE.md and selected task.

Implement only the requested task.
Do not modify unrelated files.
Keep code production ready.
✅ How to use in Claude extension

Inside Claude VS Code extension, use prompts like:

Read CLAUDE.md and specs/auth-feature.md
Implement task 1 only

This gives almost the same token-saving workflow as Spec Kit.

🚀 Best token-saving workflow

Use this exact cycle:

1. create spec in specs/
2. ask Claude for plan
3. start new chat
4. ask Claude for task 1 only
5. new chat for task 2

This saves a lot of tokens.