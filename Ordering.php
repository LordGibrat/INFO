<?php
session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

$phonenum = $_POST['phonenum'];
$textonsign = $_POST['textonsign'];
$event = $_POST['event'];
$color = $_POST['color'];
$details = $_POST['details'];

$conn = new mysqli('127.0.0.1', 'root', '', 'dbgiba');
if ($conn->connect_error) {
    die('Cannot connect to db: ' . $conn->connect_error);
}

// Presence
if (empty($phonenum) || empty($textonsign) || empty($event) || empty($color)) {
    echo "<script>alert('Please fill in all required fields.'); window.history.back();</script>";
    exit();
}

// Length check
if (strlen($phonenum) > 50 || strlen($textonsign) > 50 || strlen($event) > 50 || strlen($color) > 50 || strlen($details) > 255) {
    echo "<script>alert('One or more fields exceed maximum allowed length.'); window.history.back();</script>";
    exit();
}

// Format check for phone
if (!preg_match('/^(\+?\d{1,})$/', $phonenum)) {
    echo "<script>alert('Invalid phone number format.'); window.history.back();</script>";
    exit();
}

// Type checks for TextOnSign and Event
if (!preg_match('/^[a-zA-Z\s]+$/', $textonsign)) {
    echo "<script>alert('Text on sign must contain only letters and spaces.'); window.history.back();</script>";
    exit();
}
if (!preg_match('/^[a-zA-Z\s]+$/', $event)) {
    echo "<script>alert('Event must contain only letters and spaces.'); window.history.back();</script>";
    exit();
}


$check = $conn->prepare("SELECT Phonenumber FROM regisration WHERE Phonenumber = ?");
$check->bind_param("s", $phonenum);
$check->execute();
$check_result = $check->get_result();

if ($check_result->num_rows === 0) {
    echo "<script>
        alert('This phone number is not registered. Please register first.');
        window.location.href = 'Registrarion.html';
    </script>";
    exit();
}
$check->close();

$stmt = $conn->prepare("INSERT INTO ordering (Phonenumber, TextOnSign, Event, Color, Details) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $phonenum, $textonsign, $event, $color, $details);

if ($stmt->execute()) {
    echo "<script>alert('Ordered successfully! Please wait for further instructions via WhatsApp or Messages.');</script>";
    echo "<script>window.location.href='Mainpage.html';</script>";
} else {
    die('Error: ' . $conn->error);
}
?>
