import { Module } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
