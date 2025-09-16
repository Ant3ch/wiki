export type error = {
    code : number,
    message : string
}

// Types
export type Profile = {
  coverts: string[];
  triggers: string[];
  finalpage?: string;
};

export type Config = {
  profiles: Record<string, Profile>;
};