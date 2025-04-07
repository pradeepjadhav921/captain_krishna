import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BillingHistory = () => {
  const [billingData, setBillingData] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate(); // Initialize the navigate function

  useEffect(() => {
    // Load billing history from localStorage
    const savedBills = JSON.parse(localStorage.getItem("billingHistory")) || [];
    setBillingData(savedBills.reverse());
  }, []);

  const handlePrint = () => {
    window.print();
  };

//   const handleEdit = (bill) => {
//     // Add logic to handle edit functionality
//     console.log("Edit bill:", bill);

//      // Store the bill's items in localStorage
//   localStorage.setItem("currentCart", JSON.stringify(bill.items));

//       // Construct the URL dynamically based on the bill's section and table number
//       const sectionName = encodeURIComponent(bill.tableSection);
//       const tableNumber = encodeURIComponent(bill.tableNumber);
      
//       // Redirect to /table/[sectionName]/[tableNumber]
//       const tableUrl = `/table/${sectionName}/${tableNumber}`;
//       navigate(tableUrl); // Navigate to the dynamically constructed URL
//       setShowModal(false); // Close the modal after redirect
//   };



const handleEdit = (bill) => {
    // Retrieve the billing history from localStorage
    const billingHistory = JSON.parse(localStorage.getItem("billingHistory")) || [];
  
    // Remove the bill being edited from the history
    const updatedHistory = billingHistory.filter(existingBill => existingBill.id !== bill.id);
  
    // Store the updated history (after removal) in localStorage
    localStorage.setItem("billingHistory", JSON.stringify(updatedHistory));
  
    // Store the bill's items in localStorage for the table page
    localStorage.setItem("currentCart", JSON.stringify(bill.items));
  
    // Construct the URL dynamically based on the bill's section and table number
    const sectionName = encodeURIComponent(bill.tableSection);
    const tableNumber = encodeURIComponent(bill.tableNumber);
  
    // Redirect to /table/[sectionName]/[tableNumber]
    const tableUrl = `/table/edit${sectionName}/${tableNumber}`;
    navigate(tableUrl); // Navigate to the dynamically constructed URL
    setShowModal(false); // Close the modal after redirect
  };
  


  return (
    <div className="billing-container">
  <h1 className="billing-title">📜 Billing History</h1>
  
  {billingData.length === 0 ? (
    <p className="no-bills">No bills available.</p>
  ) : (
    <div className="billing-table-wrapper">
      <table className="billing-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Section</th>
            <th>Table</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {billingData.map((bill) => (
            <tr key={bill.id} className={bill.edited ? "edited-bill" : ""}>
              <td>{bill.date}</td>
              <td>{bill.tableSection.replace(/edit/g, "")}</td>
              <td>{bill.tableNumber}</td>
              <td>{bill.items.length} Items</td>
              <td>₹{bill.total.toFixed(2)}</td>
              <td>
              {bill.edited && <span className="edited-label">Edited</span>}
                <button className="details-btn" onClick={() => setSelectedBill(bill)}>
                  📄 View Details
                </button>
               
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}



      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="bill-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🧾 Bill Receipt</h2>
            <p><strong>Date:</strong> {selectedBill.date}</p>
            <p><strong>Section:</strong> {selectedBill.tableSection}</p>
            <p><strong>Table:</strong> {selectedBill.tableNumber}</p>
            <hr />
            <table className="bill-items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price.toFixed(2)}</td>
                    <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr />
            <h3>Total: ₹{selectedBill.total.toFixed(2)}</h3>
            <div className="modal-actions">
                <button className="edit-btn" onClick={() => handleEdit(selectedBill)}>✏ Edit</button>
                <button className="print-btn" onClick={handlePrint}>🖨 Print</button>
              </div>
            <button className="close-btn" onClick={() => setSelectedBill(null)}>❌ Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingHistory;
