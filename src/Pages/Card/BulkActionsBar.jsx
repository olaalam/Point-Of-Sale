import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PREPARATION_STATUSES, statusOrder } from "./constants";
import CaptainSelectionModal from "../CaptainSelectionModal";
export default function BulkActionsBar({
  bulkStatus,
  setBulkStatus,
  selectedItems,
  onApplyStatus,
  onTransferOrder,
  isLoading,
  currentLowestStatus,
  t,
  captainsData,
  loadingCaptains,
}) {
  const [isOpen, setIsOpen] = useState(false);
const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);
  // دالة لتنفيذ حالة "Preparing" مباشرة
  const handleQuickPrepare = () => {
    setBulkStatus("preparing");
    // ننتظر قليلاً للتأكد من تحديث الحالة ثم ننفذ الأكشن
    setTimeout(() => {
      onApplyStatus();
    }, 0);
  };

  const handleConfirmTransfer = () => {
    onTransferOrder(selectedItems);
    setIsOpen(false);
  };

  // الوصول لبيانات أيقونة ولون حالة التجهيز من الثوابت
  const preparingInfo = PREPARATION_STATUSES["preparing"];

  return (
    <div className="flex items-center justify-start mb-4 gap-4 flex-wrap p-4 bg-white rounded-lg shadow-md border border-gray-100">
      
      {/* 🟠 زر "تحت التجهيز" السريع */}
      {preparingInfo && (
        <Button
          onClick={handleQuickPrepare}
          disabled={selectedItems.length === 0 || isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <preparingInfo.icon size={16} />
          <span>{preparingInfo.label}</span>
          {selectedItems.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {selectedItems.length}
            </span>
          )}
        </Button>
      )}

      {/* فاصل بصري بسيط */}
      <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

      {/* اختيار بقية الحالات */}
      <div className="flex items-center gap-2">
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[180px] border-gray-300 rounded-md shadow-sm px-4 py-2 bg-white text-gray-700">
            <SelectValue placeholder={t("ChooseStatus") || "-- اختر حالة --"} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200">
            {Object.entries(PREPARATION_STATUSES)
              .filter(([key]) => 
                // إظهار الحالات الأعلى من الحالية فقط + إخفاء "preparing" لأن لها زر خاص
                statusOrder.indexOf(key) >= statusOrder.indexOf(currentLowestStatus) && 
                key !== "preparing"
              )
              .map(([key, value]) => (
                <SelectItem key={key} value={key} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <value.icon size={16} className={value.color} />
                    <span>{value.label}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Button
          onClick={onApplyStatus}
          className="bg-bg-primary text-white hover:bg-red-700 text-sm"
          disabled={selectedItems.length === 0 || !bulkStatus || isLoading}
        >
          {t("ApplyStatus", { count: selectedItems.length })}
        </Button>
      </div>

      {/* زر نقل الطاولة كما هو */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={selectedItems.length === 0 || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-2 ml-auto"
          >
            {t("ChangeTable") || "نقل إلى طاولة"}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-right">
              {t("ConfirmTransfer") || "تأكيد عملية النقل"}
            </DialogTitle>
            <DialogDescription className="text-right pt-2 text-gray-500">
              {t("AreYouSureTransferItems") || "هل تريد نقل العناصر المختارة إلى طاولة أخرى؟"}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              {t("Cancel") || "إلغاء"}
            </Button>
            <Button
              type="button"
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleConfirmTransfer}
            >
              {t("Confirm") || "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CaptainSelectionModal 
        isOpen={isCaptainModalOpen}
        onOpenChange={setIsCaptainModalOpen}
        captainsData={captainsData}
        isLoading={loadingCaptains}
        t={t}
        disabled={selectedItems.length === 0 || isLoading}
      />
    </div>
  );
}