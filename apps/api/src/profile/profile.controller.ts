import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards,
  HttpCode, HttpStatus, BadRequestException, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserResponse } from '../auth/dto/auth.dto';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDtoSchema, PortfolioItemDtoSchema, ServiceOfferingDtoSchema,
  SocialLinkDtoSchema, UserSkillDtoSchema, UpdateSlugDtoSchema,
} from './dto/profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ─── Own Profile ─────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get own profile' })
  async getMyProfile(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.getMyProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = UpdateProfileDtoSchema.parse(body);
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('me/slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update profile slug (username)' })
  async updateSlug(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = UpdateSlugDtoSchema.parse(body);
    return this.profileService.updateSlug(user.id, dto);
  }

  @Get('slug/check/:slug')
  @ApiOperation({ summary: 'Check if slug is available' })
  async checkSlug(@Param('slug') slug: string) {
    return this.profileService.checkSlugAvailable(slug);
  }

  // ─── Public Profile ──────────────────────────────────

  @Get(':slug')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get public profile by slug' })
  async getPublicProfile(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUserResponse | null,
    @Req() req: any,
  ) {
    const profile = await this.profileService.getPublicProfile(slug);
    // Track view asynchronously
    const viewerId = user?.id ?? undefined;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    this.profileService.trackProfileView(profile.id, viewerId, ip).catch(() => {});
    return profile;
  }

  // ─── Portfolio ───────────────────────────────────────

  @Get('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List portfolio items' })
  async listPortfolio(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.listPortfolio(user.id);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add portfolio item' })
  async addPortfolioItem(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = PortfolioItemDtoSchema.parse(body);
    return this.profileService.addPortfolioItem(user.id, dto);
  }

  @Patch('me/portfolio/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update portfolio item' })
  async updatePortfolioItem(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = PortfolioItemDtoSchema.parse(body);
    return this.profileService.updatePortfolioItem(user.id, id, dto);
  }

  @Delete('me/portfolio/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete portfolio item' })
  async deletePortfolioItem(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.profileService.deletePortfolioItem(user.id, id);
  }

  // ─── Services ────────────────────────────────────────

  @Get('me/services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List service offerings' })
  async listServices(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.listServices(user.id);
  }

  @Post('me/services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add service offering' })
  async addService(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = ServiceOfferingDtoSchema.parse(body);
    return this.profileService.addService(user.id, dto);
  }

  @Patch('me/services/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update service offering' })
  async updateService(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = ServiceOfferingDtoSchema.parse(body);
    return this.profileService.updateService(user.id, id, dto);
  }

  @Delete('me/services/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete service offering' })
  async deleteService(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.profileService.deleteService(user.id, id);
  }

  // ─── Skills ──────────────────────────────────────────

  @Get('skills')
  @ApiOperation({ summary: 'List all skills taxonomy (optional ?q= search)' })
  async getSkills(@Query('q') q?: string) {
    if (q) {
      return this.profileService.searchSkills(q);
    }
    return this.profileService.getSkills();
  }

  @Get('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my skills' })
  async getUserSkills(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.getUserSkills(user.id);
  }

  @Post('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a skill' })
  async addSkill(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = UserSkillDtoSchema.parse(body);
    return this.profileService.addSkill(user.id, dto.skillId);
  }

  @Delete('me/skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a skill' })
  async removeSkill(@CurrentUser() user: AuthUserResponse, @Param('skillId') skillId: string) {
    await this.profileService.removeSkill(user.id, skillId);
  }

  @Post('me/skills/:skillId/endorse')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Endorse a skill' })
  async endorseSkill(
    @CurrentUser() user: AuthUserResponse,
    @Param('skillId') skillId: string,
    @Body() body: { endorsedUserId: string },
  ) {
    await this.profileService.endorseSkill(body.endorsedUserId, skillId, user.id);
    return { message: 'Skill endorsed' };
  }

  // ─── Social Links ────────────────────────────────────

  @Get('me/social-links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List social links' })
  async listSocialLinks(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.listSocialLinks(user.id);
  }

  @Post('me/social-links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add or update social link' })
  async addSocialLink(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = SocialLinkDtoSchema.parse(body);
    return this.profileService.addSocialLink(user.id, dto);
  }

  @Delete('me/social-links/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete social link' })
  async deleteSocialLink(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.profileService.deleteSocialLink(user.id, id);
  }

  // ─── Availability / Visibility ───────────────────────

  @Patch('me/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update availability status' })
  async updateAvailability(
    @CurrentUser() user: AuthUserResponse,
    @Body() body: { status: string },
  ) {
    if (!['available', 'unavailable', 'hired'].includes(body.status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.profileService.updateAvailability(user.id, body.status);
  }

  @Patch('me/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update profile visibility' })
  async updateVisibility(
    @CurrentUser() user: AuthUserResponse,
    @Body() body: { visibility: string },
  ) {
    if (!['public', 'private', 'hidden'].includes(body.visibility)) {
      throw new BadRequestException('Invalid visibility');
    }
    return this.profileService.updateVisibility(user.id, body.visibility);
  }

  // ─── Completeness ────────────────────────────────────

  @Get('me/completeness')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get profile completeness score' })
  async getCompleteness(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.getCompleteness(user.id);
  }

  // ─── Views ───────────────────────────────────────────

  @Get('me/views')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get profile view analytics' })
  async getProfileViews(@CurrentUser() user: AuthUserResponse) {
    return this.profileService.getProfileViews(user.id);
  }

  // ─── Avatar Upload ───────────────────────────────────

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload profile avatar' })
  async uploadAvatar(@CurrentUser() user: AuthUserResponse, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.profileService.uploadAvatar(user.id, file);
  }
}
