import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dine = ({ orderType: propOrderType }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const orderType = propOrderType || location.state?.orderType || "dine_in";
  const branch_id = localStorage.getItem("branch_id");

  const [selectedTable, setSelectedTable] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedLocationId, setSelectedLocationId] = useState(null); // لتحديد التاب الحالي

  const { data, isLoading, error } = useGet(
    `captain/selection_lists?branch_id=${branch_id}`
  );

  const locations = data?.cafe_location || [];

  useEffect(() => {
    const storedTableId = localStorage.getItem("table_id");
    if (storedTableId) {
      setSelectedTable(parseInt(storedTableId));
    }

    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id); // أول تاب بشكل افتراضي
    }
  }, [locations, selectedLocationId]); // Add selectedLocationId to dependencies

  // Reset currentPage when selectedLocationId changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocationId]);

  const selectedLocation = locations.find(
    (loc) => loc.id === selectedLocationId
  );
  const tablesToDisplay = selectedLocation?.tables || [];
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
        return "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200";
    }
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table.id);
    localStorage.setItem("table_id", table.id);
    navigate("/", {
      state: {
        orderType: "dine_in",
        tableId: table.id,
      },
    });
  };

  const TableCard = ({ table }) => (
    <div
      className={`
        relative rounded-lg p-5 border shadow-sm transition-all duration-200 ease-in-out
        ${getTableColor(table.current_status)}
        ${table.current_status === tableStates.available ? "border-dashed" : ""}
        ${selectedTable === table.id ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        cursor-pointer transform hover:scale-[1.02]
      `}
      onClick={() => handleSelectTable(table)}
    >
      <div className="text-center">
        <div className="text-3xl font-extrabold mb-2">
          {table.table_number}
        </div>
        <div className="flex items-center justify-center gap-2 text-base font-medium">
          <Users size={20} />
          <span>Capacity: {table.capacity}</span>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg shadow-md mx-auto max-w-lg mt-10">
        <p className="text-lg font-semibold">Failed to load tables.</p>
        <p className="text-sm mt-2">Please check your network connection or try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">Dine-in Tables</h1>
          <p className="text-gray-500 mt-2">Select a table to start an order.</p>
        </div>

        {locations.length > 0 ? (
          <Tabs
            value={selectedLocationId?.toString()}
            onValueChange={(val) => {
              setSelectedLocationId(parseInt(val));
              setCurrentPage(1); // Reset to first page when changing tab
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
                  {loc.name}
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
                      <p className="text-lg">No tables found for this location.</p>
                      <p className="text-sm">Please select another location or add tables.</p>
                    </div>
                  )}

                  {/* Pagination */}
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
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages)
                              );
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
            <p className="text-lg text-gray-600 font-semibold">No cafe locations found for this branch.</p>
            <p className="text-sm text-gray-500 mt-2">Please ensure locations are configured in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dine;