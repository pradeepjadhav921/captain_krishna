import React, { useState, useEffect } from "react";
import { useNavigate,   } from "react-router-dom";

const EditMenu = () => {
  // Default menu items with complete structure

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchID, setSearchID] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOtherCategoryInput, setShowOtherCategoryInput] = useState(false);
  const [modifiedItems, setModifiedItems] = useState([]);
  const [originalItems, setOriginalItems] = useState(() => {
    const savedMenu = localStorage.getItem("menu");
    return savedMenu ? JSON.parse(savedMenu) : [];
  });
  const [workingItems, setWorkingItems] = useState(originalItems);
 // In your newItem state initialization:
  const [newItem, setNewItem] = useState({
    id: "",
    submenu: "",
    full_price: "",
    half_price: "",
    menu: "starter", // Initialize with default value
    available: 1
  }); 
  // Load menu data from localStorage or set default values
  const [menuItems, setMenuItems] = useState(() => {
    const savedMenu = localStorage.getItem("menu");
    return JSON.parse(savedMenu);
  });



  // Get all unique categories
  const categories = ["All", ...new Set(menuItems.map(item => item.menu))];

  const updateModifiedItems = async () => {
    if (modifiedItems.length === 0) {
      alert("No changes to save!");
      return;
    }
  
    try {
      const hotel_name = localStorage.getItem("hotel_name");
      if (!hotel_name) {
        throw new Error("Hotel name not found");
      }
  
      // Track successful updates
      let successfulUpdates = 0;
      
      // Process each item individually
      for (const item of modifiedItems) {
        try {
          const payload = {
            hotel_name,
            id: item.id,
            menu: item.menu,
            submenu: item.submenu,
            full_price: item.full_price,
            half_price: item.half_price,
            available: item.available
          };
  
          console.log("Sending item to server:", payload);
  
          const response = await fetch("https://api2.nextorbitals.in/api/update_item", {
            method: "POST", // or "PUT" depending on your API
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(payload)
          });
  
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
  
          const data = await response.json();
          console.log("Item updated successfully:", data);
          successfulUpdates++;
  
        } catch (itemError) {
          console.error(`Failed to update item ${item.id}:`, itemError);
          // Continue with next item even if one fails
        }
      }
  
      // Only update local state if at least one item was successfully updated
      if (successfulUpdates > 0) {
        const updatedOriginal = originalItems.map(item => {
          const modified = modifiedItems.find(m => m.id === item.id);
          return modified || item;
        });
  
        const newItems = modifiedItems.filter(m => 
          !originalItems.some(o => o.id === m.id) && 
          modifiedItems.some(mod => mod.id === m.id && mod.success)
        );
  
        const finalItems = [...updatedOriginal, ...newItems];
        
        setOriginalItems(finalItems);
        setWorkingItems(finalItems);
        localStorage.setItem("menu", JSON.stringify(finalItems));
        setModifiedItems([]);
        
        alert(`✅ ${successfulUpdates}/${modifiedItems.length} items updated successfully!`);
      } else {
        throw new Error("All updates failed");
      }
      
    } catch (error) {
      console.error("Save operation failed:", error);
      alert(`❌ Save failed: ${error.message}`);
    }
  };

  // Handle inline edits
  // Update handleEdit to only modify workingItems
  const handleEdit = (id, field, value) => {
    setWorkingItems(prevMenu =>
      prevMenu.map(item => {
        if (item.id === id) {
          const updatedItem = { 
            ...item, 
            [field]: ["full_price", "half_price", "available"].includes(field)
              ? Number(value) || 0 
              : value
          };
          
          // Track modifications
          setModifiedItems(prev => {
            const existing = prev.find(i => i.id === id);
            if (existing) {
              return prev.map(i => i.id === id ? updatedItem : i);
            }
            return [...prev, updatedItem];
          });
          
          return updatedItem;
        }
        return item;
      })
    );
  };



  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setShowOtherCategoryInput(true);
      setNewItem({...newItem, menu: ""}); // Clear the value when Other is selected
    } else {
      setShowOtherCategoryInput(false);
      setNewItem({...newItem, menu: value});
    }
  };


  //sent to server to store in DB
  const addMenuItem = async (newItem) => {
    try {
      // Prepare the item data
      const item1 = {
        hotel_name: localStorage.getItem("hotel_name"),
        id: newItem.id,
        menu: newItem.menu,
        submenu: newItem.submenu,
        half_price: newItem.half_price ? Number(newItem.half_price) : 0,
        full_price: Number(newItem.full_price),
        available: newItem.available
      };
      
      console.log("Item to be added:", item1);
      // Make the POST request
      const response = await fetch("https://api2.nextorbitals.in/api/add_item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
          // "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(item1)
      });
  
      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Parse the JSON response
      const data = await response.json();
      console.log("Item added successfully:", data);
      return data;
  
    } catch (error) {
      console.error("Error adding menu item:", error);
      throw error; // Re-throw the error for the calling function to handle
    }
  };

  // Add new item to menu
  const addNewItem = () => {
    if (!newItem.id || !newItem.menu || !newItem.submenu || !newItem.full_price) return;

    const item = {
      id: newItem.id,
      menu: newItem.menu,
      submenu: newItem.submenu,
      half_price: newItem.half_price ? Number(newItem.half_price) : 0,
      full_price: Number(newItem.full_price),
      available: newItem.available
    };

    addMenuItem(newItem)  //sent to server to store in DB

  
    setMenuItems(prev => [...prev, item]);
    setNewItem({
      id: "",
      submenu: "",
      full_price: "",
      half_price: "",
      available: 1,
      menu: "starter" // Reset to default category
    });
  };

  // Delete item from menu
  const deleteItem = (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setMenuItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Save menuItems to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("menu", JSON.stringify(menuItems));
  }, [menuItems]);

  // Filter menu items based on search input and category
  // const filteredMenu = menuItems.filter(item =>
  //   item.submenu.toLowerCase().includes(search.toLowerCase()) &&
  //   (selectedCategory === "All" || item.menu === selectedCategory)
  // );

  // Filter menu items based on search input and category
  // Use workingItems for display
  const filteredMenuID = workingItems.filter(item =>
    item.id.toLowerCase().includes(searchID.toLowerCase()) &&
    (selectedCategory === "All" || item.menu === selectedCategory)
  );



  return (
    <div style={styles.container}>
      {/* <button className="back-button" onClick={navigate('/tables')}>⬅ Back to Tables</button> */}
      <h2 style={styles.heading}>🍽️ Edit Menu</h2>

      {/* Search and Filter */}
      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="🔍 Search menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchBar}
        />
        <input
          type="text"
          placeholder="🔍 Search by ID..."
          value={searchID}
          onChange={(e) => setSearchID(e.target.value)}
          style={styles.searchBar}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.categoryFilter}
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Add New Item Form */}
      <div style={styles.addItemForm}>
        {/* Menu Category Select with Other option */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={showOtherCategoryInput ? "Other" : newItem.menu}
            onChange={handleCategoryChange}
            style={styles.input}
          >
            {categories.filter(c => c !== "All").map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
            <option value="Other">Other</option>
          </select>

          {showOtherCategoryInput && (
            <input
              type="text"
              placeholder="Enter custom category"
              value={newItem.menu}
              onChange={(e) => setNewItem({...newItem, menu: e.target.value})}
              style={styles.input}
            />
          )}
        </div>
        <input
          type="text"
          placeholder="Item ID"
          value={newItem.id}
          onChange={(e) => setNewItem({...newItem, id: e.target.value})}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Item name"
          value={newItem.submenu}
          onChange={(e) => setNewItem({...newItem, submenu: e.target.value})}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Price (₹)"
          value={newItem.full_price}
          onChange={(e) => setNewItem({...newItem, full_price: e.target.value})}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Half price (₹)"
          value={newItem.half_price}
          onChange={(e) => setNewItem({...newItem, half_price: e.target.value})}
          style={styles.input}
        />
        {/* Available Status Select */}
        <select
          value={newItem.available}
          onChange={(e) => setNewItem({...newItem, available: Number(e.target.value)})}
          style={styles.input}
        >
          <option value={1}>Available</option>
          <option value={0}>Unavailable</option>
        </select>
        <button onClick={addNewItem} style={styles.addButton}>
          ➕ Add
        </button>
      </div>

      {/* Scrollable Menu List */}
      <div style={styles.scrollableTable}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Available</th>
              <th>ID</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Full Price (₹)</th>
              <th>Half Price (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMenuID.length > 0 ? (
              filteredMenuID.map((item) => (
                <tr key={item.id}>
                  {/* Available Status */}
                  <td>
                    <select
                      value={item.available}
                      onChange={(e) => handleEdit(item.id, "available", Number(e.target.value))}
                      style={styles.input}
                    >
                      <option value={1}>Available</option>
                      <option value={0}>Unavailable</option>
                    </select>
                  </td>
                  
                  {/* ID - Should be read-only or carefully managed */}
                  <td>
                    <input
                      type="text"
                      value={item.id || ""}
                      readOnly  // IDs typically shouldn't be editable
                      style={{...styles.input, width: '50px'}}
                    />
                  </td>
                  
                  {/* Item Name */}
                  <td>
                    <input
                      type="text"
                      value={item.submenu || ""}
                      onChange={(e) => handleEdit(item.id, "submenu", e.target.value)}
                      style={styles.input}
                    />
                  </td>
                  
                  {/* Category - Changed from item.category to item.menu */}
                  <td>
                    <select
                      value={item.menu || ""}
                      onChange={(e) => handleEdit(item.id, "menu", e.target.value)}
                      style={styles.input}
                    >
                      {categories.filter(c => c !== "All").map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Full Price */}
                  <td>
                    <input
                      type="number"
                      value={item.full_price || ""}
                      onChange={(e) => handleEdit(item.id, "full_price", Number(e.target.value))}
                      style={styles.input}
                    />
                  </td>
                  
                  {/* Half Price */}
                  <td>
                    <input
                      type="number"
                      value={item.half_price || ""}
                      onChange={(e) => handleEdit(item.id, "half_price", Number(e.target.value))}
                      style={styles.input}
                      placeholder="N/A"
                    />
                  </td>
                  
                  {/* Actions */}
                  <td>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      style={styles.deleteButton}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={styles.noData}>❌ No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button 
        style={{
          padding: "12px 18px",
          fontSize: "18px",
          color: "white",
          backgroundColor: modifiedItems.length > 0 ? "green" : "gray",
          border: "none",
          borderRadius: "8px",
          cursor: modifiedItems.length > 0 ? "pointer" : "not-allowed",
          transition: "0.3s",
          boxShadow: modifiedItems.length > 0 ? "0px 5px 10px rgba(0, 128, 0, 0.3)" : "none"
        }} 
        onClick={updateModifiedItems}
        disabled={modifiedItems.length === 0}
      >
        💾 Save Changes ({modifiedItems.length})
      </button>
    </div>
  );
};

const styles = {
  container: {
    width: "90%",
    maxWidth: "1000px",
    margin: "20px auto",
    padding: "20px",
    borderRadius: "10px",
    background: "#fff",
    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
  },
  heading: {
    fontSize: "26px",
    color: "#333",
    marginBottom: "15px",
  },
  filterContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },
  searchBar: {
    flex: 2,
    padding: "10px",
    fontSize: "16px",
    border: "2px solid #ddd",
    borderRadius: "5px",
  },
  categoryFilter: {
    flex: 1,
    padding: "10px",
    fontSize: "16px",
    border: "2px solid #ddd",
    borderRadius: "5px",
  },
  addItemForm: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    padding: "8px",
    fontSize: "16px",
    border: "2px solid #ddd",
    borderRadius: "5px",
    minWidth: "100px",
  },
  addButton: {
    padding: "8px 15px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  scrollableTable: {
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #ddd",
    borderRadius: "5px",
    marginBottom: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    position: "sticky",
    top: 0,
    background: "#f5f5f5",
  },
  noData: {
    textAlign: "center",
    padding: "10px",
    fontSize: "16px",
    color: "red",
  },
  deleteButton: {
    padding: "5px 10px",
    background: "#ff4444",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default EditMenu;