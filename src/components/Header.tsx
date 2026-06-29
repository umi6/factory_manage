import React from "react";
import "./Header.css";
import { Link, NavLink } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="logo">
          製造工程管理システム
        </Link>
      </div>
    </header>
  );
};

export default Header;
