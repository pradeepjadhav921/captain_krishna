import {React,useState } from 'react';
import { useNavigate } from "react-router-dom";
import './header.css'; // Import CSS for styling

const Header = () => {

  const [showDropdown, setShowDropdown] = useState(false); // ✅ Add this inside your component
  const navigate = useNavigate();

    // Handle logout functionality
    const handleLogout = () => {
      localStorage.clear();
      navigate("/");
    };




  return (
    <header className="header">
      {/* Title */}
      <div className="header-title">My App</div>

      {/* Buttons */}
      <div className="header-buttons">
        <button className="header-button" onClick={() => alert('Add Item clicked!')}>
          Add Item
        </button>
        <button className="header-button" onClick={() => alert('Add Table clicked!')}>
          Add Table
        </button>
        <button className="logot-button" onClick={handleLogout} >
          Logout
        </button>
          {/* Dropdown Button */}
        <div className="dropdown">
          <button className="menu-button" onClick={() => setShowDropdown(!showDropdown)}>
            ⚙️ More Options ▼
          </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <button onClick={() => navigate('/billing-history')}>🧾 Billing History</button>
                <button onClick={() => navigate('/edit-menu')}>✏️ Edit Menu</button>
                <button onClick={() => navigate('/sales-report')}>📊 Sales Report</button>
              </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;