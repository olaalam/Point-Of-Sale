import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { usePost } from "@/Hooks/usePost"; // Add this import
import Loading from "@/components/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastContainer, toast } from "react-toastify"; // Add this import

const Dine = () => {
  const navigate = useNavigate();
  const branch_id = localStorage.getItem("branch_id");

  const [selectedTable, setSelectedTable] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const { data, isLoading, error } = useGet(
    `captain/selection_lists?branch_id=${branch_id}`
  );
  
  // Add usePost hook for transfer API
  const { loading: transferLoading, postData } = usePost();

  const locations = data?.cafe_location || [];

  useEffect(() => {
    const storedTableId = localStorage.getItem("table_id");
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

  // Check if there's a pending transfer on component mount
  useEffect(() => {
    const transferPending = localStorage.getItem("transfer_pending");
    if (transferPending === "true") {
      toast.info("Please select a new table to transfer the order.");
    }
  }, []);

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

  // Modified handleSelectTable to handle both normal selection and transfers
  const handleSelectTable = async (table) => {
    console.log("Table selected:", table.id);
    
    const transferPending = localStorage.getItem("transfer_pending");
    
    if (transferPending === "true") {
      // Handle transfer logic
      const cartIds = JSON.parse(localStorage.getItem("transfer_cart_ids") || "[]");
      const sourceTableId = localStorage.getItem("transfer_source_table_id");
      
      if (cartIds.length > 0 && sourceTableId) {
        // Prevent selecting the same table
        if (sourceTableId === table.id.toString()) {
          toast.error("Cannot transfer to the same table. Please select a different table.");
          return;
        }

        const formData = new FormData();
        formData.append("table_id", table.id.toString());
        
        // Append all cart IDs
        cartIds.forEach((cart_id, index) => {
          formData.append(`cart_ids[${index}]`, cart_id.toString());
        });
        
        console.log("Transfer order payload:", { 
          old_table_id: sourceTableId, 
          new_table_id: table.id,
          cart_ids: cartIds 
        });

        try {
          await postData("cashier/transfer_order", formData);
          toast.success("Order transferred successfully!");
          
          // Clear transfer data
          localStorage.removeItem("transfer_cart_ids");
          localStorage.removeItem("transfer_first_cart_id");
          localStorage.removeItem("transfer_source_table_id");
          localStorage.removeItem("transfer_pending");
          
          // Update selected table and navigate to new table
          setSelectedTable(table.id);
          localStorage.setItem("table_id", table.id);
          
          // Navigate to the new table's order page or wherever appropriate
          navigate("/order-page", {
            state: {
              order_type: "dine_in",
              table_id: table.id,
              transferred: true, // Flag to indicate this was a transfer
            },
          });
          
        } catch (err) {
          console.error("Failed to transfer order:", err);
          const errorMessage = err.response?.data?.message || 
                             err.response?.data?.exception ||
                             "Failed to transfer table. Please try again.";
          toast.error(errorMessage);
        }
      }
    } else {
      // Normal table selection logic
      setSelectedTable(table.id);
      localStorage.setItem("table_id", table.id);
      localStorage.setItem("order_type", "dine_in");

      navigate("/order-page", {
        state: {
          order_type: "dine_in",
          table_id: table.id,
        },
      });
    }
  };

  // Get transfer status for UI feedback
  const transferPending = localStorage.getItem("transfer_pending") === "true";
  const sourceTableId = localStorage.getItem("transfer_source_table_id");

  const TableCard = ({ table }) => {
    const isSourceTable = transferPending && sourceTableId === table.id.toString();
    
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
          <div className="flex items-center justify-center gap-2 text-base font-medium">
            <Users size={20} />
            <span>Capacity: {table.capacity}</span>
          </div>
          
          {/* Transfer indicators */}
          {isSourceTable && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
              Source
            </div>
          )}
          {transferPending && !isSourceTable && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Select
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
            <p className="text-sm text-gray-600">Transferring order...</p>
          </div>
        )}
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
          <h1 className="text-3xl font-bold text-gray-800">
            {transferPending ? "Select New Table for Transfer" : "Dine-in Tables"}
          </h1>
          <p className="text-gray-500 mt-2">
            {transferPending 
              ? `Select a table to transfer the order from Table ${sourceTableId}.`
              : "Select a table to start an order."
            }
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
            <p className="text-lg text-gray-600 font-semibold">No cafe locations found for this branch.</p>
            <p className="text-sm text-gray-500 mt-2">Please ensure locations are configured in the system.</p>
          </div>
        )}
      </div>
      
      {/* Add ToastContainer for notifications */}
      <ToastContainer />
    </div>
  );
};

export default Dine;