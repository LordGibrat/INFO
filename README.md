# INFO — PHP ordering application

INFO is a small PHP/MySQL web application prototype with separate user and administrator flows.

## What it includes

- Registration with form validation.
- User login and session-based pages.
- An order-creation page.
- Administrator login and administration pages.
- A simple HTML/CSS interface.

The project is intentionally compact and is useful as an early web-development exercise showing forms, PHP request handling, sessions, and MySQL access.

## Main files

- `MainPage.html` — entry page.
- `Login.html` / `Login.php` — user login flow.
- `Registrarion.html` / `Registration.php` — registration flow.
- `Ordering.html` / `Ordering.php` — order flow.
- `adminlogin.php` / `loginprocessadmin.php` — administrator login.
- `adminpage.php` — administrator page.
- `style.css` — shared styling.

## Local setup

The PHP files expect a local MySQL server at `127.0.0.1` and a database named `dbgiba`. Create the required tables before running the application, then serve the repository through Apache, PHP’s development server, or another PHP-capable environment.

```bash
php -S 127.0.0.1:8000
```

Open <http://127.0.0.1:8000/MainPage.html>.

## Security note

This is an educational prototype, not a production-ready service. Before deployment it needs password hashing, prepared statements throughout, CSRF protection, stronger session settings, output escaping, authorization checks, and removal of development database credentials from source code.
