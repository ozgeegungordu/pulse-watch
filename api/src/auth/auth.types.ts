export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
};
