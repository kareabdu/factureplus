import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Apply saved theme on startup — respects cached choice, otherwise follows system preference
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (savedTheme !== "system") {
  document.documentElement.classList.remove("dark");
} else {
  const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)