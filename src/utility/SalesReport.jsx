import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

const SalesReport = () => {
  const navigate = useNavigate();
  const [billingHistory, setBillingHistory] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: '2000-01-01',
    end: '2030-12-31'
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [viewMode, setViewMode] = useState('quantity');
  const [timeRange, setTimeRange] = useState('all');

  // Get unique categories from all items
  const categories = ['All', ...new Set(
    billingHistory.flatMap(sale => 
      sale.items.map(item => item.category)
    ).filter(Boolean)
  )];

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalItemsSold = filteredSales.reduce(
    (sum, sale) => sum + sale.items.reduce(
      (itemSum, item) => itemSum + (item.quantity || 0), 0
    ), 0
  );

  // Generate category breakdown
  const categoryBreakdown = filteredSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      const category = item.category || 'Uncategorized';
      acc[category] = acc[category] || { amount: 0, items: 0 };
      acc[category].amount += (item.price || 0) * (item.quantity || 1);
      acc[category].items += item.quantity || 0;
    });
    return acc;
  }, {});

  // Calculate top selling items
  const getTopSellingItems = () => {
    let itemsToAnalyze = filteredSales.flatMap(sale => sale.items);
    
    if (timeRange !== 'all') {
      const now = new Date();
      itemsToAnalyze = itemsToAnalyze.filter(item => {
        const saleDate = new Date(item.date || now);
        switch(timeRange) {
          case 'day': 
            return saleDate.toDateString() === now.toDateString();
          case 'week':
            return getWeekNumber(saleDate) === getWeekNumber(now) && 
                   saleDate.getFullYear() === now.getFullYear();
          case 'month':
            return saleDate.getMonth() === now.getMonth() && 
                   saleDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    return itemsToAnalyze
      .reduce((acc, item) => {
        const existing = acc.find(i => i.id === item.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.orderCount++;
          if (new Date(item.date) > new Date(existing.lastSold)) {
            existing.lastSold = item.date;
          }
        } else {
          acc.push({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
            orderCount: 1,
            lastSold: item.date
          });
        }
        return acc;
      }, [])
      .sort((a, b) => viewMode === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue)
      .slice(0, 10);
  };

  const topSellingItems = getTopSellingItems();



  // Data loader
  useEffect(() => {
    const loadData = () => {
      try {
        setIsLoading(true);
        setDataStatus('Loading data...');
        const rawData = localStorage.getItem('billingHistory');
        
        if (!rawData) {
          setDataStatus('No billing history found in localStorage');
          setBillingHistory([]);
          return;
        }

        let parsedData;
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          console.error('Failed to parse billingHistory:', e);
          setDataStatus('Error: Invalid JSON format in billingHistory');
          return;
        }

        if (!Array.isArray(parsedData)) {
          console.error('billingHistory is not an array:', parsedData);
          setDataStatus('Error: billingHistory should be an array');
          return;
        }

        // Transform data
        const transformedData = parsedData.map((sale, index) => {
          const items = sale.items || sale.orderItems || [];
          const total = sale.total || sale.amount || 0;
          const date = sale.date || sale.timestamp || new Date().toISOString();
          const tableSection = sale.tableSection || sale.section || 'Unknown';
          const tableNumber = sale.tableNumber || sale.table || '0';

          return {
            id: sale.id || `temp-${Date.now()}-${index}`,
            tableSection,
            tableNumber,
            items: items.map(item => ({
              id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name || 'Unknown Item',
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              category: item.category || item.type || 'Uncategorized',
              date: item.date || date
            })),
            total: Number(total) || 0,
            date
          };
        });

        setBillingHistory(transformedData);
        setFilteredSales(transformedData);
        setDataStatus(transformedData.length > 0 ? '' : 'No sales data available');
      } catch (error) {
        console.error('Error loading billing history:', error);
        setDataStatus('Error loading sales data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter data
  useEffect(() => {
    if (billingHistory.length === 0) {
      setFilteredSales([]);
      return;
    }

    const filtered = billingHistory.filter(sale => {
      try {
        const saleDate = new Date(sale.date).toISOString().split('T')[0];
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
      } catch (e) {
        console.error('Error processing sale date:', sale.date, e);
        return false;
      }
    });

    const categoryFiltered = selectedCategory === 'All' 
      ? filtered 
      : filtered.map(sale => ({
          ...sale,
          items: sale.items.filter(item => 
            (item.category || '').toLowerCase() === selectedCategory.toLowerCase()
          )
        })).filter(sale => sale.items.length > 0);

    setFilteredSales(categoryFiltered);
  }, [dateRange, selectedCategory, billingHistory]);

  // Force data reload with sample data
  const reloadData = () => {
    localStorage.setItem('billingHistory', JSON.stringify([{
      id: 'demo-1',
      tableSection: "Main",
      tableNumber: "5",
      items: [
        { id: 'item-1', name: "Sample Item", price: 10.99, quantity: 2, category: "Food" },
        { id: 'item-2', name: "Sample Drink", price: 4.50, quantity: 1, category: "Beverage" },
        { id: 'item-3', name: "Popular Dish", price: 15.99, quantity: 5, category: "Food" },
        { id: 'item-4', name: "Special Dessert", price: 8.50, quantity: 3, category: "Dessert" }
      ],
      total: 26.48,
      date: new Date().toISOString()
    }]));
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="sales-report-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-report-container">
      <header className="sales-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-chart-bar"></i> Sales Dashboard
          </h1>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        
        <div className="report-period">
          <div className="date-filters">
            <div className="date-input-group">
              <label>From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="date-input"
              />
            </div>
            <div className="date-input-group">
              <label>To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="date-input"
              />
            </div>
            <div className="category-filter">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {dataStatus && (
        <div className="alert-message">
          <p>{dataStatus}</p>
          <button 
            className="sample-data-btn"
            onClick={reloadData}
          >
            <i className="fas fa-magic"></i> Load Sample Data
          </button>
        </div>
      )}

      <nav className="report-tabs">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <i className="fas fa-chart-pie"></i> Summary
        </button>
        <button
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <i className="fas fa-receipt"></i> Transactions
        </button>
        <button
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <i className="fas fa-tags"></i> Categories
        </button>
        <button
          className={`tab-btn ${activeTab === 'top-items' ? 'active' : ''}`}
          onClick={() => setActiveTab('top-items')}
        >
          <i className="fas fa-trophy"></i> Top Items
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === 'summary' && (
          <div className="summary-cards">
            <div className="stat-card primary">
              <div className="stat-icon">
                <i className="fas fa-rupee-sign"></i>
              </div>
              <div className="stat-info">
                <h3>Total Sales</h3>
                <p>₹{totalSales.toFixed(2)}</p>
              </div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-icon">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="stat-info">
                <h3>Total Orders</h3>
                <p>{filteredSales.length}</p>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">
                <i className="fas fa-cubes"></i>
              </div>
              <div className="stat-info">
                <h3>Items Sold</h3>
                <p>{totalItemsSold}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="category-breakdown">
            <h3>
              <i className="fas fa-tag"></i> Sales by Category
            </h3>
            <div className="category-grid">
              {Object.entries(categoryBreakdown).map(([category, data]) => (
                <div key={category} className="category-card">
                  <h4>{category}</h4>
                  <div className="category-stats">
                    <div className="stat-item">
                      <span>Amount</span>
                      <strong>₹{data.amount.toFixed(2)}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Items</span>
                      <strong>{data.items}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Share</span>
                      <strong>
                        {((data.amount / totalSales) * 100 || 0).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-history"></i> Recent Transactions
              </h3>
              <p className="result-count">
                Showing {filteredSales.length} records
              </p>
            </div>
            
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Table</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        {new Date(sale.date).toLocaleString()}
                      </td>
                      <td>
                        <span className="table-badge">
                          {sale.tableSection}-{sale.tableNumber}
                        </span>
                      </td>
                      <td>
                        <div className="items-count">
                          {sale.items.length} items
                        </div>
                      </td>
                      <td className="amount-cell">
                        ₹{sale.total.toFixed(2)}
                      </td>
                      <td>
                        <button 
                          className="view-btn"
                          onClick={() => navigate(`/bill/${sale.id}`)}
                        >
                          <i className="fas fa-eye"></i> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'top-items' && (
          <div className="top-items-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-trophy"></i> Top Performing Items
              </h3>
              <div className="view-controls">
                <div className="time-range-selector">
                  <label>Time Range:</label>
                  <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="time-range-select"
                  >
                    <option value="all">All Time</option>
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                <div className="view-options">
                  <button
                    className={`view-option ${viewMode === 'quantity' ? 'active' : ''}`}
                    onClick={() => setViewMode('quantity')}
                  >
                    <i className="fas fa-cubes"></i> By Quantity
                  </button>
                  <button
                    className={`view-option ${viewMode === 'revenue' ? 'active' : ''}`}
                    onClick={() => setViewMode('revenue')}
                  >
                    <i className="fas fa-rupee-sign"></i> By Revenue
                  </button>
                </div>
              </div>
            </div>

            <div className="top-items-grid">
              <div className="top-items-table-container">
                <table className="top-items-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Item</th>
                      <th>Category</th>
                      <th>{viewMode === 'quantity' ? 'Units Sold' : 'Revenue'}</th>
                      <th>Unit Price</th>
                      <th>Orders</th>
                      <th>Last Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellingItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="rank-cell">
                          <span className={`rank-badge ${index < 3 ? `top-${index + 1}` : ''}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="item-info">
                          <div className="item-name">{item.name}</div>
                          {item.category && (
                            <div className="item-category">{item.category}</div>
                          )}
                        </td>
                        <td className="category-cell">
                          <span className="category-tag">{item.category || 'Uncategorized'}</span>
                        </td>
                        <td className="metric-cell">
                          {viewMode === 'quantity' ? item.quantity : `₹${item.revenue.toFixed(2)}`}
                        </td>
                        <td className="price-cell">₹{item.price.toFixed(2)}</td>
                        <td className="orders-cell">{item.orderCount}</td>
                        <td className="date-cell">
                          {new Date(item.lastSold).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="top-items-visualization">
                <h4>
                  <i className="fas fa-chart-bar"></i> {viewMode === 'quantity' ? 'Units Sold' : 'Revenue'} Distribution
                </h4>
                <div className="items-chart">
                  {topSellingItems.map((item, index) => (
                    <div key={item.id} className="chart-bar-container">
                      <div className="chart-bar-label">
                        {index + 1}. {item.name}
                      </div>
                      <div className="chart-bar">
                        <div 
                          className="chart-bar-fill"
                          style={{
                            width: `${(viewMode === 'quantity' 
                              ? (item.quantity / topSellingItems[0].quantity) 
                              : (item.revenue / topSellingItems[0].revenue)) * 100}%`
                          }}
                        ></div>
                        <div className="chart-bar-value">
                          {viewMode === 'quantity' ? item.quantity : `₹${item.revenue.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Font Awesome for icons */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" 
      />
    </div>
  );
};

// Create and append styles

const styleElement = document.createElement('style');
styleElement.textContent = `
  .sales-report-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    color: #333;
  }

  .sales-header {
    background: linear-gradient(135deg, #6B73FF 0%, #000DFF 100%);
    color: white;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .sales-header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .refresh-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .report-period {
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 8px;
  }

  .date-filters {
    display: flex;
    gap: 20px;
    align-items: flex-end;
  }

  .date-input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .date-input-group label {
    font-size: 12px;
    opacity: 0.9;
  }

  .date-input {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.9);
  }

  .category-filter {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .category-select {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    min-width: 150px;
    background: rgba(255, 255, 255, 0.9);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 15px;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #3498db;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .alert-message {
    background: #FFF3CD;
    color: #856404;
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sample-data-btn {
    background: #28A745;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .report-tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    margin-bottom: 20px;
  }

  .tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 3px solid transparent;
    transition: all 0.3s;
  }

  .tab-btn:hover {
    color: #000DFF;
  }

  .tab-btn.active {
    color: #000DFF;
    border-bottom: 3px solid #000DFF;
    font-weight: 600;
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .stat-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 20px;
    transition: transform 0.3s;
  }

  .stat-card:hover {
    transform: translateY(-5px);
  }

  .stat-card.primary {
    border-left: 4px solid #000DFF;
  }

  .stat-card.secondary {
    border-left: 4px solid #6c757d;
  }

  .stat-card.success {
    border-left: 4px solid #28a745;
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .stat-card.primary .stat-icon {
    background: rgba(0, 13, 255, 0.1);
    color: #000DFF;
  }

  .stat-card.secondary .stat-icon {
    background: rgba(108, 117, 125, 0.1);
    color: #6c757d;
  }

  .stat-card.success .stat-icon {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
  }

  .stat-info h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
    font-weight: 500;
    color: #666;
  }

  .stat-info p {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .category-breakdown {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .category-breakdown h3 {
    margin-top: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 20px;
  }

  .category-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    border-left: 4px solid #6B73FF;
  }

  .category-card h4 {
    margin: 0 0 10px 0;
    color: #333;
  }

  .category-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
  }

  .stat-item span {
    font-size: 12px;
    color: #666;
  }

  .stat-item strong {
    font-size: 14px;
    color: #333;
  }

  .transactions-section {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .result-count {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  .table-container {
    overflow-x: auto;
  }

  .transactions-table {
    width: 100%;
    border-collapse: collapse;
  }

  .transactions-table th {
    background: #f8f9fa;
    padding: 12px 15px;
    text-align: left;
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .transactions-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
  }

  .transactions-table tr:hover {
    background: #f8f9fa;
  }

  .table-badge {
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #333;
  }

  .items-count {
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    font-size: 12px;
  }

  .amount-cell {
    font-weight: 600;
    color: #000DFF;
  }

  .view-btn {
    background: #000DFF;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    transition: all 0.3s;
  }

  .view-btn:hover {
    background: #6B73FF;
  }

  /* Top Items Section Styles */
  .top-items-section {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .view-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 15px 0;
    flex-wrap: wrap;
    gap: 15px;
  }

  .time-range-selector {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .time-range-select {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .view-options {
    display: flex;
    gap: 10px;
  }

  .view-option {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .view-option.active {
    background: #000DFF;
    color: white;
    border-color: #000DFF;
  }

  .top-items-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 992px) {
    .top-items-grid {
      grid-template-columns: 1fr;
    }
  }

  .top-items-table-container {
    overflow-x: auto;
  }

  .top-items-table {
    width: 100%;
    border-collapse: collapse;
  }

  .top-items-table th {
    background: #f8f9fa;
    padding: 12px 15px;
    text-align: left;
    font-weight: 600;
    color: #333;
    font-size: 14px;
    white-space: nowrap;
  }

  .top-items-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
    vertical-align: middle;
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e9ecef;
    color: #333;
    font-weight: 600;
  }

  .rank-badge.top-1 {
    background: #ffd700;
    color: #000;
  }

  .rank-badge.top-2 {
    background: #c0c0c0;
    color: #000;
  }

  .rank-badge.top-3 {
    background: #cd7f32;
    color: #000;
  }

  .item-info {
    min-width: 150px;
  }

  .item-name {
    font-weight: 500;
  }

  .item-category {
    font-size: 12px;
    color: #666;
  }

  .category-tag {
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .metric-cell, .price-cell, .orders-cell {
    text-align: right;
    font-family: 'Courier New', monospace;
  }

  .date-cell {
    white-space: nowrap;
  }

  .top-items-visualization {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 20px;
  }

  .items-chart {
    margin-top: 15px;
  }

  .chart-bar-container {
    margin-bottom: 12px;
  }

  .chart-bar-label {
    font-size: 13px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
  }

  .chart-bar {
    height: 24px;
    background: #e9ecef;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }

  .chart-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #6B73FF 0%, #000DFF 100%);
    transition: width 0.5s ease;
  }

  .chart-bar-value {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-size: 12px;
    font-weight: 600;
    text-shadow: 0 1px 1px rgba(0,0,0,0.3);
  }

  @media (max-width: 768px) {
    .date-filters {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    
    .summary-cards {
      grid-template-columns: 1fr;
    }

    .view-controls {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;
document.head.appendChild(styleElement);


export default SalesReport;