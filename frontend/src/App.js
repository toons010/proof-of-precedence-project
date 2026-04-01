import React, { useState } from "react";
import Navbar from "./Navbar";
import Home from "./Home";
import HowItWorks from "./HowItWorks";
import { TechPage } from "./TechPage";
import AppPage from "./AppPage";
import Footer from "./Footer";
import "./global.css";

export default function App() {
  const [page, setPage]     = useState("home");
  const [wallet, setWallet] = useState("");

  const navigate = (p) => setPage(p);

  const renderPage = () => {
    switch(page) {
      case "home": return <Home navigate={navigate} />;
      case "how":  return <HowItWorks navigate={navigate} />;
      case "tech": return <TechPage navigate={navigate} />;
      case "app":  return <AppPage onWalletChange={setWallet} />;
      default:     return <Home navigate={navigate} />;
    }
  };

  return (
    <div>
      <Navbar currentPage={page} navigate={navigate} wallet={wallet} />
      <main key={page}>
        {renderPage()}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}