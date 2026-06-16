import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.module';
import { SKILLS_TAXONOMY } from './skills.data';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule implements OnModuleInit {
  private readonly logger = new Logger(ProfileModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const existing = await this.prisma.skill.count();
      if (existing > 0) {
        this.logger.log(`Skills taxonomy already seeded (${existing} skills)`);
        return;
      }
      await this.prisma.skill.createMany({
        data: SKILLS_TAXONOMY,
        skipDuplicates: true,
      });
      this.logger.log(`Seeded ${SKILLS_TAXONOMY.length} skills`);
    } catch (err) {
      this.logger.warn('Could not seed skills (DB may not be ready yet)');
    }
  }
}
