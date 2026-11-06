import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { buildSeedData } from './seed-data';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd1';
const SERIAL_TABLES = ['users', 'projects', 'issues', 'sprints', 'comments', 'activities'] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production.');
  }

  const data = buildSeedData();

  const users = await Promise.all(
    data.users.map(async (user) => ({
      ...user,
      passwordHash: await argon2.hash(SEED_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
    })),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        'TRUNCATE TABLE activities, comments, sprint_issues, issue_links, bug_details, issues, sprints, project_members, projects, users RESTART IDENTITY CASCADE',
      );

      await tx.user.createMany({ data: users });
      await tx.project.createMany({ data: data.projects });
      await tx.projectMember.createMany({ data: data.projectMembers });
      await tx.sprint.createMany({ data: data.sprints });
      await tx.issue.createMany({ data: data.issues });
      await tx.bugDetail.createMany({ data: data.bugDetails });
      await tx.issueLink.createMany({ data: data.issueLinks });
      await tx.sprintIssue.createMany({ data: data.sprintIssues });
      await tx.comment.createMany({ data: data.comments });
      await tx.activity.createMany({ data: data.activities });

      for (const table of SERIAL_TABLES) {
        await tx.$queryRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${table}))`,
        );
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  const [userCount, projectCount, issueCount, sprintCount, activityCount] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.issue.count(),
    prisma.sprint.count(),
    prisma.activity.count(),
  ]);
  console.log(
    `Seeded ${userCount} users, ${projectCount} projects, ${sprintCount} sprints, ${issueCount} issues, ${activityCount} activity rows.`,
  );
  console.log(`Login with any seed email (e.g. admin@devtrack.local) and the password "${SEED_PASSWORD}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
