import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import App from "./App";
import { ExportView } from "./ExportView";

const isExport = new URLSearchParams(location.search).get("export") === "1";
createRoot(document.getElementById("root")!).render(<StrictMode>{isExport ? <ExportView /> : <App />}</StrictMode>);
