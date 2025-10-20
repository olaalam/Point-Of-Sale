import { createBrowserRouter } from "react-router-dom";
import Login from "./components/Login";
import ProtAuth from "./components/Auth/ProtAuth";
import MainLayouts from "./Layout/MainLayouts";
import { SidebarProvider } from "./components/ui/sidebar";
import AuthLayout from "./Layout/AuthLayout";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Home from "./Pages/Home";
import Cashier from "./Pages/Cashier";
import Item from "./Pages/Item";
import Orders from "./Pages/OrdersView";
import TakeAway from "./Pages/TakeAway";
import NotFound from "./Pages/NotFound";
import DeliveryAdd from "./Pages/Delivery/DeliveryAdd";
import OrdersView from "./Pages/OrdersView";
import Shift from "./Pages/Shift";
import PendingOrders from "./Pages/PendingOrders";
import Notifications from "./components/Notifications";
import Profile from "./Pages/Profile";

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: (
          <ProtAuth>
            <Login />
          </ProtAuth>
        ),
      },
      {
        path: 'notifications',
        element: <Notifications />,
      },
    ],
  },

  {
    element: (
      <SidebarProvider>
        <MainLayouts />
      </SidebarProvider>
    ),
    children: [
      // for take away
      {
        path: "/",
        element: (
          <ProtectedRoute >
            <Home />
          </ProtectedRoute>
        ),
      },

      // for delivery
      {
        path: "/deliveryusers",
        element: (
          <ProtectedRoute >
            <Home />
          </ProtectedRoute>
        ),
      },
      // for dine in 
      {
        path: "/order-page",
        element: (
          <ProtectedRoute >
            {" "}
            {/* نفس permission الـ Home */}
            <Home />
          </ProtectedRoute>
        ),
      },
       {
        path: "/profile",
        element: (
          <ProtectedRoute >
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/delivery-order",
        element: (
          <ProtectedRoute >
            <Home />
          </ProtectedRoute>
        ),
      },

      {
        path: "cashier",
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute >
                <Cashier />
              </ProtectedRoute>
            ),
          },
        ],
      },
      
      {
        path: "item",
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute >
                <Item />
              </ProtectedRoute>
            ),
          },
        ],
      },

      {
        path: "order",
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute >
                <Orders />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "take",
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute>
                <TakeAway />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "add", // حالة الإضافة
        element: <DeliveryAdd />,
      },
      {
        path: "/order-page/add/:id", // حالة التعديل
        element: <DeliveryAdd />,
      },

      {
        path: "orders",
        element: <OrdersView />,
      },
      {
        path: "shift",
        element: (
          <ProtectedRoute >
              <Shift/>
          </ProtectedRoute>
        ),
      },
            {
        path: "pending-orders",
        element: (
          <ProtectedRoute >
              <PendingOrders/>
          </ProtectedRoute>
        ),
      },

      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
],
{
  basename: "/point-of-sale", 
}
);

export default router;
