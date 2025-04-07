// import { useNavigate } from "react-router-dom";


const isPast6AM = () => {
  const now = new Date();
  const lastLogin = localStorage.getItem("loginTime");

  if (!lastLogin) return false;

  const lastLoginDate = new Date(parseInt(lastLogin, 10));

  // Check if the last login was before 6 AM today
  const today6AM = new Date();
  today6AM.setHours(6, 0, 0, 0); // Set to today's 6 AM

  return lastLoginDate < today6AM && now >= today6AM;
};

const checkLogout = (navigate) => {
    if (isPast6AM()) {
      console.log("Auto logging out: It's past 6 AM");
      localStorage.removeItem("auth");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("loginTime");
      navigate("/login");
    }
  };

export const autoLogout = (navigate) => {
    checkLogout(navigate); // Run once on load
    return setInterval(checkLogout(navigate), 60000); // Check every 60 seconds
};
