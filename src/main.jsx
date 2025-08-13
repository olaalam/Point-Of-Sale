import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./Store/store";
import { ShiftProvider } from "./context/ShiftContext"; // Import ShiftProvider
import './index.css'

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ShiftProvider>
      <App />
    </ShiftProvider>
  </Provider>
);