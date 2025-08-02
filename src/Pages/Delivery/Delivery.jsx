import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Phone, MapPin, User, Pencil } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { usePost } from "@/Hooks/usePost";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Delivery({ orderType: propOrderType }) {
  const [searchQuery, setSearchQuery] = useState("");
  const orderType = propOrderType || location.state?.orderType || "delivery";

  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editData, setEditData] = useState({ name: "", phone: "" });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // جرب تغيير endpoint ليشمل العناوين
  const { data, error, isLoading, refetch } = useGet(
    "cashier/customer?include=addresses"
  );
  const { postData } = usePost();

  // إضافة console.log للتشخيص
  useEffect(() => {
    console.log("Raw data from API:", data);
    if (data?.customers) {
      console.log("Customers array:", data.customers);
      data.customers.forEach((customer, index) => {
        console.log(`Customer ${index}:`, customer);
        console.log(`Customer ${index} addresses:`, customer.addresses);
      });
      setFilteredCustomers(data.customers);
    }
  }, [data]);

  const handleInstantSearch = (query) => {
    setSearchQuery(query);

    if (!data?.customers) {
      setFilteredCustomers([]);
      return;
    }

    if (!query) {
      setFilteredCustomers(data.customers);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filtered = data.customers.filter((customer) => {
      const matchesName = customer.name.toLowerCase().includes(lowerCaseQuery);
      const matchesPhone =
        customer.phone && String(customer.phone).includes(lowerCaseQuery);
      return matchesName || matchesPhone;
    });
    setFilteredCustomers(filtered);
  };

  const handleAddUser = () => {
    navigate("/add");
  };

  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setEditData({ name: customer.name, phone: customer.phone });
    setOpenDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    await postData(`cashier/customer/update/${selectedCustomer.id}`, editData);
    setOpenDialog(false);
    refetch();
  };

  const handleEditAddressClick = (address) => {
    navigate(`add/${address.id}`);
  };
  console.log("Order Type:", orderType);
  return (
    <div className="min-h-screen  bg-gray-100">
      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Search and Add User */}
        <div className="flex gap-2 items-center my-6">
          <Input
            type="text"
            placeholder="Search Customer Name or Phone"
            value={searchQuery}
            onChange={(e) => handleInstantSearch(e.target.value)}
            className="flex-grow p-3 text-lg rounded-lg border-gray-300 bg-white"
          />
          <Button
            onClick={handleAddUser}
            className="bg-bg-primary hover:bg-red-700 text-white rounded-lg px-4 py-3"
          >
            <UserPlus className="w-5 h-5 mr-1" />
            Add User
          </Button>
        </div>

        {isLoading && <Loading />}
        {error && <p className="text-bg-primary">Error: {error.message}</p>}

        <div className="w-full grid grid-cols-2 gap-6 space-y-4">
          {filteredCustomers.length === 0 &&
            !isLoading &&
            !error &&
            searchQuery && (
              <p className="text-gray-500 text-center">
                No customers found matching your search.
              </p>
            )}
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-lg p-4 my-4 shadow-sm"
            >
              <div className="flex gap-6 mb-4">
                {/* Customer Name */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-bg-primary" />
                    </div>
                    <span className="text-gray-800">{customer.name}</span>
                  </div>
                  <Pencil
                    className="w-4 h-4 text-bg-primary cursor-pointer ml-4"
                    onClick={() => handleEditClick(customer)}
                  />
                </div>

                {/* Customer Phone */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-bg-primary" />
                    <span className="text-gray-800">{customer.phone}</span>
                  </div>
                </div>
              </div>
              {/* Customer Addresses */}
              {customer.addresses && customer.addresses.length > 0 ? (
                customer.addresses.map((address, index) => (
                  <div
                    key={address.id || index}
                    className="flex items-center justify-between mb-3"
                  >
                    <div
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-md transition-all 
    ${
      selectedAddressId === address.id
        ? "bg-red-100 border border-bg-primary"
        : "bg-gray-100"
    }`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <MapPin className="w-4 h-4  text-bg-primary" />
                      <span className="text-gray-800">
                        {address.zone?.zone || address.zone || "Unknown Zone"} -{" "}
                        {address.address || address.name || "No address"}
                      </span>
                    </div>
                    <Pencil
                      className="w-4 h-4 ms-2 text-bg-primary cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAddressClick(address);
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>No addresses available</span>
                </div>
              )}

              {console.log(
                `Customer ${customer.name} addresses:`,
                customer.addresses
              )}

              {/* Add Address Button */}
              <button
                className="w-[40%] bg-bg-primary text-white p-2 rounded-xl font-medium"
                onClick={() => navigate(`/add?customer_id=${customer.id}`)}
              >
                + Add Another Address
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="space-y-4 bg-white">
          <h2 className="text-xl font-semibold text-center text-bg-primary">
            Edit Customer
          </h2>
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="Customer Name"
            className="border-gray-300"
          />
          <Input
            value={editData.phone}
            onChange={(e) =>
              setEditData({ ...editData, phone: e.target.value })
            }
            placeholder="Phone"
            className="border-gray-300"
          />
          <Button
            onClick={handleSaveEdit}
            className="w-full bg-bg-primary hover:bg-red-700 text-white"
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
