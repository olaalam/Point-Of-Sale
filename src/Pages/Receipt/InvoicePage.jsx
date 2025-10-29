// src/pages/InvoicePage.jsx
import React from 'react';
import ReceiptPrinter from './ReceiptPrinter';
import { sampleData } from './sampleData';

const InvoicePage = () => {
  return (
    <ReceiptPrinter
      receiptData={sampleData}
      onClose={() => alert('تم إغلاق الفاتورة')}
    />
  );
};

export default InvoicePage;