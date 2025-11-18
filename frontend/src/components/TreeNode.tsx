"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import type { TreeNodeType } from "../types/tree";

const API = process.env.NEXT_PUBLIC_API!;

interface Props {
  node: TreeNodeType;
  treeId: number;
  reload: () => void;
}

export default function TreeNode({ node, treeId, reload }: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [childName, setChildName] = useState("");
   const [childDataValue, setchildDataValue] = useState("");
  const [dataValue, setDataValue] = useState(node.data ?? "");

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!childName.trim()) return;
    await fetch(`${API}/trees/${treeId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_id: node.id,
        name: childName,
        data:childDataValue,
      }),
    });
    setShowAddDialog(false);
    setChildName("");
    reload();
  }

  async function handleUpdateData(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${API}/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataValue }),
    });
    setShowEditDialog(false);
    reload();
  }

  async function handleDeleteNode() {
    await fetch(`${API}/nodes/${treeId}/${node.path}`, {
      method: "DELETE",
    });
    setShowDeleteDialog(false);
    reload();
  }

  async function handleNameUpdate() {
    if (!name.trim()) {
      setName(node.name);
      setEditing(false);
      return;
    }
    if (name !== node.name) {
      await fetch(`${API}/nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      
      reload();
    }
    setEditing(false);
  }

  return (
    <>
      <div className="ml-4 border-l pl-4">
        <div className="flex gap-2 items-center mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setOpen(!open)}
          >
            {open ? "▼" : "▶"}
          </Button>
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameUpdate();
                if (e.key === "Escape") {
                  setName(node.name);
                  setEditing(false);
                }
              }}
              className="h-8 max-w-xs"
              autoFocus
            />
          ) : (
            <span
              className="font-medium cursor-pointer"
              onDoubleClick={() => setEditing(true)}
            >
              {node.name}
            </span>
          )}
          <div className="flex-1" />
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            Add Child
          </Button>
          {node.children.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDataValue(node.data ?? "");
                setShowEditDialog(true);
              }}
            >
              Edit Data
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </Button>
        </div>
        {open && (
          <div className="ml-4 space-y-2">
            {node.data && (
              <Card className="p-3 bg-muted">
                <pre className="whitespace-pre-wrap text-sm">{node.data}</pre>
              </Card>
            )}
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                treeId={treeId}
                reload={reload}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Child Node</DialogTitle>
            <DialogDescription>
              Create a new child node under "{node.name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddChild}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child-name">Child Name</Label>
                <Input
                  id="child-name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter child name"
                  required
                />
              </div>
              <div className="space-y-2">
                            <Label htmlFor="data-value">Child Data Value</Label>
                            <Input
                              id="data-value"
                              value={childDataValue}
                              onChange={(e) => setchildDataValue(e.target.value)}
                              placeholder="Enter child data value"
                              required
                            />
                          </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Child</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node Data</DialogTitle>
            <DialogDescription>
              Update the data for "{node.name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateData}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-data">Data</Label>
                <Textarea
                  id="node-data"
                  value={dataValue}
                  onChange={(e) => setDataValue(e.target.value)}
                  placeholder="Enter node data"
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Data</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{node.name}" and all its children?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}