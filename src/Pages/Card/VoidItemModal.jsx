import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const VoidItemModal = ({
  open,
  onOpenChange,
  managerId,
  setManagerId,
  managerPassword,
  setManagerPassword,
  confirmVoidItem,
  isLoading,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Void Item - Manager Authentication</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="managerId" className="text-right">
            Manager ID
          </label>
          <Input
            type="number"
            id="managerId"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="password" className="text-right">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="mr-2"
        >
          Cancel
        </Button>
        <Button
          onClick={confirmVoidItem}
          disabled={!managerId || !managerPassword || isLoading}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Confirm Void
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default VoidItemModal;