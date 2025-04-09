import React, { useState, useEffect } from "react";
import { useNavigate, useLocation  } from "react-router-dom";
import { autoLogout } from "../../utility/autoLogout.jsx";
import { useParams } from "react-router-dom";
import { initializeUSBPrinter, printReceiptViaUSB } from "../../utility/usbPrinterUtility.jsx";
import "./table_kot.css";

const POSSystem = () => {
  // State management
  const location = useLocation();
  const [menuData, setMenuData] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // const [bill, setBill] = useState([]);
  const [tableStatus, setTableStatus] = useState("Available");
  const [showPortionPopup, setShowPortionPopup] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();
  const [idSearch, setIdSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [lastSelectedItem, setLastSelectedItem] = useState(null);
  const { section, tableNumber } = useParams();
  const decodedSection = decodeURIComponent(section);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [bill, setBill] = useState(() => {
    try {
      const savedBill = localStorage.getItem(`table-${decodedSection}-${tableNumber}-bill`);
      return savedBill ? JSON.parse(savedBill) : [];
    } catch (error) {
      console.error("Error loading bill:", error);
      return [];
    }
  });

  // // Auto logout timer
  // useEffect(() => {
  //   const interval = autoLogout(navigate);
  //   return () => clearInterval(interval);
  // }, [navigate]);

  // Fetch menu data
  useEffect(() => {
    const fetchMenu = async () => {
      let mockMenu
      try {
        if (decodedSection.includes("ac")) {
          mockMenu = JSON.parse(localStorage.getItem("acmenu"));
        } else {
          mockMenu = JSON.parse(localStorage.getItem("menu"));
        }
        console.log("kot:", mockMenu);
        if (mockMenu) {
          setMenuData(mockMenu);
          setFilteredMenu(mockMenu);
        } else {
          console.error("Error fetching menu not found:");
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      }
    };

    fetchMenu();
  }, []);


  //get item from captain
  useEffect(() => {

     // Change to HTTP for local development
    const eventSource = new EventSource("https://api2.nextorbitals.in/api/get_order?hotel_name=pj");
    eventSource.onmessage = (event) => {
      try {
        const orderData = JSON.parse(event.data);      
  
        // Validate order data structure
        if (!orderData.section || !orderData.table || !orderData.order_details) {
          console.error("Invalid order data structure:", orderData);
          return;
        }
  
        // Check if this order is for the current table
        if (orderData.section === decodedSection && orderData.table === tableNumber) {
          const storageKey = `table-${decodedSection}-${tableNumber}-bill`;
          const currentBill = JSON.parse(localStorage.getItem(storageKey)) || [];
  
          // Create a map of existing items for quick lookup
          const existingItemsMap = new Map();
          currentBill.forEach(item => {
            const key = `${item.id}-${item.portion}`;
            existingItemsMap.set(key, item);
          });
  
          // Process new items
          const updatedBill = [...currentBill];
          
          orderData.order_details.forEach(newItem => {
            const itemKey = `${newItem.id}-${newItem.portion}`;
            
            if (existingItemsMap.has(itemKey)) {
              // Update existing item (add quantity)
              const existingItem = existingItemsMap.get(itemKey);
              updatedBill.push({
                ...existingItem,
                quantity: (existingItem.quantity || 1) + (newItem.quantity || 1),
                timestamp: new Date().toISOString()
              });
            } else {
              // Add new item
              updatedBill.push({
                ...newItem,
                quantity: newItem.quantity || 1,
                timestamp: new Date().toISOString()
              });
            }
          });
  
          // Update both state and localStorage
          localStorage.setItem(storageKey, JSON.stringify(updatedBill));
          setBill(updatedBill);
          
          // Optional: Show notification instead of reload
          // alert(`New items added to ${decodedSection} Table ${tableNumber}`);
        }
      } catch (error) {
        console.error("Error processing order update:", error);
      }
    };
  
    return () => {
      eventSource.close();
    };
  }, [decodedSection, tableNumber]); // Add dependencies

// Update your payment handler
const handlePayment = async () => {
  try {
    // Prepare bill data
    const billData = {
      section: decodedSection,
      tableNumber,
      groupedItems: getGroupedItems(),
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal()
    };
    
    // Print receipt
    if (printerDevice) {
      await printReceiptViaUSB(
        printerDevice,
        billData,
        calculateSubtotal(),
        calculateTax(),
        calculateTotal()
      );
    } else {
      throw new Error('Printer not connected');
    }
    
    // Show success message
    alert(`Payment processed for ¥${calculateTotal().toFixed(2)}`);
    
    // Clear the bill after successful payment
    clearBill();
  } catch (error) {
    console.error('Payment/printing error:', error);
    alert(`Payment processed but printing failed: ${error.message}`);
  }
};





  //used to change table status to busy and free
  useEffect(() => {
    if (bill.length > 0) {
      saveTableData();
    }
  }, [bill, decodedSection, tableNumber]);


// Initialize printer when component mounts
// useEffect(() => {
//   const initPrinter = async () => {
//     try {
//       const device = await initializeUSBPrinter();
//       setPrinterDevice(device);
//     } catch (error) {
//       console.warn('Printer initialization failed:', error);
//       // You might want to show a warning to the user
//     }
//   };
  
//   initPrinter();
  
//   return () => {
//     if (printerDevice) {
//       printerDevice.close();
//     }
//   };
// }, []);




  // Custom function to update both state and localStorage
  const updateBill = (newBill) => {
    setBill(newBill);
    localStorage.setItem(`table-${decodedSection}-${tableNumber}-bill`, JSON.stringify(newBill));
  };
  // // Initialize state from saved data on component mount
  // useEffect(() => {
  //   setBill(tableData.bill);
  //   setTableStatus(tableData.status);
  // }, [tableNumber]); // Only run when tableNumber changes


  // // Update/load/save table orders
  // useEffect(() => {
  //   // Save table data whenever it changes
  //   sessionStorage.setItem(`table-${tableNumber}`, JSON.stringify({
  //     bill: bill,
  //     status: tableStatus
  //   }));
  // }, [bill, tableNumber, tableStatus]);





  // // Try to get saved data from session storage
  // const [tableData, setTableData] = useState(() => {
  //   const savedData = sessionStorage.getItem(`table-${tableNumber}`);
  //     return savedData ? JSON.parse(savedData) : {
  //       bill: [],
  //       status: "Available"
  //   };
  // });
  

  // Search functionality
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    let filtered = menuData;
    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.menu === selectedCategory);
    }
    if (query !== "") {
      filtered = filtered.filter(item => 
        item.submenu.toLowerCase().includes(query) || 
        item.id.toString().includes(query)
      );
    }
    setFilteredMenu(filtered);
  };
  // 5. Now define other functions that use bill or updateBill
  const getPortionCount = (id, portion) => {
    return bill.filter(item => 
      item.id === id && item.portion === portion
    ).length || 0;
  };

  // Category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    if (category === "All") {
      setFilteredMenu(menuData);
    } else {
      setFilteredMenu(menuData.filter(item => item.menu === category));
    }
  };

  // Item selection handler
  const handleItemClick = (item) => {

      setSelectedItem(item);
      setLastSelectedItem(item);
      
      if (item.half_price > 0) {
        setShowPortionPopup(true);
      } else {
        addToBill(item, 'full');
      }
    // setSelectedItem(item);
    // setLastSelectedItem(item);
    
    // // Clear search fields
    // // setIdSearch("");
    // // setNameSearch("");
    
    // // Reset filtered menu to show all items in current category
    // let filtered = menuData;
    // if (selectedCategory !== "All") {
    //   filtered = filtered.filter(i => i.menu === selectedCategory);
    // }
    // setFilteredMenu(filtered);
    
    if (item.half_price > 0) {
      setShowPortionPopup(true);
    } else {
      addToBill(item, 'full');
    }
  };



// Utility function to update localStorage lunch event
const updateLocalStorage = (sectionName, tableNumber, newStatus) => {
  const storedTables = localStorage.getItem("tables");
  if (!storedTables) return null;

  const tablesData = JSON.parse(storedTables);

  const updatedSections = tablesData.data.map(section => {
    if (section.section === sectionName) {
      return {
        ...section,
        table_status: {
          ...section.table_status,
          [tableNumber]: newStatus
        }
      };
    }
    return section;
  });

  const updatedData = {
    ...tablesData,
    data: updatedSections
  };

  localStorage.setItem("tables", JSON.stringify(updatedData));


  //Notify other components/tabs about the change
  window.dispatchEvent(new Event('storage'));
  
  // Alternative notification method
  window.dispatchEvent(new CustomEvent('tableStatusChanged', {
    detail: {
      section: decodedSection,
      tableNumber,
      status: "free"
    }
  }));

  return updatedData;
};



// Clear bill
const clearBill = () => {
  updateBill([]);
  setTableStatus("Available");
  sessionStorage.removeItem(`table-${tableNumber}`);

  
  const existingData = JSON.parse(localStorage.getItem('tableTotals') || '{}');
  delete existingData[`${decodedSection}-${tableNumber}`];
  localStorage.setItem('tableTotals', JSON.stringify(existingData));
  
};


  // Close popup
  const closePopup = () => {
    setShowPortionPopup(false);
    setSelectedItem(null);
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return bill.reduce((total, item) => total + item.price, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Get unique categories
  const uniqueCategories = ["All", ...new Set(menuData.map(item => item.menu))];

  // ID search handler (exact match for alphanumeric IDs)
  // Search handlers (modified to maintain last selected item)
  const handleIdSearch = (e) => {
    const query = e.target.value;
    setIdSearch(query);
    filterMenu(query, nameSearch);
    setLastSelectedItem(null); // Clear last selection when searching
  };

  // Name search handler (fuzzy match)
  const handleNameSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setNameSearch(query);
    filterMenu(idSearch, query);
    setLastSelectedItem(null); // Clear last selection when searching
  };


  const filterMenu = (idQuery, nameQuery) => {
    let filtered = menuData;
    
    // Apply category filter first
    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.menu === selectedCategory);
    }
  
    // Apply exact ID match if ID search has value
    if (idQuery !== "") {
      filtered = filtered.filter(item => 
        item.id.toString().toLowerCase() === idQuery.toLowerCase()
      );
    }
  
    // Apply name filter if name search has value
    if (nameQuery !== "") {
      filtered = filtered.filter(item => 
        item.submenu.toLowerCase().includes(nameQuery)
      );
    }
  
    setFilteredMenu(filtered);
  };

  const getGroupedItems = () => {
    const grouped = {};
    bill.forEach(item => {
      const key = `${item.id}-${item.portion}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          quantity: 1
        };
      } else {
        grouped[key].quantity += 1;
      }
    });
    
    return Object.values(grouped);
  };

  // Add item to bill
  const addToBill = (item, portionType) => {
    const price = portionType === 'half' ? item.half_price : item.full_price;
    const portion = portionType === 'half' ? 'Half' : 'Full';
    
    const newItem = {
      ...item,
      price,
      portion,
      timestamp: new Date().toISOString()
    };
    
    updateBill([...bill, newItem]);
    setTableStatus("Busy");
    setShowPortionPopup(false);
  };

  const increaseQuantity = (id, portion) => {
    const itemToAdd = menuData.find(item => item.id === id);
    if (itemToAdd) {
      const portionType = portion === 'Half' ? 'half' : 'full';
      addToBill(itemToAdd, portionType);
    }
  };
  
  const decreaseQuantity = (id, portion) => {
    // Find the last occurrence of this item+portion in the bill
    const itemIndex = bill.map(item => `${item.id}-${item.portion}`).lastIndexOf(`${id}-${portion}`);
    
    if (itemIndex !== -1) {
      const newBill = [...bill];
      newBill.splice(itemIndex, 1);
      setBill(newBill);
      
      // Update table status if bill becomes empty
      if (newBill.length === 0) {
        setTableStatus("Available");
      }
    }
  };
  
  const removeItem = (id, portion) => {
    const newBill = bill.filter(item => 
      !(item.id === id && item.portion === portion)
    );
    setBill(newBill);
    
    // Update table status if bill becomes empty
    if (newBill.length === 0) {
      setTableStatus("Available");
    }
  };
  
  // In your POSSystem component, modify the back button handler:
  const handleBack = () => {
    console.log("Decoded section:", decodedSection,tableNumber);
    navigate('/tables', {
      state: {
        fromPOS: true,
        section: decodedSection,
        tableNumber: tableNumber
      }
    });
  };

const [printerError, setPrinterError] = useState(null);

const handleConnectPrinter = async () => {
  setPrinterError(null);
  
  try {
    const device = await initializeUSBPrinter();
    setPrinterDevice(device);
  } catch (error) {
    if (error.message.includes('No device selected') || 
        error.message.includes('Please select')) {
      setPrinterError('Please select a printer from the browser dialog');
    } else {
      setPrinterError(error.message);
    }
  }
};


  navigator.usb.requestDevice({ filters: [] }).then(device => {
    console.log('Connected Device:', {
      vendorId: device.vendorId,
      productId: device.productId,
      manufacturer: device.manufacturerName,
      product: device.productName
    });
  });


  //First, modify your POSSystem component to store the total price:
  const saveTableData = () => {
    const tableData = {
      section: decodedSection,
      tableNumber,
      total: calculateTotal(),
      lastUpdated: new Date().toISOString()
    };
  
    // Get existing table totals or create new object
    const existingData = JSON.parse(localStorage.getItem('tableTotals') || '{}');
    
    // Update the specific table's data
    const updatedData = {
      ...existingData,
      [`${decodedSection}-${tableNumber}`]: tableData
    };
    

    localStorage.setItem('tableTotals', JSON.stringify(updatedData));
  };
  


  return (
    <div className="pos-container">
      <div className="pos-header">
        <div className="table-info">
          <h1>{decodedSection} Table {tableNumber}</h1>
          <div className={`status ${tableStatus.toLowerCase()}`}>
            {tableStatus}
          </div>
        </div>
        <button className="back-button" onClick={handleBack}>⬅ Back to Tables</button>
      </div>

      { /* Search bar */ }
      <div className="search-bars-container">
        <div className="search-bars">
          <div className="search-bars-inner">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by ID..."
                value={idSearch}
                onChange={handleIdSearch}
                className="search-input"
              />
              <span className="search-icon">#</span>
            </div>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name..."
                value={nameSearch}
                onChange={handleNameSearch}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="menu-items-aligned-container">
          {filteredMenu.length > 0 ? (
            <div className="menu-grid">
              {filteredMenu.map(item => (
                <div 
                  key={item.id} 
                  className="menu-item-card" 
                  onClick={() => handleItemClick(item)}
                >
                  <h3>{item.submenu}</h3>
                  <div className="portion-prices">
                    {item.half_price > 0 && (
                      <div className="portion-count">
                        <span>Half: ¥{item.half_price}</span>
                        <span className="quantity-badge">
                          {getPortionCount(item.id, 'Half')}
                        </span>
                      </div>
                    )}
                    <div className="portion-count">
                      <span>Full: ¥{item.full_price}</span>
                      <span className="quantity-badge">
                        {getPortionCount(item.id, 'Full')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              No items found matching your search
            </div>
          )}
        </div>
      </div>
      { /* Search bar */ }


      <div className="pos-categories">
        <div className="categories-horizontal-list">
          {uniqueCategories.map(category => (
            <button
              key={category}
              className={`category-button ${selectedCategory === category ? "active" : ""}`}
              onClick={() => handleCategorySelect(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      

      { /* Menu items box and order summery */}
      <div className="pos-content">
       
        { /* Menu items box */}
        <div className="pos-menu-items">
          {filteredMenu.map(item => (
            <div 
              key={item.id} 
              className="menu-item" 
              onClick={() => handleItemClick(item)}
            >
              <h3>{item.submenu}</h3>
              {item.half_price > 0 ? (
                <p>¥{item.half_price} / ¥{item.full_price}</p>
              ) : (
                <p>¥{item.full_price}</p>
              )}
            </div>
          ))}
        </div>{ /* Menu items box */}

        { /* Order summary */}
        <div className="pos-order-summary">

          <div className="order-header">
            <h2>Order Summary</h2>
            <button className="clear-btn" onClick={clearBill}>
              <strong>Clear</strong>
            </button>
          </div>
            

          <div className="order-items">
            {getGroupedItems().map((group, index) => (
              <div key={`${group.id}-${index}`} className="order-item">
                <div className="item-info">
                  <p><strong>{group.submenu}</strong> {group.half_price > 0 && ` (${group.portion})`}</p>
                </div>
                
                <div className="quantity-controls">
                  <button className="qty-btn minus"
                    onClick={() => decreaseQuantity(group.id, group.portion)}
                    disabled={group.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="item-qty">{group.quantity}</span>
                  <button 
                    className="qty-btn plus"
                    onClick={() => increaseQuantity(group.id, group.portion)}
                  >
                    +
                  </button>
                </div>
                
                <div className="price-section">
                  <p className="item-price">¥{(group.price * group.quantity).toFixed(2)}</p>
                  <button 
                    className="remove-btn"
                    onClick={() => removeItem(group.id, group.portion)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <p>Subtotal: ¥{calculateSubtotal().toFixed(2)}</p>
            <p>Tax (18%): ¥{calculateTax().toFixed(2)}</p>
            <p><strong>Total: ¥{calculateTotal().toFixed(2)}</strong></p>
          </div>

          <button 
            className="payment-btn" 
            disabled={bill.length === 0}
            onClick={handlePayment}  // Changed from alert to handlePayment
            >
            Process Payment (¥{calculateTotal().toFixed(2)})
          </button>
          <div className="printer-status">
            Printer Status: 
            <span className={printerDevice ? "connected" : "disconnected"}>
              {printerDevice ? "Connected" : "Disconnected"}
            </span>
            <button 
              onClick={handleConnectPrinter}
              disabled={!!printerDevice} // Disable if already connected
            >
              {printerDevice ? "Connected" : "Connect Printer"}
            </button>
          </div>
        </div>{ /* Order summary */}
      </div> { /* Menu items box and order summery */}


      {/* Portion Selection Popup */}
      {showPortionPopup && selectedItem && (
        <div className="popup-overlay">
          <div className="portion-popup">
            <h3>{selectedItem.submenu}</h3>
            <div className="portion-options">
              <button 
                className="portion-btn"
                onClick={() => addToBill(selectedItem, 'half')}
              >
                Half Portion - ¥{selectedItem.half_price}
              </button>
              <button 
                className="portion-btn"
                onClick={() => addToBill(selectedItem, 'full')}
              >
                Full Portion - ¥{selectedItem.full_price}
              </button>
            </div>
            <button className="cancel-btn" onClick={closePopup}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
