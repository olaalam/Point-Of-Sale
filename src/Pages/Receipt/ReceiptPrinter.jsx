// src/components/ReceiptPrinter.jsx
import React from 'react';
import './ReceiptPrinter.css';

const ReceiptPrinter = ({ receiptData, onClose }) => {
  const handlePrint = () => {
    window.print();
    setTimeout(() => onClose?.(), 500); 
  };

  return (
    <div>
      {/* الفاتورة */}
      <div id="receipt" className="receipt-print">
        <div className="header">
          <h1>كاشير</h1>
          <p>للمشروبات والماكولات</p>
          <p>الاسكندرية - سيدي جابر - شارع المشير</p>
        </div>

        <div className="info">
          <div><strong>نسخة:</strong> <span>{receiptData.copyNumber}</span></div>
          <div><strong>الطاولة:</strong> <span>{receiptData.table}</span></div>
          <div><strong>الكاشير:</strong> <span>{receiptData.cashier}</span></div>
          <div><strong>التاريخ:</strong> <span>{receiptData.date}</span></div>
          <div><strong>رقم الفاتورة:</strong> <span>{receiptData.invoiceNumber}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>الكمية</th>
              <th>الصنف</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {receiptData.items.map((item, i) => (
              <tr key={i}>
                <td>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{item.name}</td>
                <td>{item.price.toFixed(2)}</td>
                <td>{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div><span>صافي المبيع:</span> <span>{receiptData.subtotal.toFixed(2)}</span></div>
          <div><span>الخصم:</span> <span>{receiptData.discount.toFixed(2)}</span></div>
          <div><span>ضريبة القيمة المضافة:</span> <span>{receiptData.tax.toFixed(2)}</span></div>
          <div className="final"><span>الإجمالي:</span> <span>{receiptData.total.toFixed(2)}</span></div>
        </div>

        <div className="footer">
          <p>شكراً لزيارتكم</p>
        </div>
      </div>

      {/* زر طباعة (خارج الفاتورة) */}
      <button className="print-btn no-print" onClick={handlePrint}>
        طباعة الفاتورة
      </button>
    </div>
  );
};

export default ReceiptPrinter;