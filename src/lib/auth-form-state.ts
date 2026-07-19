export type AuthFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const idleAuthState: AuthFormState = { status: "idle" };
