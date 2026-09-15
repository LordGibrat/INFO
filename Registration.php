<?php
$name = $_POST['name'] ?? '';
$surname = $_POST['surname'] ?? '';
$phonenum = $_POST['phonenum'] ?? '';
$password = $_POST['password'] ?? '';
$address = $_POST['adress'] ?? '';
$city = $_POST['city'] ?? '';
$conn = new mysqli('127.0.0.1', 'root', '', 'dbgiba') or die('Cannot connect to db');
//VALIDATION
// Presence check
if (empty($name) || empty($surname) || empty($phonenum) || empty($password) || empty($address) || empty($city)) {
   echo "<script>alert('All fields are required.'); window.history.back();</script>";
   exit();
}
// Length check
if (strlen($name) > 50 || strlen($surname) > 50 || strlen($phonenum) > 50 || strlen($password) > 16 || strlen($address) > 50 || strlen($city) > 50) {
   echo "<script>alert('Input too long in one or more fields.'); window.history.back();</script>";
   exit();
}
// Type checks for name, surname, city — must contain letters only
if (!preg_match('/^[a-zA-Z]+$/', $name)) {
   echo "<script>alert('Name must contain only letters.'); window.history.back();</script>";
   exit();
}
if (!preg_match('/^[a-zA-Z]+$/', $surname)) {
   echo "<script>alert('Surname must contain only letters.'); window.history.back();</script>";
   exit();
}
if (!preg_match('/^[a-zA-Z]+$/', $city)) {
   echo "<script>alert('City must contain only letters.'); window.history.back();</script>";
   exit();
}
// Phone number format
if (!preg_match('/^(\+?\d{1,})$/', $phonenum)) {
   echo "<script>alert('Invalid phone number format.'); window.history.back();</script>";
   exit();
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
   echo "<script>alert('Password must be at least 8 characters and include upper, lower, digit, and symbol.'); window.history.back();</script>";
   exit();
}
$queryvar = $conn->prepare("INSERT INTO regisration (Firstname, Lastname, Phonenumber, Password, Adress, City) VALUES (?, ?, ?, ?, ?, ?)");
$queryvar->bind_param("ssssss", $name, $surname, $phonenum, $password, $address, $city);
if ($queryvar->execute()) {
   echo "<script>alert('Registration successful');</script>";
   echo "<script>window.location.href='Mainpage.html';</script>";
} else {
   die('Error: ' . $conn->error);
}
?>