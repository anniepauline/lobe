import "@fontsource-variable/geist";
import "@lobe/ui/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "../../ui/base.css";
import "./style.css";

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
