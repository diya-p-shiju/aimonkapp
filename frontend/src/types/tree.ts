export interface TreeNodeType {
  id: number;
  tree_id: number;
  path: string;
  name: string;
  data: string | null;
  children: TreeNodeType[];
}

export interface TreeType {
  tree_id: number;
  root: TreeNodeType | null;
}