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
import { ToastContainer } from "react-toastify";

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
    navigate(`order-page/add/${address.id}`);
  };

  // Modified handleConfirmDelivery function
  const handleConfirmDelivery = (user, addressId) => {
    const selectedAddress = user.address.find((addr) => addr.id === addressId);

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
      selectedAddress: selectedAddress,
    };
    localStorage.setItem("selected_user_data", JSON.stringify(userData));
    console.log("Attempting to navigate to /order-page with state:", {
      orderType: "delivery",
      userId: user.id,
      addressId: addressId,
    });

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
<div className={`bg-gray-100 min-h-screen ${!searchQuery && filteredusers.length === 0 ? "flex items-center justify-center" : ""}`}>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-3">
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

        {searchQuery ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredusers.length === 0 && !isLoading && !error ? (
              <p className="text-gray-500 text-center col-span-2">
                No users found matching your search.
              </p>
            ) : (
              filteredusers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg border"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-bg-primary" />
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {user.f_name} {user.l_name}
                      </div>
                    </div>
                    <Pencil
                      className="w-5 h-5 text-bg-primary cursor-pointer"
                      onClick={() => handleEditClick(user)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <Phone className="w-4 h-4 text-bg-primary" />
                    <span className="text-md">{user.phone}</span>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-3">
                    {user.address && user.address.length > 0 ? (
                      user.address.map((address, index) => (
                        <div
                          key={`${user.id}-${address.id}-${index}`}
                          className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${
                            selectedAddressId === address.id
                              ? "bg-red-50 border-red-500"
                              : "bg-gray-50"
                          }`}
                          onClick={() => {
                            setSelectedAddressId(address.id);
                            setSelectedUserId(user.id);
                            setSelecteduser(user);
                          }}
                        >
                          <div className="flex gap-2 items-start">
                            <MapPin className="w-5 h-5 mt-1 text-bg-primary" />
                            <span className="text-sm text-gray-800">
                              {address.zone?.zone ||
                                address.zone ||
                                "Unknown Zone"}{" "}
                              -{" "}
                              {address.address || address.name || "No address"}
                            </span>
                          </div>
                          <Pencil
                            className="w-4 h-4 text-bg-primary cursor-pointer"
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
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 mt-5">
                    <button
                      className="w-1/2 bg-bg-primary hover:bg-red-700 text-white py-2 rounded-md"
                      onClick={() => navigate(`/add?user_id=${user.id}`)}
                    >
                      + Add Address
                    </button>

                    {selectedAddressId && selectedUserId === user.id && (
                      <button
                        className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                        onClick={() =>
                          handleConfirmDelivery(user, selectedAddressId)
                        }
                      >
                        Confirm Delivery
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
<div className="flex justify-center items-center h-[60vh]">
  <p className="text-center text-gray-500 text-lg">
    🔍 Please search by name or phone to find users.
  </p>
</div>


        )}
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
