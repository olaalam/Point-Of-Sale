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
import {  ToastContainer } from "react-toastify";

export default function Delivery({ orderType: propOrderType }) {
  const [searchQuery, setSearchQuery] = useState("");
 const orderType = propOrderType || "delivery";

  const [filteredusers, setFilteredusers] = useState([]);
  const navigate = useNavigate();
  const [selecteduser, setSelecteduser] = useState(null);
  const [editData, setEditData] = useState({ name: "", phone: "" });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // جرب تغيير endpoint ليشمل العناوين
  const { data, error, isLoading, refetch } = useGet("cashier/user");
  const { postData } = usePost();

  // إضافة console.log للتشخيص
  useEffect(() => {
    console.log("Raw data from API:", data);
    if (data?.users) {
      console.log("users array:", data?.users);
      data?.users.forEach((user, index) => {
        console.log(`user ${index}:`, user);
        console.log(`user ${index} address:`, user?.address);
      });
      setFilteredusers(data.users);
    }
  }, [data]);

  const handleInstantSearch = (query) => {
    setSearchQuery(query);

    if (!data?.users) {
      setFilteredusers([]);
      return;
    }

    if (!query) {
      setFilteredusers(data.users);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filtered = data.users.filter((user) => {
      const fullName = `${user.f_name} ${user.l_name}`.toLowerCase();
      const matchesName = fullName.includes(lowerCaseQuery);
      const matchesPhone =
        user.phone && String(user.phone).includes(lowerCaseQuery);
      return matchesName || matchesPhone;
    });
    setFilteredusers(filtered);
  };

  const handleAddUser = () => {
    navigate("/add");
  };

  const handleEditClick = (user) => {
    setSelecteduser(user);
    setEditData({
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
    });
    setOpenDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selecteduser) return;
    await postData(`cashier/user/update/${selecteduser.id}`, editData);
    setOpenDialog(false);
    refetch();
  };

  const handleEditAddressClick = (address) => {
    navigate(`add/${address.id}`);
  };

  // Modified handleConfirmDelivery function
  const handleConfirmDelivery = (user, addressId) => {
    const selectedAddress = user.address.find(addr => addr.id === addressId);
    
    // Store user data in localStorage
    localStorage.setItem("selected_user_id", user.id);
    localStorage.setItem("selected_address_id", addressId);
    localStorage.setItem("order_type", "delivery");
    
    // Store complete user data for quick access
    const userData = {
      id: user.id,
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
      selectedAddress: selectedAddress
    };
    localStorage.setItem("selected_user_data", JSON.stringify(userData));
 console.log("Attempting to navigate to /order-page with state:", { orderType: "delivery", userId: user.id, addressId: addressId });

    // Navigate to items page
  navigate("/delivery-order", {
  state: {
  orderType: "delivery",
  userId: user.id,
  addressId: addressId,
  },
 });
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
            placeholder="Search user Name or Phone"
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
          {filteredusers.length === 0 &&
            !isLoading &&
            !error &&
            searchQuery && (
              <p className="text-gray-500 text-center">
                No users found matching your search.
              </p>
            )}
          {filteredusers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg p-4 my-4 shadow-sm"
            >
              <div className="flex gap-6 mb-4">
                {/* user Name */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-bg-primary" />
                    </div>
                    <span className="text-gray-800">
                      {" "}
                      {user.f_name} {user.l_name}
                    </span>
                  </div>
                  <Pencil
                    className="w-4 h-4 text-bg-primary cursor-pointer ml-4"
                    onClick={() => handleEditClick(user)}
                  />
                </div>

                {/* user Phone */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-bg-primary" />
                    <span className="text-gray-800">{user.phone}</span>
                  </div>
                </div>
              </div>
              {/* user address */}
              {user.address && user.address.length > 0 ? (
                user.address.map((address, index) => (
                  <div
                    key={`${user.id}-${address.id}-${index}`}
                    className="flex items-center justify-between mb-3"
                  >
                    <div
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-md transition-all 
    ${
      selectedAddressId === address.id
        ? "bg-red-100 border border-bg-primary"
        : "bg-gray-100"
    }`}
                      onClick={() => {
                        setSelectedAddressId(address.id);
                        setSelectedUserId(user.id);
                        setSelecteduser(user);
                      }}
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
                  <span>No address available</span>
                </div>
              )}

              {console.log(`user ${user.name} address:`, user.address)}

              {/* Add Address Button */}
              <div className="flex gap-4 mt-4">
                <button
                  className="w-[50%] bg-bg-primary text-white p-2 rounded-xl font-medium"
                  onClick={() => navigate(`/add?user_id=${user.id}`)}
                >
                  + Add Another Address
                </button>

                {selectedAddressId && selectedUserId === user.id && (
                  <button
                    className="w-[50%] bg-green-600 text-white p-2 rounded-xl font-medium"
                    onClick={() => handleConfirmDelivery(user, selectedAddressId)}
                  >
                    Confirm Delivery
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="space-y-4 bg-white">
          <h2 className="text-xl font-semibold text-center text-bg-primary">
            Edit user
          </h2>
          <Input
            value={editData.f_name}
            onChange={(e) =>
              setEditData({ ...editData, f_name: e.target.value })
            }
            placeholder="First Name"
            className="border-gray-300"
          />
          <Input
            value={editData.l_name}
            onChange={(e) =>
              setEditData({ ...editData, l_name: e.target.value })
            }
            placeholder="Last Name"
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
          <Input
            value={editData.phone_2}
            onChange={(e) =>
              setEditData({ ...editData, phone_2: e.target.value })
            }
            placeholder="Another Phone"
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
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
}