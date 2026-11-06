# Security Rules

## Never do

- Never commit secrets, tokens, or credentials.
- Never print secrets to logs.
- Never disable validation just to satisfy a demo flow.
- Never trust user input without explicit validation.

## Always do

- Prefer environment variables for secrets.
- Document sensitive integrations and required scopes.
- Review auth, validation, file upload, and external request paths carefully.
- Flag any uncertainty involving privacy, authorization, or data exposure.
