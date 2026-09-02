import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Library from "./pages/Library";
import Shorts from "./pages/Shorts";
import Video from "./pages/Video";
import Articles from "./pages/Articles";
import Article from "./pages/Article";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/video/:id" element={<Video />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/article/:id" element={<Article />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
