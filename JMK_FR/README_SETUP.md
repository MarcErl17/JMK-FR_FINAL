# JMK FR FOODHOUSE - setup (PHP + MySQL, XAMPP)

1. Copy the `JMK_FR` folder to `C:\xampp\htdocs\JMK_FR`. Start **Apache** and **MySQL** in XAMPP.
2. phpMyAdmin (http://localhost/phpmyadmin) -> **Import** -> choose `database.sql` -> Go. This creates database `jmk_fr` with tables `users` and `login_attempts`.
3. If your MySQL user/password is not the XAMPP default (root, empty), edit `api/config.php`.
4. Open **http://localhost/JMK_FR/index.html** (must be served by Apache - double-clicking the file will not work).

## What changed
- `index.html`: new landing page (hero, featured dishes from your product data, about, contact, footer) with a Log In / Sign Up modal.
- `api/auth.php` (+ `api/config.php`): register, login, logout, session check. Prepared statements, `password_hash()` / `password_verify()`, PHP sessions, 5-failures/15-min lockout.
- `assets/js/auth.js`: now calls the API instead of localStorage. `login.html`, `signup.html`, `account.html` still work unchanged.
- `assets/js/modal.js`, `assets/css/landing.css`: modal + animations (respects reduced-motion).
- The old localStorage accounts are no longer used; existing demo accounts must be re-registered.

## Test checklist
Register -> check `users` in phpMyAdmin (password_hash column starts with `$2y$`) -> log in -> wrong password shows an error -> duplicate email/username rejected -> logout -> `account.html` redirects to login.

## User profile page (new)
- `profile.html` (+ `assets/css/profile.css`, `assets/js/profile.js`): dashboard with sidebar, top bar (search, notifications, account menu), cover banner, profile card, Posts / Photos / Favorites tabs, About Me, Food Preferences and My Stats.
- Name, @username and join date come from the logged-in account (`api/auth.php`). Members-only: logged-out visitors are sent to the landing page.
- Edits (display name, bio, location, tags, photo, cover), favorites, likes, comments and hidden posts are stored in the browser's localStorage per user id. They are NOT in MySQL and do not follow the user to another browser.
- Posts, follower/following counts and notifications are sample data (no backend tables exist for them).
- Small changes elsewhere: `auth.js` (profile.html added to members-only/allowed pages; "Hi, Name" nav link now opens the profile), `account.html` ("View my profile" button). Resized images added: `assets/img/profile-*.jpg`.





#hello
