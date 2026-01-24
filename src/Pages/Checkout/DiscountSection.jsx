import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const DiscountSection = ({
  amountToPay,
  appliedDiscount,
  setAppliedDiscount,
  selectedDiscountId,
  setSelectedDiscountId,
  freeDiscount,
  setFreeDiscount,
  discountCode,
  setDiscountCode,
  handleApplyDiscount,
  isCheckingDiscount,
  discountListData,
  selectedDiscountAmount,
  discountData,
  orderType,
  totalDiscount, // الخصم القديم (item-level + previous)
  itemDiscountsAmount,
  isDiscountExpanded,
  setIsDiscountExpanded,
  activeDiscountTab,
  setActiveDiscountTab,
}) => {
  const { t } = useTranslation();

  // حساب إجمالي الخصم المطبق (للعرض في الـ Breakdown)
  const percentageDiscountAmount =
    appliedDiscount > 0
      ? amountToPay * (appliedDiscount / 100)
      : discountData.module.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : selectedDiscountAmount;

  const totalAppliedDiscount = (
    itemDiscountsAmount +
    percentageDiscountAmount +
    parseFloat(freeDiscount || 0) +
    parseFloat(totalDiscount || 0)
  ).toFixed(2);

  const finalAmountAfterDiscount = (amountToPay - totalAppliedDiscount).toFixed(2);

  return (
    <div className="space-y-4">
      {/* زر الـ Discount الكبير */}
      <div className="grid grid-cols-[60%_40%] gap-2">
        {/* مساحة فارغة عشان التوازن (الزر الرئيسي في CheckOut) */}
        <div></div>

        <button
          onClick={() => setIsDiscountExpanded(!isDiscountExpanded)}
          className={cn(
            "py-3 px-4 rounded-lg font-bold text-sm uppercase transition-all border-2 flex items-center justify-center gap-2",
            isDiscountExpanded
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
          )}
        >
          {t("Discount")}
        </button>
      </div>

      {/* محتوى الخصومات عند الفتح */}
      {isDiscountExpanded && (
        <div className="border border-gray-300 rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gray-100 p-3 font-bold text-sm text-center border-b">
            {t("Discount Options")}
          </div>

          {/* Tabs */}
          <div className="flex flex-col">
            <button
              onClick={() =>
                setActiveDiscountTab(activeDiscountTab === "select" ? null : "select")
              }
              className={cn(
                "p-3 border-b text-sm font-semibold transition-all",
                activeDiscountTab === "select"
                  ? "bg-blue-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("Select")}
            </button>
            <button
              onClick={() =>
                setActiveDiscountTab(activeDiscountTab === "free" ? null : "free")
              }
              className={cn(
                "p-3 border-b text-sm font-semibold transition-all",
                activeDiscountTab === "free"
                  ? "bg-purple-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("Free")}
            </button>
            <button
              onClick={() =>
                setActiveDiscountTab(activeDiscountTab === "company" ? null : "company")
              }
              className={cn(
                "p-3 text-sm font-semibold transition-all",
                activeDiscountTab === "company"
                  ? "bg-green-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("By Company")}
            </button>
          </div>

          {/* محتوى كل Tab */}
          {activeDiscountTab && (
            <div className="p-4 bg-gray-50">
              {activeDiscountTab === "select" && (
                <Select
                  value={String(selectedDiscountId || "0")}
                  onValueChange={(val) =>
                    setSelectedDiscountId(val === "0" ? null : parseInt(val))
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t("ChooseDiscount")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("NoDiscount")}</SelectItem>
                    {discountListData?.discount_list?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} ({d.amount}
                        {d.type === "precentage" ? "%" : t("EGP")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {activeDiscountTab === "free" && (
                <Input
                  type="number"
                  placeholder={t("EnterFreeDiscount")}
                  value={freeDiscount}
                  onChange={(e) => setFreeDiscount(e.target.value)}
                  className="bg-white"
                />
              )}

              {activeDiscountTab === "company" && (
                <div className="flex gap-2">
                  <Input
                    placeholder={t("EnterDiscountCode")}
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="bg-white"
                  />
                  <Button onClick={handleApplyDiscount} disabled={isCheckingDiscount}>
                    {t("Apply")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Breakdown (الملخص الخاص بالخصومات) */}
      <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t("Original")}</span>
          <span className="font-semibold">{amountToPay.toFixed(2)} EGP</span>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t("Company Discount")} ({appliedDiscount}%)</span>
            <span>-{(amountToPay * (appliedDiscount / 100)).toFixed(2)} EGP</span>
          </div>
        )}

        {selectedDiscountAmount > 0 && (
          <div className="flex justify-between text-sm text-blue-600">
            <span>{t("List Discount")}</span>
            <span>-{selectedDiscountAmount.toFixed(2)} EGP</span>
          </div>
        )}

        {parseFloat(freeDiscount || 0) > 0 && (
          <div className="flex justify-between text-sm text-purple-600">
            <span>{t("Free Discount")}</span>
            <span>-{parseFloat(freeDiscount || 0).toFixed(2)} EGP</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-orange-600 pt-2 border-t border-dashed">
          <span>{t("Total After Discount")}</span>
          <span>{finalAmountAfterDiscount} EGP</span>
        </div>
      </div>
    </div>
  );
};

export default DiscountSection;