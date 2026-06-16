import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res,
  HttpCode, HttpStatus, BadRequestException, ForbiddenException,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserResponse } from '../auth/dto/auth.dto';
import { JobsService } from './jobs.service';
import {
  CreateJobDtoSchema, UpdateJobDtoSchema,
  CreateProposalDtoSchema, UpdateProposalStatusDtoSchema,
} from './dto/jobs.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── Categories ─────────────────────────────────────────

  @Get('categories/tree')
  @ApiOperation({ summary: 'Get job category tree' })
  async getCategoryTree() {
    return this.jobsService.getCategoryTree();
  }

  @Get('categories')
  @ApiOperation({ summary: 'List job categories (optional ?parentId=)' })
  async getCategories(@Query('parentId') parentId?: string) {
    return this.jobsService.getCategories(parentId);
  }

  // ─── Create Job ─────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new job (draft)' })
  async createJob(@CurrentUser() user: AuthUserResponse, @Body() body: unknown) {
    const dto = CreateJobDtoSchema.parse(body);
    return this.jobsService.createJob(user.id, dto);
  }

  // ─── Publish Job ────────────────────────────────────────

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish a draft job' })
  async publishJob(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    return this.jobsService.publishJob(user.id, id);
  }

  // ─── List Open Jobs ─────────────────────────────────────

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'List open jobs (for freelancers)' })
  async listActiveJobs() {
    return this.jobsService.listActiveJobs();
  }

  // ─── List My Jobs ───────────────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my posted jobs (for clients)' })
  async listMyJobs(@CurrentUser() user: AuthUserResponse) {
    return this.jobsService.listMyJobs(user.id);
  }

  // ─── List My Proposals ──────────────────────────────────

  @Get('proposals/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my submitted proposals (for freelancers)' })
  async listMyProposals(@CurrentUser() user: AuthUserResponse) {
    return this.jobsService.listMyProposals(user.id);
  }

  // ─── Get Single Job ─────────────────────────────────────

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get job details' })
  async getJob(@CurrentUser() user: AuthUserResponse | undefined, @Param('id') id: string) {
    return this.jobsService.getJob(id, user?.id);
  }

  // ─── Update Job ─────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a job' })
  async updateJob(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateJobDtoSchema.parse(body);
    return this.jobsService.updateJob(user.id, id, dto);
  }

  // ─── Delete / Cancel Job ────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete draft or cancel open job' })
  async deleteJob(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.jobsService.deleteJob(user.id, id);
  }

  // ─── Analytics ───────────────────────────────────────────

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get job analytics (views, applications, conversion)' })
  async getJobAnalytics(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    return this.jobsService.getJobAnalytics(user.id, id);
  }

  // ─── Pause / Resume Job ─────────────────────────────────

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Pause job — stop receiving new applications' })
  async pauseJob(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.jobsService.pauseJob(user.id, id);
  }

  @Post(':id/resume')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resume job — re-open for applications' })
  async resumeJob(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    await this.jobsService.resumeJob(user.id, id);
  }

  // ─── Duplicate Job ──────────────────────────────────────

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Duplicate a job as a new draft' })
  async duplicateJob(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    return this.jobsService.duplicateJob(user.id, id);
  }

  // ─── Submit Proposal ────────────────────────────────────

  @Post(':id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a proposal (freelancer)' })
  async submitProposal(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = CreateProposalDtoSchema.parse(body);
    return this.jobsService.submitProposal(user.id, id, dto);
  }

  // ─── List Proposals for a Job ───────────────────────────

  @Get(':id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List proposals for a job (job owner)' })
  async listProposals(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
  ) {
    return this.jobsService.listProposals(id, user.id);
  }

  // ─── Update Proposal Status ─────────────────────────────

  @Patch(':id/proposals/:proposalId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Shortlist / reject / accept a proposal' })
  async updateProposalStatus(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateProposalStatusDtoSchema.parse(body);
    return this.jobsService.updateProposalStatus(id, proposalId, user.id, dto);
  }

  // ─── Withdraw Proposal ──────────────────────────────────

  @Post('proposals/:proposalId/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Withdraw a submitted proposal (freelancer)' })
  async withdrawProposal(
    @CurrentUser() user: AuthUserResponse,
    @Param('proposalId') proposalId: string,
  ) {
    return this.jobsService.withdrawProposal(user.id, proposalId);
  }

  // ─── File Attachments ───────────────────────────────────

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file attachment (max 20MB)' })
  async uploadAttachment(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.jobsService.uploadAttachment(user.id, id, file);
  }

  @Get(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List attachments for a job' })
  async listAttachments(@CurrentUser() user: AuthUserResponse, @Param('id') id: string) {
    return this.jobsService.listAttachments(id, user.id);
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an attachment' })
  async deleteAttachment(
    @CurrentUser() user: AuthUserResponse,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.jobsService.deleteAttachment(user.id, id, attachmentId);
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Download an attachment' })
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.jobsService.downloadAttachment(attachmentId);
    return result;
  }
}
