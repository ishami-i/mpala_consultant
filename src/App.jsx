import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import ThankYou from "./pages/thankYou";
import Admin from "./pages/admin";
import Gallery from "./pages/gallery";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/thank-you" element={<ThankYou />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/gallery/:category" element={<Gallery />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
