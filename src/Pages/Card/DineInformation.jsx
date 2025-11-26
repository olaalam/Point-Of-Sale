import React from "react";
import { useTranslation } from "react-i18next";

const DineInformation = () => {
     const { t  } = useTranslation();
  
  const hallName = sessionStorage.getItem("hall_name");
  const tableNumber = sessionStorage.getItem("table_number");

  if (!hallName && !tableNumber) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{t("CurrentHall")}</p>
        <p className="text-lg font-semibold text-gray-800">{hallName}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">{t("Table")}</p>
        <p className="text-lg font-semibold text-gray-800">{tableNumber}</p>
      </div>
    </div>
  );
};

export default DineInformation;
