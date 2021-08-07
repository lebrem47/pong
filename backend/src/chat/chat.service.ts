import { Injectable } from '@nestjs/common';
import { CreateChatInput } from './dto/create-chat.input';
import { UpdateChatInput } from './dto/update-chat.input';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RequestUser } from 'src/common/auth/entities/request-user.entitiy';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(id: string) {
    return await this.prisma.user.findMany({
      where: {
        chats: {
          some: { id },
        },
      },
    });
  }

  async getAdmins(id: string) {
    return await this.prisma.user.findMany({
      where: {
        adminChats: {
          some: { id },
        },
      },
    });
  }

  async getMessages(chatId: string, limit: number, offset: number) {
    const result = this.prisma.chatMessage.findMany({
      where: { chat: { id: chatId } },
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
    });

    return await result;
  }

  async isChatMember(chatId: string, userId: number): Promise<boolean> {
    const result = await this.prisma.chat.count({
      where: {
        id: chatId,
        members: {
          some: {
            id: userId,
          },
        },
      },
    });

    return !!result;
  }

  async create(input: CreateChatInput, ownerId: number) {
    return await this.prisma.chat.create({
      data: {
        name: input.name,
        password: input.password,
        is_private: input.is_private,
        type: input.type,
        admins: {
          connect: { id: ownerId },
        },
        members: {
          connect: input.members.map((memberId) => ({ id: memberId })),
        },
        owner: {
          connect: { id: ownerId },
        },
      },
    });
  }

  async findAll(user: RequestUser) {
    return await this.prisma.user.findUnique({ where: { id: user.id } }).chats;
  }

  async findOne(id: string) {
    return await this.prisma.chat.findUnique({
      where: { id: id },
      include: { owner: true },
    });
  }

  async update(id: string, updateChatInput: UpdateChatInput) {
    return await this.prisma.chat.update({
      where: { id },
      data: {
        ...updateChatInput,
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.chat.delete({ where: { id } });
  }
}
