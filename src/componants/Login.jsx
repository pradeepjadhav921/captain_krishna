import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { autoLogout } from "../utility/autoLogout.jsx"; // Import auto logout function

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const interval = autoLogout(navigate); // Start auto-logout check
    return () => clearInterval(interval); // Cleanup on unmount
  }, [navigate]);

  // Function to fetch table and menu data
  const fetchTableAndMenuData = async () => {
    try {
      const hotel_name = localStorage.getItem("hotel_name");
      if (!hotel_name) {
        console.error("Hotel name not found in localStorage");
      }
      const [tableRes, menuRes] = await Promise.all([
        fetch(`https://api2.nextorbitals.in/api/get_tables?hotel_name=${hotel_name}`),
        fetch(`https://api2.nextorbitals.in/api/get_menu?hotel_name=${hotel_name}`),
        // console.log(`http://localhost:5000/api/get_tables?hotel_name=${hotel_name}`),
        // fetch(`http://localhost:5000/api/get_tables?hotel_name=${hotel_name}`),
        // fetch(`http://localhost:5000/api/get_menu?hotel_name=${hotel_name}`),
      ]);

      const tableData = await tableRes.json();
      const menuData = await menuRes.json();


      console.log("Table data:", tableData);
      console.log("Menu data:", menuData);
      // Save in localStorage
      localStorage.setItem("tables", JSON.stringify(tableData.data));
      localStorage.setItem("menu", JSON.stringify(menuData.data));

      console.log("Tables and menu data stored in localStorage",localStorage.getItem("menu"));
      console.log("Tables and menu data stored in localStorage",localStorage.getItem("tables"));
    } catch (error) {
      console.error("Error fetching table and menu data:", error);
    }
  };

  
  
    
  ////////////////////      Function to handle login          ///////////
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
       const response = await fetch("https://api2.nextorbitals.in/api/login", {
      //const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password}),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (data.success) {
        // Save login data in localStorage
        // localStorage.setItem("auth", "true");
        // localStorage.setItem("user", JSON.stringify(data.user));
        // localStorage.setItem("token", data.token);
        localStorage.setItem("loginTime", Date.now().toString()); // Save login time
        console.log("Login successful:", username);
        localStorage.setItem("hotel_name", username); // Hotel name

        // Fetch tables and menu data
        await fetchTableAndMenuData();
        console.log("Tables and menu data fetched successfully");

        navigate("/tables");


      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={handleLogin} className="flex flex-col space-y-4 w-64">
        {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
