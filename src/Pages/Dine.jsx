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
  Link // Added for merged tables icon
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      {/* Custom Select Button */}
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium border-2 border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          {currentStatus?.icon && (
            <currentStatus.icon size={16} className={currentStatus.iconColor} />
          )}
          <span className="text-gray-700">
            {currentStatus?.label || "Select Status"}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className="w-full px-3 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 text-sm font-medium"
                onClick={() => handleStatusSelect(option.value)}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <option.icon size={16} className={option.iconColor} />
                  <span className="text-gray-700">{option.label}</span>
                </div>

                {/* Check Mark for Selected Item */}
                {table.current_status === option.value && (
                  <Check size={16} className="text-blue-500" />
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const { data, isLoading, error } = useGet(
    `captain/lists?branch_id=${branch_id}`
  );

  const { loading: transferLoading, postData } = usePost();

  const locations = data?.cafe_location || [];

  // All available status options
  const statusOptions = [
    {
      label: t("Available"),
      value: "available",
      color: "bg-gray-100 text-gray-600",
      icon: CheckCircle,
      iconColor: "text-gray-500"
    },
    {
      label: t("Preorder"),
      value: "not_available_pre_order",
      color: "bg-orange-500 text-white",
      icon: Clock,
      iconColor: "text-orange-500"
    },
    {
      label: t("Withorder"),
      value: "not_available_with_order",
      color: "bg-red-500 text-white",
      icon: ShoppingCart,
      iconColor: "text-red-500"
    },
    {
      label: t("Reserved"),
      value: "reserved",
      color: "bg-blue-500 text-white",
      icon: UserCheck,
      iconColor: "text-blue-500"
    },
    {
      label: t("Checkout"),
      value: "not_available_but_checkout",
      color: "bg-green-500 text-white",
      icon: CreditCard,
      iconColor: "text-green-500"
    },
  ];

  // Function to process tables and merge sub-tables
  const processTablesWithMerge = (tables) => {
    const processedTables = [];

    tables.forEach(table => {
      if (table.sub_table && table.sub_table.length > 0) {
        const mergedTable = {
          ...table,
          isMerged: true,
          subTables: table.sub_table,
          totalCapacity: table.capacity,
          mergedTableNumbers: [table.table_number, ...table.sub_table.map(sub => sub.table_number)].join(" + ")
        };
        processedTables.push(mergedTable);
      } else {
        processedTables.push({
          ...table,
          isMerged: false
        });
      }
    });

    return processedTables;
  };

  useEffect(() => {
    const storedTableId = sessionStorage.getItem("table_id");
    if (storedTableId) {
      setSelectedTable(parseInt(storedTableId));
    }

    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocationId]);

  useEffect(() => {
    const transferPending = sessionStorage.getItem("transfer_pending");
    if (transferPending === "true") {
      toast.info(t("SelectNewTableToTransferOrder"));
    }
  }, []);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const rawTables = selectedLocation?.tables || [];
  const processedTables = processTablesWithMerge(rawTables);
  const tablesToDisplay = processedTables;

  const totalPages = Math.ceil(tablesToDisplay.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTables = tablesToDisplay.slice(startIndex, endIndex);

  const tableStates = {
    available: "available",
    not_available_pre_order: "not_available_pre_order",
    not_available_with_order: "not_available_with_order",
    not_available_but_checkout: "not_available_but_checkout",
  };

  const getTableColor = (state) => {
    switch (state) {
      case tableStates.available:
        return "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200";
      case tableStates.not_available_pre_order:
        return "bg-orange-500 text-white hover:bg-orange-600";
      case tableStates.not_available_with_order:
        return "bg-red-500 text-white hover:bg-red-600";
      case tableStates.not_available_but_checkout:
        return "bg-green-500 text-white hover:bg-green-600";
      default:
        return "bg-blue-300 border-gray-300 text-gray-600 hover:bg-gray-200";
    }
  };

  const handleSelectTable = async (table) => {
    console.log("Table selected:", table.id);

    const transferPending = sessionStorage.getItem("transfer_pending");

    if (transferPending === "true") {
      const cartIds = JSON.parse(sessionStorage.getItem("transfer_cart_ids") || "[]");
      const sourceTableId = sessionStorage.getItem("transfer_source_table_id");

      if (cartIds.length > 0 && sourceTableId) {
        if (sourceTableId === table.id.toString()) {
          toast.error(t("CannotTransferToSameTable"));
          return;
        }

        const formData = new FormData();
        formData.append("table_id", table.id.toString());

        cartIds.forEach((cart_id, index) => {
          formData.append(`cart_ids[${index}]`, cart_id.toString());
        });

        try {
          await postData("cashier/transfer_order", formData);
          setTimeout(() => {
            toast.success(t("OrderTransferredSuccessfully"));
          }, 200);

          sessionStorage.removeItem("transfer_cart_ids");
          sessionStorage.removeItem("transfer_first_cart_id");
          sessionStorage.removeItem("transfer_source_table_id");
          sessionStorage.removeItem("transfer_pending");

          setSelectedTable(table.id);
          sessionStorage.setItem("table_id", table.id);

          navigate("/order-page", {
            state: {
              order_type: "dine_in",
              table_id: table.id,
              transferred: true,
              replace: true,
            },
          });

        } catch (err) {
          console.error("Failed to transfer order:", err);
          const errorMessage = err.response?.data?.message ||
            err.response?.data?.exception ||
            t("FailedtotransfertablePleasetryagain");
          toast.error(errorMessage);
        }
      }
    } else {
      setSelectedTable(table.id);
      sessionStorage.setItem("table_id", table.id);
      sessionStorage.setItem("order_type", "dine_in");
      sessionStorage.setItem("hall_name", selectedLocation?.name || "");
      sessionStorage.setItem("table_number", table.table_number || "");
      navigate("/order-page", {
        state: {
          order_type: "dine_in",
          table_id: table.id,
        },
      });
    }
  };

  // Merged Table Card
  const MergedTableCard = ({ table, statusOptions: customStatusOptions, onStatusChange }) => {
    const transferPending = sessionStorage.getItem("transfer_pending") === "true";
    const sourceTableId = sessionStorage.getItem("transfer_source_table_id");
    const isSourceTable = transferPending && sourceTableId === table.id.toString();

    const effectiveStatusOptions = customStatusOptions || statusOptions;

    return (
      <div
        className={`
          relative rounded-xl p-5 shadow-lg transition-all duration-200
          bg-gradient-to-b from-purple-50 to-purple-100
          ${selectedTable === table.id ? "ring-4 ring-blue-500" : ""}
          cursor-pointer hover:scale-105
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        {/* Merged Header */}
        <div className="absolute -top-3 left-4 bg-purple-600 text-white px-3 py-1 rounded-full flex items-center gap-2 shadow-md">
          <Link size={14} />
          <span className="font-semibold text-xs uppercase tracking-wider">{t("MergedTable")}</span>
        </div>

        {/* Main Table */}
        <div className="text-center mb-3">
          <div className="text-2xl font-bold text-purple-800">{table.table_number}</div>
          <div className="text-sm text-purple-700 flex items-center justify-center gap-1">
            <Users size={14} /> {table.capacity} {t("Cap")}
          </div>
        </div>

        {/* Sub Tables Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {table.subTables.map(sub => (
            <div
              key={sub.id}
              className={`p-3 rounded-lg border shadow-sm transition-all duration-150
                ${getTableColor(sub.current_status || table.current_status)}
                ${(sub.current_status || table.current_status) === tableStates.available ? "border-dashed" : ""}
                hover:scale-105
              `}
            >
              <div className="text-center">
                <div className="text-lg font-bold">{sub.table_number}</div>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Users size={12} />
                  <span>{sub.capacity} {t("Cap")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CustomStatusSelect
          table={table}
          statusOptions={effectiveStatusOptions}
          onStatusChange={onStatusChange}
        />

        {/* Transfer Badges */}
        {isSourceTable && <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">{t("Source")}</div>}
        {transferPending && !isSourceTable && <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">Select</div>}
      </div>
    );
  };

  // Regular Table Card
  const TableCard = ({ table }) => {
    const transferPending = sessionStorage.getItem("transfer_pending") === "true";
    const sourceTableId = sessionStorage.getItem("transfer_source_table_id");
    const isSourceTable = transferPending && sourceTableId === table.id.toString();
    const { putData: putStatusChange } = usePut();

    // Dynamic status options: Show "Reserved" only if table is available OR already reserved
    const dynamicStatusOptions = statusOptions.filter(option => {
      if (option.value === "reserved") {
        return table.current_status === "available" || table.current_status === "reserved";
      }
      return true;
    });

    const handleStatusChange = async (newStatus) => {
      try {
        await putStatusChange(`cashier/tables_status/${table.id}?current_status=${newStatus}`, {});
        toast.success(`Status updated to "${statusOptions.find(o => o.value === newStatus)?.label}"`);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data?.exception ||
          "Failed to update status.";
        toast.error(errorMessage);
      }
    };

    if (table.isMerged) {
      return (
        <MergedTableCard
          table={table}
          statusOptions={dynamicStatusOptions}
          onStatusChange={handleStatusChange}
        />
      );
    }

    return (
      <div
        className={`
          relative rounded-lg p-5 border shadow-sm transition-all duration-200 ease-in-out
          ${getTableColor(table.current_status)}
          ${table.current_status === tableStates.available ? "border-dashed" : ""}
          ${selectedTable === table.id ? "ring-2 ring-blue-500 ring-offset-2" : ""}
          ${isSourceTable ? "ring-2 ring-yellow-500 ring-offset-2 opacity-50" : ""}
          ${transferPending && !isSourceTable ? "ring-2 ring-green-400 ring-offset-1" : ""}
          cursor-pointer transform hover:scale-[1.02]
          ${transferLoading ? "pointer-events-none opacity-50" : ""}
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        <div className="text-center">
          <div className="text-3xl font-extrabold mb-2">{table.table_number}</div>
          <div className="flex items-center justify-center gap-2 text-base font-medium mb-4">
            <Users size={20} />
            <span>{t("Capacity")}: {table.capacity}</span>
          </div>

          <CustomStatusSelect
            table={table}
            statusOptions={dynamicStatusOptions}
            onStatusChange={handleStatusChange}
          />

          {isSourceTable && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
              {t("Source")}
            </div>
          )}
          {transferPending && !isSourceTable && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              {t("Select")}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading || transferLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
        {transferLoading && (
          <div className="absolute bottom-10 bg-white p-4 rounded-lg shadow-lg">
            <p className="text-sm text-gray-600">{t("Transferringorder")}</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 text-center text-red-600 bg-red-50 rounded-lg shadow-md mx-auto max-w-lg mt-10 ${isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
        }`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <p className="text-lg font-semibold">{t("Failedtoloadtables")}</p>
        <p className="text-sm mt-2">{t("Pleasecheckyournetworkconnectionortryagainlater")}</p>
      </div>
    );
  }

  const transferPending = sessionStorage.getItem("transfer_pending") === "true";
  const sourceTableId = sessionStorage.getItem("transfer_source_table_id");

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            {transferPending ? t("SelectNewTableForTransfer") : t("DineInTables")}
          </h1>
          <p className="text-gray-500 mt-2">
            {transferPending
              ? t("SelectTableToTransferFrom", { sourceTableId })
              : t("SelectTableToStartOrder")}

          </p>
        </div>

        {locations.length > 0 ? (
          <Tabs
            value={selectedLocationId?.toString()}
            onValueChange={(val) => {
              setSelectedLocationId(parseInt(val));
              setCurrentPage(1);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-transparent sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-1 rounded-lg mb-6">
              {locations.map((loc) => (
                <TabsTrigger
                  key={loc.id}
                  value={loc.id.toString()}
                  className="flex-grow py-2 px-4 text-sm font-medium text-gray-700 data-[state=active]:bg-bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md transition-colors duration-200 hover:bg-gray-200"
                >
                  {loc.name === "Main Hall" ? t("MainHall") : t("ReceptionHall")}
                </TabsTrigger>
              ))}
            </TabsList>

            {locations.map((loc) => (
              <TabsContent key={loc.id} value={loc.id.toString()}>
                <div className="p-4 rounded-lg shadow-inner">
                  {paginatedTables.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {paginatedTables.map((table) => (
                        <TableCard key={table.id} table={table} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <p className="text-lg">{t("NoTablesFound")}</p>
                      <p className="text-sm">{t("SelectAnotherLocationOrAddTables")}</p>

                    </div>
                  )}

                  {tablesToDisplay.length > itemsPerPage && (
                    <Pagination className="mt-8">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((prev) => Math.max(prev - 1, 1));
                            }}
                          />
                        </PaginationItem>

                        {[...Array(totalPages)].map((_, index) => (
                          <PaginationItem key={index}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === index + 1}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(index + 1);
                              }}
                            >
                              {index + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center p-10 bg-gray-50 rounded-lg shadow-inner">
            <p className="text-lg text-gray-600 font-semibold">
              {t("NoCafeLocationsFound")}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {t("EnsureLocationsConfigured")}
            </p>

          </div>
        )}
      </div>
    </div>
  );
};

export default Dine;