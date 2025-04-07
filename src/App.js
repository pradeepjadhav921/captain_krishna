import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./componants/Login.jsx";
import Tables from "./componants/Tables.jsx";
import TableKOT from "./componants/table_kot/table_kot.jsx"; // Import table_kot.js
import EditMenu from "./utility/EditMenu.jsx";
import SalesReport from "./utility/SalesReport.jsx";
import BillingHistory from "./utility/BillingHistory.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/table_kot/:section/:tableNumber" element={<TableKOT />} /> {/* New Route */}
        <Route path="/edit-menu" element={<EditMenu/>} /> {/* ✅ Add this */}
        <Route path="/sales-report" element={<SalesReport />} /> {/* ✅ Fix: Wrap inside <Route> */}
        <Route path="/billing-history" element={<BillingHistory />} /> {/* ✅ Add this */}    
      </Routes>
    </Router>
  );
}

export default App;
