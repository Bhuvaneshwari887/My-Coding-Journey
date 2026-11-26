import java.util.ArrayList;

public class ExpenseManager {

    ArrayList<Expense> expenses = new ArrayList<>();

    public void addExpense(String date, String category,
                            String description, double amount) {

        Expense expense = new Expense(
            date, category, description, amount
        );

        expenses.add(expense);

        System.out.println("Expense added successfully!");
    }

    public void showExpenses() {

        if (expenses.isEmpty()) {
            System.out.println("No expenses found.");
            return;
        }

        for (Expense e : expenses) {
            System.out.println("--------------------");
            System.out.println("Date: " + e.date);
            System.out.println("Category: " + e.category);
            System.out.println("Description: " + e.description);
            System.out.println("Amount: ₹" + e.amount);
        }
    }
}