---
trigger: model_decision
description: Ensure seeders are always run within Docker
---

# Seeder Policy

Always run seeder commands inside docker compose using the `seed:docker:all` script from the root package.json.

This script executes:
`docker compose exec server bun run scripts/seed-all.ts`

It ensures that the seeder runs within the `server` container defined in `docker-compose.yml`, having access to the correct environment variables and network.

```bash
bun run seed:docker:all
```