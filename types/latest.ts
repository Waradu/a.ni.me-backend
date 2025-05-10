export interface Latest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, Platform>;
}

export interface Platform {
  signature: string;
  url: string;
}