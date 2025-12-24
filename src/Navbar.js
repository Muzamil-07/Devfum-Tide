import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        TideLab
      </div>
      <div className="navbar-links">
        <a href="#work" className="navbar-link">work</a>
        <a href="#our-story" className="navbar-link">our story</a>
        <a href="#contact" className="navbar-link">contact</a>
      </div>
    </nav>
  );
};

export default Navbar;
