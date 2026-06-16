import {
  Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res, Query, Param, Delete, Patch,
  UnauthorizedException, BadRequestException, Redirect,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { RecoveryCodesService } from '../recovery/recovery-codes.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, OptionalAuthGuard } from './guards/auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUserResponse } from './dto/auth.dto';
import { ENV } from '../config/env';
import { LinkTokenStore } from './link-token-store';
import {
  RegisterDtoSchema, LoginDtoSchema, RefreshDtoSchema, LogoutDtoSchema,
  EnableTotpDtoSchema, DisableTotpDtoSchema, VerifyTotpDtoSchema,
  Send2faEmailOtpSchema,
  RequestPasswordResetDtoSchema, ResetPasswordDtoSchema,
  DeleteAccountDtoSchema, RestoreAccountDtoSchema, SendRestoreOtpDtoSchema, ConfirmRestoreOtpDtoSchema,
  RevokeSessionDtoSchema, VerifyEmailDtoSchema, ResendVerificationDtoSchema,
  UpdatePasskeyNameDtoSchema, DeletePasskeyDtoSchema,
  UseRecoveryCodeDtoSchema,
  SetPasswordDtoSchema,
  EmailChangeRequestSchema, EmailChangeConfirmSchema,
} from './dto/auth.dto';
import {
  PasskeyRegisterBeginSchema, PasskeyRegisterCompleteSchema,
  PasskeySignupBeginSchema, PasskeySignupCompleteSchema,
  PasskeyLoginBeginSchema, PasskeyLoginCompleteSchema,
} from './dto/passkey.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passkeyService: PasskeyService,
    private readonly twoFactorService: TwoFactorService,
    private readonly passwordResetService: PasswordResetService,
    private readonly recoveryCodesService: RecoveryCodesService,
    private readonly auditService: AuditService,
    private readonly linkTokenStore: LinkTokenStore,
  ) {}

  // ─── Email + Password ──────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with email + password' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() body: unknown) {
    const dto = RegisterDtoSchema.parse(body);
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with OTP and receive tokens' })
  async verifyEmail(@Body() body: unknown) {
    const dto = VerifyEmailDtoSchema.parse(body);
    return this.authService.verifyEmail(dto.otp);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  async resendVerification(@Body() body: unknown) {
    const dto = ResendVerificationDtoSchema.parse(body);
    await this.authService.resendVerification(dto.email);
    return { message: 'Verification email sent' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password (optional TOTP)' })
  @ApiResponse({ status: 200, description: 'Returns token pair' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const dto = LoginDtoSchema.parse(body);
    const result = await this.authService.login(dto, req.ip, req.headers['user-agent']);
    this.authService.cookieService.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token (rotation-based)' })
  async refresh(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const dto = RefreshDtoSchema.parse(body);
    const tokenPair = await this.authService.refresh(dto.refreshToken);
    this.authService.cookieService.setRefreshCookie(res, tokenPair.refreshToken);
    return tokenPair;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — revoke all sessions' })
  async logout(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = LogoutDtoSchema.parse(body);
    await this.authService.logout(dto.refreshToken);
    this.authService.cookieService.clearRefreshCookie(res);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: AuthUserResponse) {
    return this.authService.getUserById(user.id);
  }

  // ─── Password Reset ────────────────────────────────────────────────

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async requestPasswordReset(@Body() body: unknown) {
    const dto = RequestPasswordResetDtoSchema.parse(body);
    await this.passwordResetService.requestReset(dto.email);
    return { message: 'OTP sent to your email' };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() body: unknown) {
    const dto = ResetPasswordDtoSchema.parse(body);
    await this.passwordResetService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset' };
  }

  // ─── Change Password (authenticated) ───────────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password (requires current password)' })
  async changePassword(@CurrentUser() user: AuthUserResponse, @Body() body: { currentPassword: string; newPassword: string }) {
    await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
    return { message: 'Password changed' };
  }

  // ─── 2FA / TOTP ────────────────────────────────────────────────────

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate TOTP secret and QR code' })
  async generateTotpSecret(@CurrentUser() user: AuthUserResponse) {
    return this.twoFactorService.generateSecret(user.id, user.email);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable TOTP 2FA (verify with token)' })
  async enableTotp(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = EnableTotpDtoSchema.parse(body);
    await this.twoFactorService.enable(user.id, dto.token);
    return { message: '2FA enabled' };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable TOTP 2FA (verify with token)' })
  async disableTotp(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = DisableTotpDtoSchema.parse(body);
    await this.twoFactorService.disable(user.id, dto.token);
    return { message: '2FA disabled' };
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get TOTP 2FA status' })
  async get2faStatus(@CurrentUser() user: AuthUserResponse) {
    return this.twoFactorService.getStatus(user.id);
  }

  // ─── 2FA Email OTP Backup ─────────────────────────────────────────

  @Post('2fa/send-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a 2FA backup code via email (unauthenticated)' })
  async sendTwoFactorEmailOtp(@Body() body: unknown) {
    const dto = Send2faEmailOtpSchema.parse(body);
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.totpEnabled) throw new BadRequestException('2FA is not enabled on this account');
    await this.twoFactorService.sendEmailOtp(user.id, user.email);
    return { message: '2FA code sent to your email' };
  }

  // ─── Recovery Codes ────────────────────────────────────────────────

  @Post('recovery-codes/generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate new recovery codes (invalidates old ones)' })
  async generateRecoveryCodes(@CurrentUser() user: AuthUserResponse) {
    const codes = await this.recoveryCodesService.generate(user.id);
    return { codes, message: 'Save these codes securely. They will not be shown again.' };
  }

  @Post('recovery-codes/use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + recovery code' })
  async useRecoveryCode(@Body() body: unknown, @Req() req: Request) {
    const dto = UseRecoveryCodeDtoSchema.parse(body);
    const user = await this.authService['prisma'].user.findUnique({ where: { email: dto.email } });
    if (!user) throw new (require('@nestjs/common').UnauthorizedException)('Invalid recovery code');

    const valid = await this.recoveryCodesService.use(user.id, dto.code);
    if (!valid) throw new (require('@nestjs/common').UnauthorizedException)('Invalid recovery code');

    await this.authService['loginRateLimitService'].clearLockout(dto.email);
    await this.auditService.log({
      userId: user.id, action: 'user.login', entity: 'user', entityId: user.id,
      ip: req.ip, metadata: { method: 'recovery_code' },
    });

    const tokens = await this.authService.createTokenPair(user.id);
    return { user: this.authService.mapUser(user), tokens };
  }

  // ─── Sessions ──────────────────────────────────────────────────────

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all active sessions' })
  async listSessions(@CurrentUser() user: AuthUserResponse, @Req() req: Request) {
    return this.authService.listSessions(user.id, req.headers['x-session-id'] as string);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: AuthUserResponse, @Param('sessionId') sessionId: string) {
    await this.authService.revokeSession(user.id, sessionId);
  }

  // ─── Account Deletion ──────────────────────────────────────────────

  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete account with 30-day restore window' })
  async deleteAccount(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = DeleteAccountDtoSchema.parse(body);
    await this.authService.deleteAccount(user.id, dto.password);
    return { message: 'Account scheduled for deletion. You have 30 days to restore it.' };
  }

  @Post('restore-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted account within 30-day window' })
  async restoreAccount(@Body() body: unknown) {
    const dto = RestoreAccountDtoSchema.parse(body);
    return this.authService.restoreAccount(dto.email, dto.password);
  }

  @Post('restore-account/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email for account restoration' })
  async sendRestoreOtp(@Body() body: unknown) {
    const dto = SendRestoreOtpDtoSchema.parse(body);
    await this.authService.sendRestoreOtp(dto.email);
    return { message: 'OTP sent to your email' };
  }

  @Post('restore-account/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm restore OTP and restore account' })
  async confirmRestoreOtp(@Body() body: unknown) {
    const dto = ConfirmRestoreOtpDtoSchema.parse(body);
    const result = await this.authService.confirmRestoreOtp(dto.email, dto.otp);
    return result;
  }

  // ─── Google OAuth ──────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth sign in / sign up' })
  googleAuth() {
    // Guard redirects to Google consent screen
  }

  @Get('google/authorize')
  @Redirect()
  @ApiOperation({ summary: 'Initiate Google OAuth link from settings (authenticated)' })
  async googleAuthorize(@Query('linkToken') linkToken: string) {
    if (!linkToken) throw new BadRequestException('Missing link token');
    const userId = this.linkTokenStore.peek(linkToken);
    if (!userId) throw new BadRequestException('Invalid or expired link token');

    const googleAuthUrl = `${ENV.BASE_URL}/${ENV.API_PREFIX}/auth/google?state=${linkToken}`;
    return { url: googleAuthUrl, statusCode: HttpStatus.FOUND };
  }

  @Post('google/link-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a link token to connect Google (authenticated)' })
  getGoogleLinkToken(@CurrentUser() user: AuthUserResponse) {
    const token = this.linkTokenStore.create(user.id);
    return { linkToken: token };
  }

  @Post('google/disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disconnect Google account from your profile' })
  async disconnectGoogle(@CurrentUser() user: AuthUserResponse) {
    await this.authService.disconnectGoogle(user.id);
    return { message: 'Google account disconnected' };
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as any).user;
    if (!user) {
      const errUrl = new URL('/auth/callback', ENV.WEBAPP_URL);
      errUrl.searchParams.set('error', 'Google authentication failed');
      return res.redirect(HttpStatus.FOUND, errUrl.toString());
    }

    const tokens = await this.authService.createTokenPair(user.id);
    this.authService.cookieService.setRefreshCookie(res, tokens.refreshToken);

    const redirectUrl = new URL('/auth/callback', ENV.WEBAPP_URL);
    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    redirectUrl.searchParams.set('email', user.email);

    // Detect new signup: user created within last 10 seconds
    const isNew = user.createdAt && Date.now() - new Date(user.createdAt).getTime() < 10000;
    if (isNew) redirectUrl.searchParams.set('newUser', 'true');

    return res.redirect(HttpStatus.FOUND, redirectUrl.toString());
  }

  // ─── Set Password (for OAuth / passkey-only users) ─────────────────

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set a password for OAuth-only accounts' })
  async setPassword(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = SetPasswordDtoSchema.parse(body);
    await this.authService.setPassword(user.id, dto.newPassword);
    return { message: 'Password set successfully' };
  }

  // ─── Email Change with OTP ─────────────────────────────────────────

  @Post('email/change-request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Request email change — sends 6-digit OTP to new email' })
  async requestEmailChange(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = EmailChangeRequestSchema.parse(body);
    await this.authService.requestEmailChange(user.id, dto.newEmail);
    return { message: 'OTP sent to your new email' };
  }

  @Post('email/change-confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirm email change with OTP' })
  async confirmEmailChange(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = EmailChangeConfirmSchema.parse(body);
    await this.authService.confirmEmailChange(user.id, dto.otp, dto.newEmail);
    return { message: 'Email changed successfully' };
  }

  // ─── Passkey ───────────────────────────────────────────────────────

  @Post('passkey/register/begin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate passkey registration options (requires auth)' })
  async passkeyRegisterBegin(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = PasskeyRegisterBeginSchema.parse(body);
    return this.passkeyService.generateRegistrationOptions(user.id, dto.displayName);
  }

  @Post('passkey/register/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Complete passkey registration (requires auth)' })
  async passkeyRegisterComplete(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = PasskeyRegisterCompleteSchema.parse(body);
    return this.passkeyService.verifyRegistration(user.id, dto.challengeId, dto.credential as any, dto.name);
  }

  @Post('passkey/signup/begin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate passkey registration options for new users (no auth)' })
  async passkeySignupBegin(@Body() body: unknown) {
    const dto = PasskeySignupBeginSchema.parse(body);
    return this.passkeyService.generateSignupOptions(dto.displayName);
  }

  @Post('passkey/signup/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete passkey signup — creates user and returns token pair' })
  async passkeySignupComplete(@Body() body: unknown) {
    const dto = PasskeySignupCompleteSchema.parse(body);
    return this.passkeyService.verifySignup(dto.challengeId, dto.credential as any, dto.name);
  }

  @Post('passkey/login/begin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate passkey login options' })
  async passkeyLoginBegin(@Body() body: unknown) {
    const dto = PasskeyLoginBeginSchema.parse(body);
    return this.passkeyService.generateAuthenticationOptions(dto.email);
  }

  @Post('passkey/login/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete passkey login — returns token pair' })
  async passkeyLoginComplete(@Body() body: unknown, @Req() req: Request) {
    const dto = PasskeyLoginCompleteSchema.parse(body);
    const result = await this.passkeyService.verifyAuthentication(dto.challengeId, dto.credential as any);
    await this.auditService.log({
      userId: result.user.id, action: 'user.login', entity: 'user', entityId: result.user.id,
      ip: req.ip, metadata: { method: 'passkey' },
    });
    return result;
  }

  // ─── Passkey Management ────────────────────────────────────────────

  @Get('passkeys')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all passkeys for current user' })
  async listPasskeys(@CurrentUser() user: AuthUserResponse) {
    return this.passkeyService.listPasskeys(user.id);
  }

  @Patch('passkeys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update passkey nickname' })
  async updatePasskeyName(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = UpdatePasskeyNameDtoSchema.parse(body);
    return this.passkeyService.updatePasskeyName(user.id, dto.passkeyId, dto.name);
  }

  @Delete('passkeys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a passkey' })
  async deletePasskey(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = DeletePasskeyDtoSchema.parse(body);
    await this.passkeyService.deletePasskey(user.id, dto.passkeyId);
  }

  // ─── Audit Log ─────────────────────────────────────────────────────

  @Get('audit-log')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get audit log for current user' })
  async getAuditLog(@CurrentUser() user: AuthUserResponse) {
    return this.auditService.findByUser(user.id);
  }
}
