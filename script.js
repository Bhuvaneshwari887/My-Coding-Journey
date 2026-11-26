
const API_URL = "http://localhost:8080/api/expenses";
const ADD_URL = "http://localhost:8080/api/expense";
const DELETE_URL = "http://localhost:8080/api/delete-expense";

let allTransactions = [];
let expenseChart = null;

const chartColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#7ED957",
    "#F472B6",
    "#845EC2",
    "#00C9A7",
    "#E76F51",
    "#C084FC"
];

document.addEventListener("DOMContentLoaded", () => {
    loadTransactions();
loadMonthlyBudget();

const saveButton = document.getElementById("saveBudget");

if (saveButton) {
    saveButton.addEventListener("click", function () {
        console.log("Save Budget button clicked!");
        saveMonthlyBudget();
    });
} else {
    console.error("saveBudget button HTML-la kidaikkala!");
}
    const form = document.getElementById("transactionForm");

    if (form) {
        form.addEventListener("submit", addTransaction);
    }

    [
        "searchInput",
        "typeFilter",
        "categoryFilter",
        "startDate",
        "endDate"
    ].forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener("input", applyFilters);
            element.addEventListener("change", applyFilters);
        }
    });

    document.getElementById("resetFilters")
        ?.addEventListener("click", resetFilters);

    document.getElementById("downloadCSV")
        ?.addEventListener("click", downloadCSV);
});
// MONTHLY BUDGET SYSTEM
function getCurrentMonth() {
    const now = new Date();

    return (
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0")
    );
}

// 1. LOAD TRANSACTIONS
async function loadTransactions() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to load transactions");
        }

        allTransactions = await response.json();

        updateCategoryOptions();
        applyFilters();

updateMonthlyBudgetDisplay();
    } catch (error) {
        console.error("Loading error:", error);

        showMessage(
            "Backend start pannirukka check pannu!",
            "error"
        );
    }
}


// 2. ADD TRANSACTION
async function addTransaction(event) {
    event.preventDefault();

    const description =
        document.getElementById("description")?.value.trim();

    const amount =
        Number(document.getElementById("amount")?.value);

    const type =
        document.getElementById("type")?.value;

    const category =
        document.getElementById("category")?.value;

    const date =
        document.getElementById("date")?.value;

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !type ||
        !date
    ) {
        showMessage("Correct details enter pannu!", "error");
        return;
    }

    const transaction = {
        description: description,
        amount: amount,
        type: type,
        category: category || "Other",
        date: date
    };

    try {
        const response = await fetch(ADD_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transaction)
        });

        if (!response.ok) {
            throw new Error("Transaction save failed");
        }

        document.getElementById("transactionForm")?.reset();

        showMessage("Transaction added successfully!", "success");

        await loadTransactions();

    } catch (error) {
        console.error("Add error:", error);

        showMessage(
            "Save aagala! Backend POST route check pannu.",
            "error"
        );
    }
}


// 3. SEARCH AND FILTER
function applyFilters() {
    const searchText = (
        document.getElementById("searchInput")?.value || ""
    ).toLowerCase().trim();

    const selectedType =
        document.getElementById("typeFilter")?.value || "";

    const selectedCategory =
        document.getElementById("categoryFilter")?.value || "";

    const startDate =
        document.getElementById("startDate")?.value || "";

    const endDate =
        document.getElementById("endDate")?.value || "";

    const filteredTransactions = allTransactions.filter(item => {
        const description =
            String(item.description || "").toLowerCase();

        const category =
            String(item.category || "Other");

        const type =
            String(item.type || "").toLowerCase();

        const date =
            String(item.date || item.transaction_date || "")
                .slice(0, 10);

        const matchesSearch =
            description.includes(searchText) ||
            category.toLowerCase().includes(searchText);

        const matchesType =
            !selectedType ||
            type === selectedType.toLowerCase();

        const matchesCategory =
            !selectedCategory ||
            category === selectedCategory;

        const matchesStartDate =
            !startDate || date >= startDate;

        const matchesEndDate =
            !endDate || date <= endDate;

        return (
            matchesSearch &&
            matchesType &&
            matchesCategory &&
            matchesStartDate &&
            matchesEndDate
        );
    });

    updateSummary(filteredTransactions);
    displayTransactions(filteredTransactions);
    updateChart(filteredTransactions);
}


// 4. UPDATE SUMMARY CARDS
function updateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(item => {
        const amount = Number(item.amount) || 0;
        const type = String(item.type).toLowerCase();

        if (type === "income") {
            totalIncome += amount;
        } else if (type === "expense") {
            totalExpense += amount;
        }
    });

    setText("totalIncome", formatMoney(totalIncome));
    setText("totalExpense", formatMoney(totalExpense));
    setText("totalBalance", formatMoney(totalIncome - totalExpense));
}


// 5. DISPLAY TRANSACTION TABLE
function displayTransactions(transactions) {
    const tableBody =
        document.getElementById("transactionTable");

    if (!tableBody) {
        console.warn("transactionTable element missing");
        return;
    }

    tableBody.replaceChildren();

    if (transactions.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No transactions found";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    transactions.forEach(item => {
        const row = document.createElement("tr");

        const date =
            String(item.date || item.transaction_date || "")
                .slice(0, 10);

        const values = [
            date,
            item.description || "",
            item.category || "Other",
            item.type || "",
            formatMoney(Number(item.amount) || 0)
        ];

        values.forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = value;

            if (index === 3) {
                cell.classList.add(
                    String(item.type).toLowerCase() === "income"
                        ? "income"
                        : "expense"
                );
            }

            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id);
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}


// 6. COLOURFUL BAR CHART
function updateChart(transactions) {
    const canvas = document.getElementById("expenseChart");

    if (!canvas) {
        console.warn("expenseChart canvas missing");
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js not loaded");
        return;
    }

    const categoryTotals = {};

    transactions.forEach(item => {
        if (String(item.type).toLowerCase() !== "expense") {
            return;
        }

        const category = item.category || "Other";
        const amount = Number(item.amount) || 0;

        categoryTotals[category] =
            (categoryTotals[category] || 0) + amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const colors = labels.map(
        (_, index) => chartColors[index % chartColors.length]
    );

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [{
                label: "Expenses (₹)",
                data: values,

                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 10,
                hoverBackgroundColor: colors,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true,

                    labels: {
                        usePointStyle: true,
                        padding: 18
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return " ₹" +
                                Number(context.raw)
                                    .toLocaleString("en-IN");
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        callback: function(value) {
                            return "₹" +
                                Number(value).toLocaleString("en-IN");
                        }
                    }
                }
            }
        }
    });
}


// 7. UPDATE CATEGORY FILTER
function updateCategoryOptions() {
    const select =
        document.getElementById("categoryFilter");

    if (!select) return;

    const previousValue = select.value;

    const categories = [
        ...new Set(
            allTransactions.map(item => item.category || "Other")
        )
    ].sort();

    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All Categories";

    select.appendChild(allOption);

    categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        select.appendChild(option);
    });

    if (categories.includes(previousValue)) {
        select.value = previousValue;
    }
}


// 8. DELETE TRANSACTION
async function deleteTransaction(id) {
    if (id === undefined || id === null) {
        showMessage("Transaction ID missing!", "error");
        return;
    }

    if (!confirm("Indha transaction-a delete pannalama?")) {
        return;
    }

    try {
        const response = await fetch(
            `${DELETE_URL}?id=${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        showMessage("Transaction deleted!", "success");

        await loadTransactions();

    } catch (error) {
        console.error("Delete error:", error);

        showMessage(
            "Delete aagala! Backend DELETE route check pannu.",
            "error"
        );
    }
}


// 9. RESET FILTERS
function resetFilters() {
    [
        "searchInput",
        "typeFilter",
        "categoryFilter",
        "startDate",
        "endDate"
    ].forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });

    applyFilters();
}


// 10. DOWNLOAD CSV
function downloadCSV() {
    if (allTransactions.length === 0) {
        showMessage("Download panna data illa!", "error");
        return;
    }

    const headers = [
        "ID",
        "Date",
        "Description",
        "Category",
        "Type",
        "Amount"
    ];

    const rows = allTransactions.map(item => [
        item.id,
        item.date || item.transaction_date || "",
        item.description || "",
        item.category || "Other",
        item.type || "",
        item.amount
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "personal-expenses.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


// 11. HELPER FUNCTIONS
function csvEscape(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatMoney(amount) {
    return "₹" + amount.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function showMessage(message, type) {
    let box = document.getElementById("appMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "appMessage";
        box.setAttribute("role", "status");

        Object.assign(box.style, {
            position: "fixed",
            top: "18px",
            right: "18px",
            zIndex: "9999",
            padding: "12px 18px",
            borderRadius: "10px",
            color: "#ffffff",
            maxWidth: "320px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        });

        document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.backgroundColor =
        type === "success" ? "#16a34a" : "#dc2626";

    box.style.display = "block";

    clearTimeout(showMessage.timeoutId);

    showMessage.timeoutId = setTimeout(() => {
        box.style.display = "none";
    }, 3500);
}

// LOAD MONTHLY BUDGET
function loadMonthlyBudget() {
    const month = getCurrentMonth();

    const savedBudget = localStorage.getItem(
        "monthlyBudget_" + month
    );

    const budgetInput = document.getElementById("budgetInput");

    if (savedBudget && budgetInput) {
        budgetInput.value = savedBudget;
    }

    updateMonthlyBudgetDisplay();
}




// SAVE MONTHLY BUDGET
function saveMonthlyBudget() {
    
    const budgetInput = document.getElementById("budgetInput");

    if (!budgetInput) {
        showMessage("Budget input field HTML-la missing!", "error");
        return;
    }

    const amount = Number(budgetInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Valid monthly budget enter pannu!", "error");
        return;
    }

    const month = getCurrentMonth();

    localStorage.setItem(
        "monthlyBudget_" + month,
        String(amount)
    );

    updateMonthlyBudgetDisplay();

    showMessage("Monthly budget saved successfully!", "success");
}


// UPDATE BUDGET DETAILS
function updateMonthlyBudgetDisplay() {
    const month = getCurrentMonth();

    const savedBudget = localStorage.getItem(
        "monthlyBudget_" + month
    );

    const budget = savedBudget ? Number(savedBudget) : 0;

    let spent = 0;

    allTransactions.forEach(item => {
        const type = String(item.type || "").toLowerCase();

        const date = String(
            item.date || item.transaction_date || ""
        ).slice(0, 10);

        const transactionMonth = date.slice(0, 7);

        if (type === "expense" && transactionMonth === month) {
            spent += Number(item.amount) || 0;
        }
    });

    const remaining = budget - spent;

    const percentage = budget > 0
        ? (spent / budget) * 100
        : 0;

    setText("budgetTotal", formatMoney(budget));
    setText("budgetSpent", formatMoney(spent));
    setText("budgetRemaining", formatMoney(remaining));

    setText(
        "budgetPercent",
        budget > 0
            ? Math.round(percentage) + "% used"
            : "Set your monthly budget"
    );

    const progress = document.getElementById("budgetProgress");

    if (progress) {
        progress.style.width = Math.min(percentage, 100) + "%";

        if (percentage >= 100) {
            progress.style.backgroundColor = "#dc2626";
        } else if (percentage >= 80) {
            progress.style.backgroundColor = "#f59e0b";
        } else {
            progress.style.backgroundColor = "#16a34a";
        }
    }

    const remainingElement =
        document.getElementById("budgetRemaining");

    if (remainingElement) {
        remainingElement.style.color =
            remaining < 0 ? "#dc2626" : "";
    }
}
