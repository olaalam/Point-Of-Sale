import React from "react";

const SummaryRow = ({ label, value }) => (
  <div className="grid grid-cols-2 gap-10 py-2">
    <p>{label}:</p>
    <p>{value.toFixed(2)} EGP</p>
  </div>
);

export default SummaryRow;