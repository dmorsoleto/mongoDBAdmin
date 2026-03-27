import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme before first render
const savedTheme = localStorage.getItem('setting_theme') ?? 'dark'
if (savedTheme === 'dark') document.documentElement.classList.add('dark')
else document.documentElement.classList.remove('dark')

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
