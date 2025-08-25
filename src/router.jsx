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
          <ProtectedRoute permissionKey="Home">
            <Home />
          </ProtectedRoute>
        ),
      },
      // for delivery
      {
        path: "/deliveryusers",
        element: (
          <ProtectedRoute permissionKey="Home">
            <Home />
          </ProtectedRoute>
        ),
      },
      // for dine in 
      {
        path: "/order-page",
        element: (
          <ProtectedRoute permissionKey="Home">
            {" "}
            {/* نفس permission الـ Home */}
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "/delivery-order",
        element: (
          <ProtectedRoute permissionKey="Home">
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
              <ProtectedRoute permissionKey="Cashier">
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
              <ProtectedRoute permissionKey="Item">
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
              <ProtectedRoute permissionKey="Order">
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
              <ProtectedRoute permissionKey="TakeAway">
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
          <ProtectedRoute permissionKey="Shift">
              <Shift/>
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
