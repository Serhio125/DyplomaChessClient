

export interface SessionCredentials {
    uuid: string;
    login: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    country: string | null;
}
export interface TypeGlobalContext {
    sessionCredentials: SessionCredentials | null;
    sessionToken: string | null;
}