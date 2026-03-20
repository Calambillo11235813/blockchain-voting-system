import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async responder(@Body('mensaje') mensaje: string) {
    const respuesta = await this.chatbotService.getRespuesta(mensaje);
    return { respuesta };
  }
}
