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
  onManagerIdChange,  
  isLoading,
}) => {
  const handleManagerIdBlur = async () => {
    if (!managerId || managerId.trim() === "") return;

    // منع التحقق المتكرر إذا كان نفس القيمة
    if (managerId === sessionStorage.getItem("lastValidatedManagerId")) {
      return;
    }

    await onManagerIdChange?.(managerId);
  };

  const handleClose = () => {
    setManagerId("");
    setManagerPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Item - Manager Authentication</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="managerId" className="text-right font-medium">
              Manager ID
            </label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="managerId"
              value={managerId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // أرقام فقط
                setManagerId(value);
              }}
              onBlur={handleManagerIdBlur} // هنا التحقق
              className="col-span-3"
              placeholder="Enter Manager ID"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="password" className="text-right font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              className="col-span-3"
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmVoidItem}
            disabled={!managerId || !managerPassword || isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? "Voiding..." : "Confirm Void"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidItemModal;