import { z } from 'zod';

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(8000),
  clientNonce: z.string().uuid().optional(),
});
export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export const CreateConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(20),
  jobId: z.string().uuid().optional(),
  title: z.string().max(120).optional(),
});
export type CreateConversationDto = z.infer<typeof CreateConversationSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string(),
  createdAt: z.string().datetime(),
  readBy: z.array(z.string().uuid()),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
