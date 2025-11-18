"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import TreeNode from "./TreeNode";
import type { TreeType } from "../types/tree";

const API = process.env.NEXT_PUBLIC_API!;

export default function TreeManager() {
  const [trees, setTrees] = useState<TreeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  

  async function loadTrees() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/trees`);
      const json = await res.json();
      console.log('Trees from API:', json);
      setTrees(json);
    } catch (error) {
      console.error("Failed to load trees:", error);
    }
    setLoading(false);
    setIsUpdating(false);
  }

  useEffect(() => {
    loadTrees();
  }, []);
  
  const TreeView = ({ tree }) => {
    const renderTree = (node) => {
      return {
        name: node.name,
        ...(node.children && node.children.length > 0
          ? { children: node.children.map((child) => renderTree(child)) }
          : { data: node.data }),
      };
    };
  
    return (
      <p>
        {JSON.stringify(renderTree(tree.root), null, 2)}
      </p>
    );
  };


  async function createTree(e: React.FormEvent) {
    e.preventDefault();
    if (!newTreeName.trim()) return;

    try {
      // Use a smaller random number that fits in PostgreSQL INTEGER
      const treeId = Math.floor(Math.random() * 2000000000);
      
      await fetch(`${API}/trees/${treeId}/root?name=${encodeURIComponent(newTreeName)}`, {
        method: "POST",
      });
      
      setShowCreateDialog(false);
      setNewTreeName("");
      loadTrees();
    } catch (error) {
      console.error("Failed to create tree:", error);
    }
  }

  if (loading || isUpdating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Trees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tree Manager</h1>
        <Button onClick={() => setShowCreateDialog(true)}> New Tree</Button>
      </div>

      <div className="space-y-10">
        {trees.length === 0 && (
          <div className="text-gray-500">No trees yet. Create one.</div>
        )}
        {trees.map((tree, index) => (
          <div key={tree.tree_id} className="border p-4 rounded-xl">
            <h2 className="text-xl font-semibold mb-2">
              Tree {index+1}
            </h2>
            {tree.root && (
              <TreeNode
                node={tree.root}
                treeId={tree.tree_id}
                reload={() => {
                  setIsUpdating(true);
                  loadTrees();
                }}
              />
  
            )}
            
            <h2 className="font-semibold mt-5 mb-2">
                          Export Value :
                        </h2>
           <TreeView tree={tree} />
          </div>
        ))}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tree</DialogTitle>
            <DialogDescription>
              Enter a name for the root node of your new tree
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createTree}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tree-name">Root Node Name</Label>
                <Input
                  id="tree-name"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  placeholder="Enter root node name"
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Tree</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}