<?php
session_start();
$conn = new mysqli('127.0.0.1', 'root', '', 'dbgiba');
if ($conn->connect_error) {
    die('Cannot connect to database: ' . $conn->connect_error);
}

$phonenum = $_POST['phonenum'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($phonenum) || empty($password)) {
    echo "<script>alert('Please provide both phone number and password.'); window.history.back();</script>";
    exit();
}

// Check if the phone number exists
$checkPhone = $conn->prepare("SELECT Password FROM regisration WHERE Phonenumber = ?");
$checkPhone->bind_param("s", $phonenum);
$checkPhone->execute();
$result = $checkPhone->get_result();

if ($result->num_rows === 0) {
    // Phone number is not registered
    echo "<script>
        alert('This phone number is not registered. Please register first.');
        window.location.href = 'Registrarion.html';
    </script>";
    exit();
}

$row = $result->fetch_assoc();

if ($row['Password'] === $password) {
    $_SESSION['Phonenumber'] = $phonenum;
    echo "<script>alert('Login successful!'); window.location.href='Ordering.html';</script>";
} else {
    echo "<script>alert('Invalid phone number or password.'); window.history.back();</script>";
}

$checkPhone->close();
$conn->close();
?>
