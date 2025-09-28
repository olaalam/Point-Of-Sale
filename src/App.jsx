import './App.css'
import { RouterProvider } from "react-router-dom";
import router from "./router"; 
import './firebase'; // Or import specific exports from your firebase.js

function App() {
  return <RouterProvider router={router} />;
}
export default App;

