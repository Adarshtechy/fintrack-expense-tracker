// DOM Elements
const balanceEl = document.getElementById("balance");
const balanceTrendEl = document.getElementById("balance-trend");
const incomeAmountEl = document.getElementById("income-amount");
const expenseAmountEl = document.getElementById("expense-amount");
const transactionListEl = document.getElementById("transaction-list");
const transactionFormEl = document.getElementById("transaction-form");
const editFormEl = document.getElementById("edit-form");
const descriptionEl = document.getElementById("description");
const amountEl = document.getElementById("amount");
const dateEl = document.getElementById("date");
const categoryEl = document.getElementById("category");
const themeToggleEl = document.getElementById("theme-toggle");
const exportBtnEl = document.getElementById("export-btn");
const filterTypeEl = document.getElementById("filter-type");
const filterMonthEl = document.getElementById("filter-month");
const typeBtns = document.querySelectorAll(".type-btn");
const editModal = document.getElementById("edit-modal");
const modalClose = document.getElementById("modal-close");
const cancelEdit = document.getElementById("cancel-edit");
let categoryChart = null;

// Initialize date input with today's date
dateEl.valueAsDate = new Date();

// Data structure
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let currentFilter = { type: "all", month: "all" };
let previousBalance = 0;

// Initialize theme
const savedTheme = localStorage.getItem("theme") || "light";
document.body.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

// Event Listeners
transactionFormEl.addEventListener("submit", addTransaction);
editFormEl.addEventListener("submit", saveEdit);
themeToggleEl.addEventListener("click", toggleTheme);
exportBtnEl.addEventListener("click", exportToPDF);

typeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    typeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Filter event listeners
filterTypeEl.addEventListener("change", applyFilter);
filterMonthEl.addEventListener("change", applyFilter);

// Modal event listeners
modalClose.addEventListener("click", () => editModal.classList.remove('active'));
cancelEdit.addEventListener("click", () => editModal.classList.remove('active'));

// Initialize month filter
populateMonthFilter();

// Initial render
updateTransactionList();
updateSummary();
updateChart();

// Functions
function addTransaction(e) {
  e.preventDefault();

  const description = descriptionEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const date = dateEl.value;
  const category = categoryEl.value;
  const type = document.querySelector(".type-btn.active").dataset.type;

  if (!description || !amount || !date) {
    showAlert("Please fill in all fields", "error");
    return;
  }

  if (amount <= 0) {
    showAlert("Amount must be greater than 0", "error");
    return;
  }

  const finalAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount);

  const transaction = {
    id: Date.now(),
    description,
    amount: finalAmount,
    date,
    category,
    type
  };

  transactions.push(transaction);
  saveToLocalStorage();
  updateTransactionList();
  updateSummary();
  updateChart();
  
  transactionFormEl.reset();
  dateEl.valueAsDate = new Date();
  
  showAlert("Transaction added successfully!", "success");
}

function updateTransactionList() {
  transactionListEl.innerHTML = "";
  
  // Apply filters
  let filteredTransactions = [...transactions];
  
  if (currentFilter.type !== "all") {
    filteredTransactions = filteredTransactions.filter(t => 
      currentFilter.type === "income" ? t.amount > 0 : t.amount < 0
    );
  }
  
  if (currentFilter.month !== "all") {
    filteredTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      return transactionMonth === currentFilter.month;
    });
  }
  
  // Sort by date (newest first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Show/hide empty state
  const emptyState = document.getElementById("empty-state");
  if (emptyState) {
    emptyState.style.display = filteredTransactions.length === 0 ? "block" : "none";
  }
  
  // Create transaction elements
  filteredTransactions.forEach(transaction => {
    const li = createTransactionElement(transaction);
    transactionListEl.appendChild(li);
  });
}

function createTransactionElement(transaction) {
  const li = document.createElement("li");
  li.classList.add("transaction", transaction.type);
  li.dataset.id = transaction.id;
  
  const categoryColors = {
    food: "#FF6B6B",
    transport: "#4ECDC4",
    shopping: "#FFD166",
    entertainment: "#06D6A0",
    bills: "#118AB2",
    health: "#EF476F",
    education: "#7209B7",
    salary: "#4361EE",
    freelance: "#3A0CA3",
    investment: "#F8961E",
    other: "#6C757D"
  };
  
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  const categoryColor = categoryColors[transaction.category] || '#6C757D';
  
  li.innerHTML = `
    <div class="transaction-details">
      <h4>${transaction.description}</h4>
      <div class="transaction-meta">
        <span class="transaction-date">
          <i class="far fa-calendar"></i> ${formattedDate}
        </span>
        <span class="transaction-category" style="background: ${categoryColor}20; color: ${categoryColor}">
          <i class="fas fa-tag"></i> ${transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
        </span>
      </div>
    </div>
    <div class="transaction-amount">
      ${formatCurrency(transaction.amount)}
    </div>
    <div class="transaction-actions">
      <button class="btn-edit" onclick="editTransaction(${transaction.id})">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn-delete" onclick="removeTransaction(${transaction.id})">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  return li;
}

function updateSummary() {
  const currentBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const monthlyIncome = transactions
    .filter(t => t.amount > 0 && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const monthlyExpenses = transactions
    .filter(t => t.amount < 0 && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  
  // Update balance trend
  const trend = currentBalance - previousBalance;
  if (trend > 0) {
    balanceTrendEl.innerHTML = `<i class="fas fa-arrow-up"></i> +${formatCurrency(trend)}`;
    balanceTrendEl.className = "trend-up";
  } else if (trend < 0) {
    balanceTrendEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${formatCurrency(trend)}`;
    balanceTrendEl.className = "trend-down";
  } else {
    balanceTrendEl.innerHTML = `<i class="fas fa-minus"></i> No change`;
    balanceTrendEl.className = "trend-neutral";
  }
  
  previousBalance = currentBalance;
  
  // Update UI
  balanceEl.textContent = formatCurrency(currentBalance);
  incomeAmountEl.textContent = formatCurrency(monthlyIncome);
  expenseAmountEl.textContent = formatCurrency(monthlyExpenses);
}

function updateChart() {
  const ctx = document.getElementById('category-chart').getContext('2d');
  const chartEmpty = document.getElementById('chart-empty');
  
  // Filter expenses only for the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const expenses = transactions.filter(t => 
    t.amount < 0 && t.date.startsWith(currentMonth)
  );
  
  if (expenses.length === 0) {
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    if (chartEmpty) chartEmpty.style.display = 'block';
    return;
  }
  
  if (chartEmpty) chartEmpty.style.display = 'none';
  
  // Group by category
  const categoryData = {};
  expenses.forEach(transaction => {
    const amount = Math.abs(transaction.amount);
    categoryData[transaction.category] = (categoryData[transaction.category] || 0) + amount;
  });
  
  // Sort by amount (descending) and take top categories
  const sortedCategories = Object.entries(categoryData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  
  const labels = sortedCategories.map(([category]) => 
    category.charAt(0).toUpperCase() + category.slice(1)
  );
  const data = sortedCategories.map(([, amount]) => amount);
  
  const categoryColors = {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    shopping: '#FFD166',
    entertainment: '#06D6A0',
    bills: '#118AB2',
    health: '#EF476F',
    education: '#7209B7',
    salary: '#4361EE',
    freelance: '#3A0CA3',
    investment: '#F8961E',
    other: '#6C757D'
  };
  
  const backgroundColors = sortedCategories.map(([category]) => 
    categoryColors[category] || '#6C757D'
  );
  
  if (categoryChart) {
    categoryChart.destroy();
  }
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: document.body.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

function editTransaction(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;
  
  document.getElementById('edit-id').value = transaction.id;
  document.getElementById('edit-description').value = transaction.description;
  document.getElementById('edit-amount').value = Math.abs(transaction.amount);
  document.getElementById('edit-date').value = transaction.date;
  document.getElementById('edit-category').value = transaction.category;
  
  editModal.classList.add('active');
}

function saveEdit(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('edit-id').value);
  const description = document.getElementById('edit-description').value.trim();
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const date = document.getElementById('edit-date').value;
  const category = document.getElementById('edit-category').value;
  
  if (!description || !amount || !date) {
    showAlert("Please fill in all fields", "error");
    return;
  }
  
  const transactionIndex = transactions.findIndex(t => t.id === id);
  if (transactionIndex === -1) return;
  
  // Preserve the type (income/expense) from original transaction
  const originalTransaction = transactions[transactionIndex];
  const finalAmount = originalTransaction.amount > 0 ? amount : -amount;
  
  transactions[transactionIndex] = {
    ...originalTransaction,
    description,
    amount: finalAmount,
    date,
    category
  };
  
  saveToLocalStorage();
  updateTransactionList();
  updateSummary();
  updateChart();
  editModal.classList.remove('active');
  
  showAlert("Transaction updated successfully!", "success");
}

function removeTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;
  
  transactions = transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  updateTransactionList();
  updateSummary();
  updateChart();
  
  showAlert("Transaction deleted successfully!", "success");
}

function applyFilter() {
  currentFilter.type = filterTypeEl.value;
  currentFilter.month = filterMonthEl.value;
  updateTransactionList();
}

function populateMonthFilter() {
  const months = new Set();
  transactions.forEach(t => {
    const date = new Date(t.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.add(month);
  });
  
  // Sort months descending
  const sortedMonths = Array.from(months).sort().reverse();
  
  // Clear existing options except "All Time"
  while (filterMonthEl.options.length > 1) {
    filterMonthEl.remove(1);
  }
  
  sortedMonths.forEach(month => {
    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const option = document.createElement('option');
    option.value = month;
    option.textContent = monthName;
    filterMonthEl.appendChild(option);
  });
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  updateChart();
}

function updateThemeIcon(theme) {
  const icon = themeToggleEl.querySelector('i');
  icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// PDF Export Function
function exportToPDF() {
  try {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    // Calculate totals
    const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = monthlyTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = monthlyTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Create HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Tracker Report</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 40px; 
            color: #333;
            line-height: 1.6;
          }
          .report-header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #4361ee;
            padding-bottom: 20px;
          }
          .report-header h1 { 
            color: #4361ee; 
            font-size: 32px;
            margin-bottom: 10px;
          }
          .report-header p { 
            color: #666; 
            font-size: 16px;
          }
          .summary-section { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .summary-section h2 { 
            color: #4361ee; 
            margin-bottom: 20px;
            font-size: 22px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .summary-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .summary-item h3 {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
          }
          .summary-item .amount {
            font-size: 24px;
            font-weight: bold;
          }
          .positive { color: #06d6a0; }
          .negative { color: #ef476f; }
          .transactions-section {
            margin-bottom: 40px;
          }
          .transactions-section h2 {
            color: #4361ee;
            font-size: 22px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-radius: 10px;
            overflow: hidden;
          }
          th {
            background: #4361ee;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          tr:hover {
            background: #e9ecef;
          }
          .category-tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }
          .category-food { background: #FF6B6B20; color: #FF6B6B; }
          .category-transport { background: #4ECDC420; color: #4ECDC4; }
          .category-shopping { background: #FFD16620; color: #FFD166; }
          .category-entertainment { background: #06D6A020; color: #06D6A0; }
          .category-bills { background: #118AB220; color: #118AB2; }
          .category-health { background: #EF476F20; color: #EF476F; }
          .category-education { background: #7209B720; color: #7209B7; }
          .category-salary { background: #4361EE20; color: #4361EE; }
          .category-freelance { background: #3A0CA320; color: #3A0CA3; }
          .category-investment { background: #F8961E20; color: #F8961E; }
          .category-other { background: #6C757D20; color: #6C757D; }
          .total-row {
            background: #f8f9fa !important;
            font-weight: bold;
            border-top: 2px solid #dee2e6;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
          }
          .page-break {
            page-break-before: always;
          }
          @media print {
            body { margin: 20px; }
            .summary-grid { break-inside: avoid; }
            table { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Expense Tracker Report</h1>
          <p>Generated on: ${currentDate}</p>
        </div>
        
        <div class="summary-section">
          <h2>Financial Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <h3>Total Balance</h3>
              <div class="amount ${totalBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalBalance)}</div>
            </div>
            <div class="summary-item">
              <h3>Total Income</h3>
              <div class="amount positive">${formatCurrency(totalIncome)}</div>
            </div>
            <div class="summary-item">
              <h3>Total Expenses</h3>
              <div class="amount negative">${formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </div>
        
        <div class="transactions-section">
          <h2>Transactions - ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
    `;
    
    if (monthlyTransactions.length > 0) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      monthlyTransactions.forEach(transaction => {
        const formattedDate = new Date(transaction.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const categoryClass = `category-${transaction.category}`;
        const type = transaction.amount > 0 ? 'Income' : 'Expense';
        const amountClass = transaction.amount > 0 ? 'positive' : 'negative';
        const amountSign = transaction.amount > 0 ? '+' : '';
        
        htmlContent += `
          <tr>
            <td>${formattedDate}</td>
            <td>${transaction.description}</td>
            <td><span class="category-tag ${categoryClass}">${transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</span></td>
            <td>${type}</td>
            <td class="${amountClass}">${amountSign}${formatCurrency(transaction.amount)}</td>
          </tr>
        `;
      });
      
      htmlContent += `
            <tr class="total-row">
              <td colspan="4"><strong>Monthly Total</strong></td>
              <td class="${(totalIncome - totalExpenses) >= 0 ? 'positive' : 'negative'}">
                <strong>${formatCurrency(totalIncome - totalExpenses)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      `;
      
      // Add category breakdown if there are expenses
      const expenses = monthlyTransactions.filter(t => t.amount < 0);
      if (expenses.length > 0) {
        // Group by category
        const categoryData = {};
        expenses.forEach(t => {
          const amount = Math.abs(t.amount);
          categoryData[t.category] = (categoryData[t.category] || 0) + amount;
        });
        
        const sortedCategories = Object.entries(categoryData)
          .sort(([, a], [, b]) => b - a);
        
        const totalExpenseAmount = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);
        
        htmlContent += `
          <div class="summary-section">
            <h2>Category Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Percentage</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        sortedCategories.forEach(([category, amount]) => {
          const percentage = totalExpenseAmount > 0 ? ((amount / totalExpenseAmount) * 100).toFixed(1) : '0';
          const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
          const categoryClass = `category-${category}`;
          const barWidth = Math.min((amount / totalExpenseAmount) * 100, 100);
          
          htmlContent += `
            <tr>
              <td><span class="category-tag ${categoryClass}">${categoryName}</span></td>
              <td>${formatCurrency(amount)}</td>
              <td>${percentage}%</td>
              <td>
                <div style="background: #e9ecef; border-radius: 10px; height: 10px; width: 200px;">
                  <div style="background: var(--${category}-color, #4361ee); width: ${barWidth}%; height: 100%; border-radius: 10px;"></div>
                </div>
              </td>
            </tr>
          `;
        });
        
        htmlContent += `
                <tr class="total-row">
                  <td><strong>Total Expenses</strong></td>
                  <td><strong>${formatCurrency(totalExpenseAmount)}</strong></td>
                  <td><strong>100%</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    } else {
      htmlContent += `
        <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
          <h3 style="color: #6c757d;">No transactions for this month</h3>
          <p>Add transactions to see your financial data here.</p>
        </div>
      `;
    }
    
    htmlContent += `
        </div>
        
        <div class="footer">
          <p>Generated by Expense Tracker • www.expensetracker.com</p>
          <p>This report is for personal use only.</p>
        </div>
      </body>
      </html>
    `;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait a bit for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately - let user decide when to close
    }, 500);
    
    showAlert("PDF report generated. Please use 'Save as PDF' in the print dialog.", "success");
    
  } catch (error) {
    console.error('Export Error:', error);
    showAlert("Error generating report: " + error.message, "error");
  }
}

function showAlert(message, type) {
  // Remove existing alerts
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) existingAlert.remove();
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add CSS for alert if not already present
  if (!document.querySelector('#alert-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `
      .alert {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
      }
      .alert-success { background: linear-gradient(135deg, #06D6A0, #118AB2); }
      .alert-error { background: linear-gradient(135deg, #EF476F, #FF6B6B); }
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(alert);
  setTimeout(() => {
    if (alert.parentNode) alert.parentNode.removeChild(alert);
  }, 3000);
}

function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function formatCurrency(number) {
  const absNumber = Math.abs(number);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(absNumber);
  
  return number < 0 ? `-${formatted}` : formatted;
}