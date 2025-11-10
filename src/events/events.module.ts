import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { UserEventService } from './users/userEvents.service';
import { InvitationEventService } from './invitations/invitationEvents.service';
import { GameEventService } from './Games/gamesEvents.service';
import { UsersModule } from 'src/users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => UsersModule), PrismaModule],
  providers: [
    EventsGateway,
    UserEventService,
    InvitationEventService,
    GameEventService,
  ],
  exports: [
    EventsGateway,
    UserEventService,
    InvitationEventService,
    GameEventService,
  ],
})
export class EventsModule {}
