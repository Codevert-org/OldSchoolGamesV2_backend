export interface IInvitationEvent {
  eventType: 'sent' | 'accepted' | 'canceled';
  fromId?: number;
  toId?: number;
  invitationId?: number;
  game: string;
}
