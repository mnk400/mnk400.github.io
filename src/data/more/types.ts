export interface MoreItemData {
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  image?: string;
  redirectFrom?: string[];
  tags?: string[];
  order?: number;
  years?: string;
  works?: string;
  entity?: {
    type?: string;
    name?: string;
    same_as?: string[];
  };
  isHub?: boolean;
  listed?: boolean;
  url?: string;
}
