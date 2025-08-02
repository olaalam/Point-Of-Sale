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
      {
        path: "/",
        element: (
          <ProtectedRoute permissionKey="Home">
            <Home />
          </ProtectedRoute>
        ),
      },

      {
        path: "Cashier",
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute permissionKey="Cashier">
                <Cashier />
              </ProtectedRoute>
            ),
          },
          // {
          //   path: "add",
          //   element: (
          //     <ProtectedRoute permissionKey="Village">
          //       <VillageAdd />
          //     </ProtectedRoute>
          //   ),
          // },
          // {
          //   path: "single-page-v/:id",
          //   element: (
          //     <ProtectedRoute permissionKey="Village Gallery">
          //       <SinglePageV />
          //     </ProtectedRoute>
          //   ),
          // },
          // {
          //   path: "single-page-v/:id/add",
          //   element: (
          //     <ProtectedRoute permissionKey="Village Admin">
          //       <VAdminAdd />
          //     </ProtectedRoute>
          //   ),
          // },
          // {
          //   path: "single-page-v/:id/invoice/:invoiceId",
          //   element: (
          //     <ProtectedRoute permissionKey="VillagesInvoiceView">
          //       <InvoiceCard />
          //     </ProtectedRoute>
          //   ),
          // },
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
          // {
          //   path: "add",
          //   element: (
          //     <ProtectedRoute permissionKey="Village Admin Role">
          //       <VAdminRoleAdd />
          //     </ProtectedRoute>
          //   ),
          // },
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
          // {
          //   path: "add",
          //   element: (
          //     <ProtectedRoute permissionKey="Appartment Type">
          //       <UnitsAdd />
          //     </ProtectedRoute>
          //   ),
          // },
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
          // {
          //   path: "add",
          //   element: (
          //     <ProtectedRoute permissionKey="User">
          //       <UsersAdd />
          //     </ProtectedRoute>
          //   ),
          // },
          // {
          //   path: "single-page-u/:id",
          //   element: (
          //     <ProtectedRoute permissionKey="User">
          //       <SinglePageU />
          //     </ProtectedRoute>
          //   ),
          // },
        ],
      },
      {
        path: "add", // حالة الإضافة
        element: <DeliveryAdd />,
      },
      {
        path: "add/:id", // حالة التعديل
        element: <DeliveryAdd />,
      },

      {
        path: "orders",
        element: <OrdersView />,
      },

      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
