import java.util.Scanner;

public class Main {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        ExpenseManager manager = new ExpenseManager();

        System.out.println("===== EXPENSE TRACKER =====");

        System.out.print("Enter date: ");
        String date = sc.nextLine();

        System.out.print("Enter category: ");
        String category = sc.nextLine();

        System.out.print("Enter description: ");
        String description = sc.nextLine();

        System.out.print("Enter amount: ");
        double amount = sc.nextDouble();

        manager.addExpense(date, category, description, amount);

        System.out.println("\n===== EXPENSES =====");
        manager.showExpenses();

        sc.close();
    }
}