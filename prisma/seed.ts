import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123456', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@nexus.local' },
    update: {},
    create: {
      email: 'demo@nexus.local',
      passwordHash,
      role: 'USER',
      profile: {
        create: {
          name: 'Demo Builder',
          headline: 'Senior Full-Stack Engineer',
          bio: 'Building the next generation of developer tools.',
          location: 'San Francisco, CA',
          yearsExperience: 5,
          targetRole: 'Lead Engineer'
        }
      }
    }
  });

  const skill = await prisma.skill.upsert({
    where: { userId_name: { userId: user.id, name: 'React' } },
    update: {},
    create: {
      userId: user.id,
      name: 'React',
      domain: 'Frontend',
      score: 85
    }
  });

  await prisma.roadmap.create({
    data: {
      userId: user.id,
      targetRole: 'Lead Engineer',
      items: {
        create: [
          { title: 'Master System Design', description: 'Design scalable distributed systems.', priority: 1 },
          { title: 'Lead a Major Project', description: 'Take ownership from conception to deployment.', priority: 2 }
        ]
      }
    }
  });

  console.log('Seed completed successfully. Demo user: demo@nexus.local / password123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
