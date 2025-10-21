import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Database reset task
      on('task', {
        async resetDatabase() {
          const databaseUrl = config.env.DATABASE_URL;

          if (!databaseUrl || !databaseUrl.includes('test')) {
            throw new Error(
              'DATABASE_URL must contain "test" to prevent accidental production data deletion'
            );
          }

          try {
            console.log('Resetting test database...');

            // Reset database using Prisma
            await execAsync(
              `DATABASE_URL="${databaseUrl}" npx prisma migrate reset --force --skip-seed`,
              {
                cwd: __dirname,
              }
            );

            console.log('Database reset completed');
            return null;
          } catch (error) {
            console.error('Failed to reset database:', error);
            throw error;
          }
        },

        async seedDatabase() {
          const databaseUrl = config.env.DATABASE_URL;

          if (!databaseUrl || !databaseUrl.includes('test')) {
            throw new Error(
              'DATABASE_URL must contain "test" to prevent accidental production data seeding'
            );
          }

          try {
            console.log('Seeding test database...');

            // Run seed script
            await execAsync(
              `DATABASE_URL="${databaseUrl}" npm run db:seed-test`,
              {
                cwd: __dirname,
              }
            );

            console.log('Database seeding completed');
            return null;
          } catch (error) {
            console.error('Failed to seed database:', error);
            throw error;
          }
        },

        async resetAndSeedDatabase() {
          const databaseUrl = config.env.DATABASE_URL;

          if (!databaseUrl || !databaseUrl.includes('test')) {
            throw new Error(
              'DATABASE_URL must contain "test" to prevent accidental production data deletion'
            );
          }

          try {
            console.log('Resetting and seeding test database...');

            // Reset database using Prisma
            await execAsync(
              `DATABASE_URL="${databaseUrl}" npx prisma migrate reset --force --skip-seed`,
              {
                cwd: __dirname,
              }
            );

            // Run seed script
            await execAsync(
              `DATABASE_URL="${databaseUrl}" npm run db:seed-test`,
              {
                cwd: __dirname,
              }
            );

            console.log('Database reset and seeding completed');
            return null;
          } catch (error) {
            console.error('Failed to reset and seed database:', error);
            throw error;
          }
        },
      });

      return config;
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 1080,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
});
