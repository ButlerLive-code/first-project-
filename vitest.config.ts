import { defineConfig } from 'vitest/config'

// Pin the zone so date tests do not depend on the machine: far enough from
// UTC that a date-only string formatted in local time would shift a day.
process.env.TZ = 'America/Los_Angeles'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
