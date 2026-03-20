export type InfoAttachment =
  | {
      type: "image";
      uri: string;
      width?: number;
      height?: number;
    }
  | {
      type: "file";
      uri: string;
      name?: string;
      mimeType?: string;
    };

export type InfoItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  attachments: InfoAttachment[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  deletedAt: number | null;
};

export type InfoDraft = {
  title: string;
  content: string;
  category: string;
  tags: string[];
  attachments: InfoAttachment[];
};

