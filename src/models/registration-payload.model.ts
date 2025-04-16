export interface RegistrationPayloadModel {
  login: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
}
