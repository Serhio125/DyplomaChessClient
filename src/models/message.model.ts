export interface MessageModel {
  uuid: string;
  gameUuid: string;
  srcUserUuid: string;
  content: string;
  type: number | null;
  replyMessageUuid: string | null;
  createdAt: string;
}
