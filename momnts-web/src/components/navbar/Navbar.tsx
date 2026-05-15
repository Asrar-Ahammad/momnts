import React from 'react';
import { Link } from 'react-router';
import { ThemeToggle } from '../theme-toggle';

const Navbar = () => {
  return (
    <div className="relative">

      <nav className="fixed top-0 left-1/2 -translate-x-1/2 w-[70%] max-w-[70%] h-[80px] bg-white flex items-center justify-between px-8 rounded-b-[2.5rem] z-50">


        <div className="absolute top-0 -left-8 w-8 h-8 bg-[radial-gradient(circle_at_0_100%,transparent_31.5px,white_32px)] pointer-events-none" />


        <div className="absolute top-0 -right-8 w-8 h-8 bg-[radial-gradient(circle_at_100%_100%,transparent_31.5px,white_32px)] pointer-events-none" />


        <div className="">
          <div>
            <div className="">
              <span className='text-3xl font-logo'>Momnts</span>
            </div>
          </div>
        </div>


        <div className="hidden md:flex items-center space-x-10 text-[15px] font-semibold text-gray-500">
          <a href="#home" className="text-gray-900 transition-colors">Home</a>
          <a href="#about" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
        </div>


        <div className="flex items-center justify-center gap-3">
          <ThemeToggle />
          <Link to="/register">
          <button className="bg-[#1a1a1a] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer dark:bg-white dark:text-black">
            Get Started
          </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;