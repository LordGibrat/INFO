<?php session_start(); ?>
<!DOCTYPE html>
<html>
<head><title>Login Admin</title>
 
</head>
<body>
<?php session_start(); ?>
<!DOCTYPE html>
<html>
<head>
    <title>Login Admin</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h2>Login Admin</h2>
<?php 
if (isset($_SESSION['error'])) {
   echo "<p style='color:red; text-align:center;'>" . $_SESSION['error'] . "</p>";
   unset($_SESSION['error']);
}
?>
<form method="post" action="loginprocessadmin.php">
    <label>Admin ID:</label>
    <input type="text" name="admin_id" required>
    <label>Password:</label>
    <input type="password" name="password" required>
    <button type="submit">Log in</button>
</form>
</body>
</html>