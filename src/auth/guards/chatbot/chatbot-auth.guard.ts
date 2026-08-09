import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

// Chatbot-оос (JWT token-гүйгээр) дуудах тусгай endpoint-уудыг хамгаална.
// Bot нь HTTP header дээр CHATBOT_API_KEY-тэй тохирох түлхүүрийг
// дамжуулах ёстой. Түлхүүр тохирохгүй, эсвэл CHATBOT_API_KEY .env-д
// тохируулагдаагүй бол хүсэлтийг татгалзана (аюулгүй байдлын үүднээс
// key тохируулаагүй бол ЗӨВШӨӨРӨХГҮЙ, "нээлттэй" болгохгүй).
@Injectable()
export class ChatbotAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expectedKey = process.env.CHATBOT_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException(
        'Chatbot API key тохируулагдаагүй байна.',
      );
    }

    const providedKey =
      (req.headers['x-bot-key'] as string | undefined) ??
      (req.headers['x-chatbot-key'] as string | undefined);

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Буруу эсвэл дутуу bot key.');
    }

    return true;
  }
}
