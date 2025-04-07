import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header/header.jsx";
import "./Tables.css";

const Tables = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hotel_name, sethotel_name] = useState("");


  const handleTableClick = (sectionName, tableNumber) => {
    const encodedSection = encodeURIComponent(sectionName);
    navigate(`/table_kot/${encodedSection}/${tableNumber}`, {
      state: {
        fromTables: true,
        section: sectionName,
        tableNumber: tableNumber
      }
    });
  };

  // SSE Connection for order updates
  useEffect(() => {
    const hotel_name = localStorage.getItem("hotel_name");
    if (!hotel_name) {
      console.error("Hotel name not found in localStorage");
    }
    const eventSource = new EventSource(`https://api2.nextorbitals.in/api/get_order?hotel_name=${hotel_name}`);

    const handleOrderUpdate = (event) => {
      try {
        const orderData = JSON.parse(event.data);      

        // Validate order data structure
        if (!orderData.section || !orderData.table || !orderData.order_details) {
          console.error("Invalid order data structure:", orderData);
          return;
        }

        const storageKey = `table-${orderData.section}-${orderData.table}-bill`;
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

        // Update localStorage
        localStorage.setItem(storageKey, JSON.stringify(updatedBill));
        
        // Update table status in the UI
        setSections(prevSections => {
          return prevSections.map(section => {
            if (section.section === orderData.section) {
              return {
                ...section,
                table_status: {
                  ...section.table_status,
                  [orderData.table]: "busy"
                }
              };
            }
            return section;
          });
        });

      } catch (error) {
        console.error("Error processing order update:", error);
      }
    };

    eventSource.addEventListener('message', handleOrderUpdate);
    eventSource.onerror = (e) => console.error("SSE error:", e);

    return () => {
      eventSource.removeEventListener('message', handleOrderUpdate);
      eventSource.close();
    };
  }, []); // No dependencies needed as we're using localStorage

  // Fetch table data from localstorage
  // useEffect(() => {
  //   const fetchTables = async () => {
  //     try {
  //       const totalprice = localStorage.getItem("tableTotals");
  //       const storedTables = localStorage.getItem("tables");

        

  //       if (!storedTables) {
  //         throw new Error("No table data found");
  //       }

  //       const tablesData = (storedTables);
  //       if (!tablesData?.data) {
  //         throw new Error("Invalid table data structure");
  //       }

  //       let updatedTables = tablesData.data;

  //       if (totalprice) {
  //         const totalpricejson = JSON.parse(totalprice);

  //         Object.entries(totalpricejson).forEach(([key, value]) => {
  //           const { section, tableNumber, total } = value;

  //           updatedTables = updatedTables.map((table) => {
  //             if (table.section === section && table.table_status.hasOwnProperty(tableNumber)) {
  //               return {
  //                 ...table,
  //                 table_status: {
  //                   ...table.table_status,
  //                   [tableNumber]: total > 0 ? "busy" : "free"
  //                 }
  //               };
  //             }
  //             return table;
  //           });
  //         });
  //       }

  //       setSections(updatedTables);
  //     } catch (err) {
  //       setError(err.message);
  //       console.error("Failed to load tables:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchTables();
  // }, []);


  useEffect(() => {
    const fetchTables = async () => {
      try {
        const totalprice = localStorage.getItem("tableTotals");
        const storedTables = localStorage.getItem("tables");
        console.log("table price",totalprice)
        console.log("table",storedTables)

        if (!storedTables) {
          throw new Error("No table data found");
        }
        
        // Parse the JSON data
        const tablesData = JSON.parse(storedTables);
        
        if (!tablesData || !Array.isArray(tablesData)) {
          throw new Error("Invalid table data structure");
        }
  
        let updatedTables = tablesData;
  
        // Process total prices if they exist
        if (totalprice) {
          try {
            const totalpricejson = JSON.parse(totalprice);
            
            updatedTables = updatedTables.map(section => {
              const updatedStatus = {...section.table_status};
              
              Object.entries(totalpricejson).forEach(([key, value]) => {
                if (value.section === section.section && value.tableNumber in updatedStatus) {
                  updatedStatus[value.tableNumber] = value.total > 0 ? "busy" : "free";
                }
              });
              
              return {
                ...section,
                table_status: updatedStatus
              };
            });
          } catch (e) {
            console.error("Error processing totals:", e);
          }
        }
  
        setSections(updatedTables);
      } catch (err) {
        setError(err.message);
        console.error("Failed to load tables:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTables();
  }, []);






  if (loading) {
    return (
      <div className="loading-container">
        <Header />
        <div className="loading-spinner"></div>
        <p>Loading tables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />

      <div className="tables-container">
        {sections.length > 0 ? (
          sections.map((section) => (
            <div key={section.id} className="section">
              <h2 className="section-title">{section.section}</h2>
              <div className="tables-grid">
                {Object.entries(section.table_status).map(([tableNumber, status]) => (
                  <div
                    key={tableNumber}
                    className={`table-box ${status.toLowerCase()}`}
                    onClick={() => handleTableClick(section.section, tableNumber)}
                  >
                    <h3 className="table-number">Table {tableNumber}</h3>
                    <p className="table-status">{status}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="no-tables">No tables available</p>
        )}
      </div>
    </div>
  );
};

export default Tables;