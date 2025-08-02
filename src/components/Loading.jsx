// components/Loading.jsx

import { Loader2 } from "lucide-react"; // من ShadCN
import React from "react";

const Loading = () => {
  return (
    // هذا الجزء كان مفقودًا، وهو الذي يعرض الـ loader الفعلي
    <Loader2 className="h-10 w-10 animate-spin text-bg-primary" /> 
  );
};

export default Loading;