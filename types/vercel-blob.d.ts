declare module "@vercel/blob" {
  export function put(pathname: string, file: File, options: {
    access: "public" | "private";
    addRandomSuffix?: boolean;
    token?: string;
  }): Promise<{ url: string }>;

  export function del(url: string, options?: {
    token?: string;
  }): Promise<void>;
}
