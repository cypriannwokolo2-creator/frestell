import { Module } from '@nestjs/common';
import { TwoFactorService } from './twofactor.service';
import { TwoFactorOtpStore } from './two-factor-otp-store';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [TwoFactorService, TwoFactorOtpStore],
  exports: [TwoFactorService, TwoFactorOtpStore],
})
export class TwoFactorModule {}
