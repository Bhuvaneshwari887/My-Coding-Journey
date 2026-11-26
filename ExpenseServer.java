
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.math.BigDecimal;
import java.sql.Date;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExpenseServer {

    // Read a string field from JSON
    private static String getJsonString(String json, String key) {
        Pattern pattern = Pattern.compile(
            "\"" + Pattern.quote(key)
            + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\""
        );

        Matcher matcher = pattern.matcher(json);

        if (!matcher.find()) {
            throw new IllegalArgumentException(
                "Missing JSON field: " + key
            );
        }

        return matcher.group(1)
            .replace("\\\"", "\"")
            .replace("\\\\", "\\")
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t");
    }

    // Read a numeric field from JSON
    private static String getJsonNumber(String json, String key) {
        Pattern pattern = Pattern.compile(
            "\"" + Pattern.quote(key)
            + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)"
        );

        Matcher matcher = pattern.matcher(json);

        if (!matcher.find()) {
            throw new IllegalArgumentException(
                "Missing or invalid number: " + key
            );
        }

        return matcher.group(1);
    }

    // Escape text before returning JSON
    private static String jsonEscape(String value) {
        if (value == null) {
            return "";
        }

        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    // Common CORS headers
    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin", "*"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods",
            "GET, POST, DELETE, OPTIONS"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers", "Content-Type"
        );
    }

    // Send HTTP response
    private static void sendResponse(
            HttpExchange exchange,
            int status,
            String message,
            String contentType) throws IOException {

        byte[] response =
            message.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
            "Content-Type", contentType
        );

        exchange.sendResponseHeaders(status, response.length);
        exchange.getResponseBody().write(response);
    }

    public static void main(String[] args) throws IOException {

        HttpServer server = HttpServer.create(
            new InetSocketAddress(8080), 0
        );

        // =====================================
        // TEST API
        // GET http://localhost:8080/api/test
        // =====================================

        server.createContext("/api/test", exchange -> {
            setCorsHeaders(exchange);

            try {
                if ("OPTIONS".equalsIgnoreCase(
                        exchange.getRequestMethod())) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                if (!"GET".equalsIgnoreCase(
                        exchange.getRequestMethod())) {
                    sendResponse(
                        exchange, 405,
                        "Only GET method is allowed",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                sendResponse(
                    exchange, 200,
                    "Expense Tracker Backend is Working!",
                    "text/plain; charset=UTF-8"
                );

            } finally {
                exchange.close();
            }
        });

        // =====================================
        // ADD TRANSACTION API
        // POST http://localhost:8080/api/expense
        // =====================================

        server.createContext("/api/expense", exchange -> {
            setCorsHeaders(exchange);

            try {
                String method = exchange.getRequestMethod();

                if ("OPTIONS".equalsIgnoreCase(method)) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                if (!"POST".equalsIgnoreCase(method)) {
                    sendResponse(
                        exchange, 405,
                        "Only POST method is allowed",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                String data = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
                );

                System.out.println("Received transaction:");
                System.out.println(data);

                String description =
                    getJsonString(data, "description");

                BigDecimal amount = new BigDecimal(
                    getJsonNumber(data, "amount")
                );

                String type = getJsonString(data, "type");
                String category = getJsonString(data, "category");
                String dateText = getJsonString(data, "date");

                if (description.isBlank()
                        || category.isBlank()
                        || amount.compareTo(BigDecimal.ZERO) <= 0) {
                    sendResponse(
                        exchange, 400,
                        "Enter a description, category and positive amount",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                if (!type.equals("expense")
                        && !type.equals("income")) {
                    sendResponse(
                        exchange, 400,
                        "Type must be expense or income",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                Date transactionDate;

                try {
                    transactionDate = Date.valueOf(dateText);
                } catch (IllegalArgumentException ex) {
                    sendResponse(
                        exchange, 400,
                        "Date must use yyyy-MM-dd format",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                String sql =
                    "INSERT INTO transactions " +
                    "(description, amount, type, category, transaction_date) " +
                    "VALUES (?, ?, ?, ?, ?)";

                try (
                    Connection connection =
                        DatabaseConnection.getConnection();

                    PreparedStatement statement =
                        connection.prepareStatement(sql)
                ) {
                    statement.setString(1, description);
                    statement.setBigDecimal(2, amount);
                    statement.setString(3, type);
                    statement.setString(4, category);
                    statement.setDate(5, transactionDate);

                    int rows = statement.executeUpdate();

                    if (rows == 1) {
                        sendResponse(
                            exchange, 200,
                            "Transaction saved successfully",
                            "text/plain; charset=UTF-8"
                        );
                        System.out.println(
                            "Transaction saved to MySQL!"
                        );
                    } else {
                        sendResponse(
                            exchange, 500,
                            "Transaction was not saved",
                            "text/plain; charset=UTF-8"
                        );
                    }
                }

            } catch (IllegalArgumentException ex) {
                sendResponse(
                    exchange, 400,
                    ex.getMessage(),
                    "text/plain; charset=UTF-8"
                );

            } catch (SQLException ex) {
                ex.printStackTrace();

                sendResponse(
                    exchange, 500,
                    "Database error. Check server terminal.",
                    "text/plain; charset=UTF-8"
                );

            } catch (Exception ex) {
                ex.printStackTrace();

                sendResponse(
                    exchange, 500,
                    "Server error. Check server terminal.",
                    "text/plain; charset=UTF-8"
                );

            } finally {
                exchange.close();
            }
        });

        // =====================================
        // GET ALL TRANSACTIONS API
        // GET http://localhost:8080/api/expenses
        // =====================================

        server.createContext("/api/expenses", exchange -> {
            setCorsHeaders(exchange);

            try {
                String method = exchange.getRequestMethod();

                if ("OPTIONS".equalsIgnoreCase(method)) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                if (!"GET".equalsIgnoreCase(method)) {
                    sendResponse(
                        exchange, 405,
                        "Only GET method is allowed",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                StringBuilder json = new StringBuilder("[");
                boolean first = true;

                String sql =
                    "SELECT id, description, amount, type, category, " +
                    "transaction_date FROM transactions ORDER BY id DESC";

                try (
                    Connection connection =
                        DatabaseConnection.getConnection();

                    PreparedStatement statement =
                        connection.prepareStatement(sql);

                    ResultSet resultSet = statement.executeQuery()
                ) {
                    while (resultSet.next()) {
                        if (!first) {
                            json.append(",");
                        }

                        first = false;

                        json.append("{")
                            .append("\"id\":")
                            .append(resultSet.getLong("id"))
                            .append(",")

                            .append("\"description\":\"")
                            .append(jsonEscape(
                                resultSet.getString("description")
                            ))
                            .append("\",")

                            .append("\"amount\":")
                            .append(resultSet.getBigDecimal("amount"))
                            .append(",")

                            .append("\"type\":\"")
                            .append(jsonEscape(
                                resultSet.getString("type")
                            ))
                            .append("\",")

                            .append("\"category\":\"")
                            .append(jsonEscape(
                                resultSet.getString("category")
                            ))
                            .append("\",")

                            .append("\"date\":\"")
                            .append(resultSet.getDate("transaction_date"))
                            .append("\"")
                            .append("}");
                    }
                }

                json.append("]");

                sendResponse(
                    exchange, 200,
                    json.toString(),
                    "application/json; charset=UTF-8"
                );

                System.out.println(
                    "Transactions fetched from MySQL!"
                );

            } catch (SQLException ex) {
                ex.printStackTrace();

                sendResponse(
                    exchange, 500,
                    "{\"error\":\"Unable to fetch transactions\"}",
                    "application/json; charset=UTF-8"
                );

            } catch (Exception ex) {
                ex.printStackTrace();

                sendResponse(
                    exchange, 500,
                    "{\"error\":\"Server error\"}",
                    "application/json; charset=UTF-8"
                );

            } finally {
                exchange.close();
            }
        });

        // =====================================
        // DELETE TRANSACTION API
        // DELETE http://localhost:8080/api/delete-expense?id=3
        // =====================================

        server.createContext("/api/delete-expense", exchange -> {
            setCorsHeaders(exchange);

            try {
                String method = exchange.getRequestMethod();

                if ("OPTIONS".equalsIgnoreCase(method)) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                if (!"DELETE".equalsIgnoreCase(method)) {
                    sendResponse(
                        exchange, 405,
                        "Only DELETE method is allowed",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                String query = exchange.getRequestURI().getQuery();
                long id = -1;

                if (query != null) {
                    for (String parameter : query.split("&")) {
                        String[] pair = parameter.split("=", 2);

                        if (pair.length == 2
                                && pair[0].equals("id")) {
                            id = Long.parseLong(pair[1]);
                            break;
                        }
                    }
                }

                if (id <= 0) {
                    sendResponse(
                        exchange, 400,
                        "Valid transaction id is required",
                        "text/plain; charset=UTF-8"
                    );
                    return;
                }

                String sql =
                    "DELETE FROM transactions WHERE id = ?";

                try (
                    Connection connection =
                        DatabaseConnection.getConnection();

                    PreparedStatement statement =
                        connection.prepareStatement(sql)
                ) {
                    statement.setLong(1, id);

                    int rows = statement.executeUpdate();

                    if (rows == 1) {
                        sendResponse(
                            exchange, 200,
                            "Transaction deleted successfully",
                            "text/plain; charset=UTF-8"
                        );

                        System.out.println(
                            "Deleted transaction ID: " + id
                        );
                    } else {
                        sendResponse(
                            exchange, 404,
                            "Transaction not found",
                            "text/plain; charset=UTF-8"
                        );
                    }
                }

            } catch (NumberFormatException ex) {
                sendResponse(
                    exchange, 400,
                    "Invalid transaction id",
                    "text/plain; charset=UTF-8"
                );

            } catch (Exception ex) {
                ex.printStackTrace();

                sendResponse(
                    exchange, 500,
                    "Delete failed. Check server terminal.",
                    "text/plain; charset=UTF-8"
                );

            } finally {
                exchange.close();
            }
        });

        // =====================================
        // START SERVER
        // =====================================

        server.start();

        System.out.println("Server started!");
        System.out.println(
            "Test API: http://localhost:8080/api/test"
        );
        System.out.println(
            "Add API: http://localhost:8080/api/expense"
        );
        System.out.println(
            "View API: http://localhost:8080/api/expenses"
        );
        System.out.println(
            "Delete API: http://localhost:8080/api/delete-expense?id=3"
        );
    }
}
