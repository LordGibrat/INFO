<?php
session_start();
$setted_id="ADMIN";
$setted_password="GIBANIB@";
 
if($_POST['admin_id'] == $setted_id && $_POST['password'] == $setted_password){
   $_SESSION['admin_logged_in'] = true;
   header("Location: adminpage.php");
}else{
   $_SESSION['error'] = "Неверный ID или пароль.";
   header("Location: adminlogin.php");
}
?>