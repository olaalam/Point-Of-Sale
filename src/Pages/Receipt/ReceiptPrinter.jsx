// src/components/ReceiptPrinter.jsx
import React, { useEffect } from "react";

const ReceiptPrinter = ({ receiptData, onClose, autoPrint = false }) => {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
        setTimeout(() => onClose?.(), 600);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, onClose]);

  const handlePrint = () => {
    window.print();
    setTimeout(() => onClose?.(), 600);
  };

  return (
    <div className="receipt-wrapper">
      <div
        id="receipt"
        className="receipt-print w-[80mm] max-w-[80mm] bg-white p-2 m-0 font-mono text-[12px] leading-5 text-black rtl text-right shadow-md"
      >
        {/* Header */}
        <div className="header text-center border-b-2 border-dashed border-gray-800 pb-2 mb-3">
          <h1 className="text-lg font-bold tracking-wider m-0">كاشير</h1>
          <p className="text-[11px] text-gray-800 m-1">للمشروبات والماكولات</p>
          <p className="text-[11px] text-gray-800 m-1">الاسكندرية - سيدي جابر - شارع المشير</p>
        </div>

        {/* Info */}
        <div className="info border-b border-dashed border-gray-600 pb-2 mb-3 text-[11px]">
          <div className="flex justify-between py-0.5"><strong>نسخة:</strong> <span>{receiptData.copyNumber}</span></div>
          <div className="flex justify-between py-0.5"><strong>الطاولة:</strong> <span>{receiptData.table}</span></div>
          <div className="flex justify-between py-0.5"><strong>الكاشير:</strong> <span>{receiptData.cashier}</span></div>
          <div className="flex justify-between py-0.5"><strong>التاريخ:</strong> <span>{receiptData.date}</span></div>
          <div className="flex justify-between py-0.5"><strong>رقم الفاتورة:</strong> <span>{receiptData.invoiceNumber}</span></div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse my-3 text-[11px]">
          <thead className="border-b-2 border-gray-800">
            <tr>
              <th className="py-1 px-1 font-bold text-[11px] text-center">الكمية</th>
              <th className="py-1 px-1 font-bold text-[11px] text-center">الصنف</th>
              <th className="py-1 px-1 font-bold text-[11px] text-center">سعر الوحدة</th>
              <th className="py-1 px-1 font-bold text-[11px] text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {receiptData.items.map((item, i) => (
              <tr key={i} className="border-b border-dotted border-gray-400 last:border-b-0">
                <td className="py-1 px-1 text-center">{item.qty}</td>
                <td className="py-1 px-1 text-center">{item.name}</td>
                <td className="py-1 px-1 text-center">{item.price.toFixed(2)}</td>
                <td className="py-1 px-1 text-center">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals border-t-2 border-dashed border-gray-800 pt-2 mt-3 text-[12px]">
          <div className="flex justify-between py-1"><span>صافي المبيع:</span> <span>{receiptData.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between py-1"><span>الخصم:</span> <span>{receiptData.discount.toFixed(2)}</span></div>
          <div className="flex justify-between py-1"><span>ضريبة القيمة المضافة:</span> <span>{receiptData.tax.toFixed(2)}</span></div>
          <div className="final flex justify-between border-t-2 border-gray-800 pt-2 mt-2 font-bold text-[15px]">
            <span>الإجمالي:</span> <span>{receiptData.total.toFixed(2)} EGP</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer text-center mt-3 pt-3 border-t-2 border-dashed border-gray-800 font-bold text-[13px]">
          <p>شكراً لزيارتكم</p>
        </div>
      </div>

      {/* Print button */}
      {!autoPrint && (
        <button
          className="print-btn no-print block mx-auto mt-5 px-7 py-3 bg-green-600 text-white font-bold text-base rounded-md hover:bg-green-500"
          onClick={handlePrint}
        >
          طباعة الفاتورة
        </button>
      )}
    </div>
  );
};

export default ReceiptPrinter;
