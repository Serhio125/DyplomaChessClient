export interface MoveModel {
  uuid: string | null;

  partyUuid: string | null;

  index: number;

  before: string | null;

  after: string | null;

  color: string | null;

  piece: string | null;

  from: string | null;

  to: string | null;

  san: string | null;

  lan: string | null;

  flags: string | null;

  captured: string | null;
}
