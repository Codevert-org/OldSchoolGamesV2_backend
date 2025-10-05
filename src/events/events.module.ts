import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { UserEventService } from './userEvents.service';
import { UsersModule } from 'src/users/users.module';
import { InvitationEventService } from './invitationEvents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => UsersModule), PrismaModule],
  providers: [EventsGateway, UserEventService, InvitationEventService],
  exports: [EventsGateway, UserEventService, InvitationEventService],
})
export class EventsModule {}
