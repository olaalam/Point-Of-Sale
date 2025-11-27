import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ChevronDown,
  Check,
  CheckCircle,
  Clock,
  ShoppingCart,
  CreditCard,
  UserCheck,
  Link,
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { usePut } from "@/Hooks/usePut";
import Loading from "@/components/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const CustomStatusSelect = ({ table, statusOptions, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentStatus = statusOptions.find(
    (option) => option.value === table.current_status
  );

  const handleStatusSelect = (statusValue) => {
    onStatusChange(statusValue);
    setIsOpen(false);
  };

  return (
<div
  className={`relative w-full ${isOpen ? "z-[9999]" : "z-[1]"}`}
  onClick={(e) => e.stopPropagation()}
>
      <button
        className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1">
          {currentStatus?.icon && (
            <currentStatus.icon size={12} className={currentStatus.iconColor} />
          )}
          <span className="truncate">{currentStatus?.label || "Status"}</span>
        </div>
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      
{isOpen && (
  <div className="absolute top-full left-0 right-0 mt-1 z-[99999]">
    <div className="bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden text-xs">

            {statusOptions.map((option) => (
              <button
                key={option.value}
                className="w-full px-2 py-2 text-left flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                onClick={() => handleStatusSelect(option.value)}
              >
                <div className="flex items-center gap-2">
                  <option.icon size={12} className={option.iconColor} />
                  <span>{option.label}</span>
                </div>
                {table.current_status === option.value && (
                  <Check size={12} className="text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Dine = () => {
  const navigate = useNavigate();
  const branch_id = sessionStorage.getItem("branch_id");
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const { data, isLoading, error } = useGet(
    `captain/lists?branch_id=${branch_id}`
  );
  const { loading: transferLoading, postData } = usePost();

  const locations = data?.cafe_location || [];

  const statusOptions = [
    {
      label: t("Available"),
      value: "available",
      icon: CheckCircle,
      iconColor: "text-gray-500",
    },
    {
      label: t("Preorder"),
      value: "not_available_pre_order",
      icon: Clock,
      iconColor: "text-orange-500",
    },
    {
      label: t("Withorder"),
      value: "not_available_with_order",
      icon: ShoppingCart,
      iconColor: "text-red-500",
    },
    {
      label: t("Reserved"),
      value: "reserved",
      icon: UserCheck,
      iconColor: "text-blue-500",
    },
    {
      label: t("Checkout"),
      value: "not_available_but_checkout",
      icon: CreditCard,
      iconColor: "text-green-500",
    },
  ];

  const processTablesWithMerge = (tables) => {
    return tables.map((table) => {
      if (table.sub_table && table.sub_table.length > 0) {
        return {
          ...table,
          isMerged: true,
          subTables: table.sub_table,
          mergedTableNumbers: [
            table.table_number,
            ...table.sub_table.map((s) => s.table_number),
          ].join(" + "),
        };
      }
      return { ...table, isMerged: false };
    });
  };

  useEffect(() => {
    const storedTableId = sessionStorage.getItem("table_id");
    if (storedTableId) setSelectedTable(parseInt(storedTableId));
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (sessionStorage.getItem("transfer_pending") === "true") {
      toast.info(t("SelectNewTableToTransferOrder"));
    }
  }, []);

  const selectedLocation = locations.find(
    (loc) => loc.id === selectedLocationId
  );
  const tablesToDisplay = processTablesWithMerge(
    selectedLocation?.tables || []
  );

  const tableStates = {
    available: "available",
    not_available_pre_order: "not_available_pre_order",
    not_available_with_order: "not_available_with_order",
    not_available_but_checkout: "not_available_but_checkout",
  };

  const getTableColor = (state) => {
    const colors = {
      available: "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
      not_available_pre_order:
        "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
      not_available_with_order:
        "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
      not_available_but_checkout:
        "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
      reserved: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
    };
    return colors[state] || colors.available;
  };

  const handleSelectTable = async (table) => {
    const transferPending =
      sessionStorage.getItem("transfer_pending") === "true";
    const sourceTableId = sessionStorage.getItem("transfer_source_table_id");

    if (transferPending) {
      const cartIds = JSON.parse(
        sessionStorage.getItem("transfer_cart_ids") || "[]"
      );
      if (cartIds.length > 0 && sourceTableId === table.id.toString()) {
        toast.error(t("CannotTransferToSameTable"));
        return;
      }

      const formData = new FormData();
      formData.append("table_id", table.id);
      cartIds.forEach((id, i) => formData.append(`cart_ids[${i}]`, id));

      try {
        await postData("cashier/transfer_order", formData);
        toast.success(t("OrderTransferredSuccessfully"));
        [
          "transfer_cart_ids",
          "transfer_first_cart_id",
          "transfer_source_table_id",
          "transfer_pending",
        ].forEach((k) => sessionStorage.removeItem(k));
        sessionStorage.setItem("table_id", table.id);
        navigate("/order-page", {
          state: {
            order_type: "dine_in",
            table_id: table.id,
            transferred: true,
          },
        });
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            t("FailedtotransfertablePleasetryagain")
        );
      }
    } else {
      sessionStorage.setItem("table_id", table.id);
      sessionStorage.setItem("order_type", "dine_in");
      sessionStorage.setItem("hall_name", selectedLocation?.name || "");
      sessionStorage.setItem("table_number", table.table_number || "");
      navigate("/order-page", {
        state: { order_type: "dine_in", table_id: table.id },
      });
    }
    setSelectedTable(table.id);
  };

  const MergedTableCard = ({ table, onStatusChange }) => {
    const transferPending =
      sessionStorage.getItem("transfer_pending") === "true";
    const isSource =
      transferPending &&
      sessionStorage.getItem("transfer_source_table_id") ===
        table.id.toString();

    return (
      <div
        className={`
          relative p-3 rounded-lg border-2 shadow-sm transition-all cursor-pointer
          bg-gradient-to-br from-purple-50 to-purple-100
          ${selectedTable === table.id ? "ring-2 ring-purple-500" : ""}
          hover:shadow-md hover:scale-[1.02]
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        <div className="absolute -top-2 left-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Link size={10} />
          <span className="font-bold">{t("MergedTable")}</span>
        </div>

        <div className="text-center mb-2">
          <div className="text-lg font-bold text-purple-800">
            {table.table_number}
          </div>
          <div className="text-xs flex items-center justify-center gap-1">
            <Users size={10} /> {table.capacity}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          {table.subTables.map((sub) => (
            <div
              key={sub.id}
              className={`p-1.5 rounded border text-center ${getTableColor(
                sub.current_status || table.current_status
              )}`}
            >
              <div className="font-bold">{sub.table_number}</div>
              <div className="flex items-center justify-center gap-0.5">
                <Users size={8} /> {sub.capacity}
              </div>
            </div>
          ))}
        </div>

        <CustomStatusSelect
          table={table}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
        />

        {isSource && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[9px] px-1.5 py-0.5 rounded">
            {t("Source")}
          </div>
        )}
        {transferPending && !isSource && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded">
            Select
          </div>
        )}
      </div>
    );
  };

  const TableCard = ({ table }) => {
    const transferPending =
      sessionStorage.getItem("transfer_pending") === "true";
    const isSource =
      transferPending &&
      sessionStorage.getItem("transfer_source_table_id") ===
        table.id.toString();
    const { putData: putStatusChange } = usePut();

    const dynamicStatusOptions = statusOptions.filter((opt) =>
      opt.value === "reserved"
        ? ["available", "reserved"].includes(table.current_status)
        : true
    );

    const handleStatusChange = async (status) => {
      try {
        await putStatusChange(
          `cashier/tables_status/${table.id}?current_status=${status}`,
          {}
        );
        toast.success(t("StatusUpdated"));
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed");
      }
    };

    if (table.isMerged) {
      return (
        <MergedTableCard table={table} onStatusChange={handleStatusChange} />
      );
    }

    return (
      <div
        className={`
          relative p-4 rounded-lg border-2 shadow-sm transition-all cursor-pointer text-center
          ${getTableColor(table.current_status)}
          ${table.current_status === "available" ? "border-dashed" : ""}
          ${selectedTable === table.id ? "ring-2 ring-blue-500" : ""}
          ${isSource ? "ring-2 ring-yellow-500 opacity-70" : ""}
          ${transferPending && !isSource ? "ring-2 ring-green-400" : ""}
          hover:shadow-md hover:scale-[1.03]
          ${transferLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        <div className="text-2xl font-bold mb-1">{table.table_number}</div>
        <div className="flex items-center justify-center gap-1 text-sm mb-2">
          <Users size={14} />
          <span>{table.capacity}</span>
        </div>
        <CustomStatusSelect
          table={table}
          statusOptions={dynamicStatusOptions}
          onStatusChange={handleStatusChange}
        />
        {isSource && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded">
            {t("Source")}
          </div>
        )}
        {transferPending && !isSource && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
            Select
          </div>
        )}
      </div>
    );
  };

  if (isLoading || transferLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
        {transferLoading && (
          <div className="absolute bottom-10 bg-white p-3 rounded shadow">
            <p className="text-sm">{t("Transferringorder")}</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-8 text-center text-red-600 bg-red-50 rounded-lg shadow-md max-w-lg mx-auto mt-10 ${
          isArabic ? "text-right" : "text-left"
        }`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <p className="font-semibold">{t("Failedtoloadtables")}</p>
        <p className="text-sm mt-2">
          {t("Pleasecheckyournetworkconnectionortryagainlater")}
        </p>
      </div>
    );
  }

  return (
    <div className=" w-full bg-gray-50 p-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className=" mx-auto bg-white rounded-xl shadow-lg ">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">
            {sessionStorage.getItem("transfer_pending") === "true"
              ? t("SelectNewTableForTransfer")
              : t("DineInTables")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {sessionStorage.getItem("transfer_pending") === "true"
              ? t("SelectTableToTransferFrom", {
                  sourceTableId: sessionStorage.getItem(
                    "transfer_source_table_id"
                  ),
                })
              : t("SelectTableToStartOrder")}
          </p>
        </div>

        {locations.length > 0 ? (
          <Tabs
            value={selectedLocationId?.toString()}
            onValueChange={(v) => setSelectedLocationId(parseInt(v))}
            className="w-full "
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 p-4 pt-2 h-12 !shadow-none !bg-none w-full">
              {locations.map((loc) => (
                <TabsTrigger
                  key={loc.id}
                  value={loc.id.toString()}
                  className="text-xs  data-[state=active]:bg-bg-primary data-[state=active]:text-white rounded-md "
                >
                  {loc.name === "Main Hall"
                    ? t("MainHall")
                    : t("ReceptionHall")}
                </TabsTrigger>
              ))}
            </TabsList>

            {locations.map((loc) => (
              <TabsContent
                key={loc.id}
                value={loc.id.toString()}
                className="mt-0"
              >
                <div className="p-4">
                  {tablesToDisplay.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 auto-rows-min">
                      {tablesToDisplay.map((table) => (
                        <TableCard key={table.id} table={table} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg">{t("NoTablesFound")}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-10 text-center text-gray-600">
            <p className="font-semibold">{t("NoCafeLocationsFound")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dine;
