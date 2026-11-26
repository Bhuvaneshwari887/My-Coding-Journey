public class Expense {
    String date;
    String category;
    String description;
    double amount;

    public Expense(String date, String category, String description, double amount) {
        this.date = date;
        this.category = category;
        this.description = description;
        this.amount = amount;
    }
}