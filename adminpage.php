<!DOCTYPE html>
<html>
<head>
    <title>View Orders</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<h1>Orders</h1>

<?php
$servername = "127.0.0.1";
$username = "root";
$password = "";
$dbname = "dbgiba";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT Order_ID,Phonenumber, TextOnSign, Event, Color, Details FROM ordering";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    echo "<table>
            <tr>
                <th>Order ID</th>
                <th>Phone Number</th>
                <th>TextOnSign</th>
                <th>Event</th>
                <th>Color</th>
                <th>Details</th>
            </tr>";
    
    while($row = $result->fetch_assoc()) {
        echo "<tr>
                <td>" . htmlspecialchars($row["Order_ID"]) . "</td>
                <td>" . htmlspecialchars($row["Phonenumber"]) . "</td>
                <td>" . htmlspecialchars($row["TextOnSign"]) . "</td>
                <td>" . htmlspecialchars($row["Event"]) . "</td>
                <td>" . htmlspecialchars($row["Color"]) . "</td>
                <td>" . htmlspecialchars($row["Details"]) . "</td>
              </tr>";
    }

    echo "</table>";
} else {
    echo "<p style='text-align:left;'>No orders found.</p>";
}

$conn->close();
?>
</body>
</html>