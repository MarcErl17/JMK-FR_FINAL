<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(array $d, int $code = 200): never { http_response_code($code); echo json_encode($d); exit; }
function user_json(array $u): array {
    return ['id' => (int)$u['id'], 'username' => $u['username'], 'fullName' => $u['full_name'],
            'email' => $u['email'], 'createdAt' => $u['created_at']];
}

$action = $_GET['action'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    $pdo = db();

    if ($action === 'me') {
        if (empty($_SESSION['uid'])) out(['ok' => true, 'user' => null]);
        $s = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $s->execute([$_SESSION['uid']]);
        $u = $s->fetch();
        if (!$u) { session_destroy(); out(['ok' => true, 'user' => null]); }
        out(['ok' => true, 'user' => user_json($u)]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'Invalid request.'], 405);

    if ($action === 'logout') {
        $_SESSION = [];
        setcookie(session_name(), '', time() - 3600, '/');
        session_destroy();
        out(['ok' => true]);
    }

    if ($action === 'register') {
        $name = trim(preg_replace('/\s+/', ' ', (string)($in['fullName'] ?? '')));
        $username = trim((string)($in['username'] ?? ''));
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        $confirm = (string)($in['confirm'] ?? '');
        $e = [];
        if ($name === '' || $username === '' || $email === '' || $pw === '' || $confirm === '') {
            $e[] = 'Please complete all required fields.';
        } else {
            if (mb_strlen($name) < 2 || mb_strlen($name) > 100) $e[] = 'Full name must be between 2 and 100 characters.';
            if (!preg_match('/^[A-Za-z0-9_.]{3,30}$/', $username)) $e[] = 'Username must be 3-30 characters: letters, numbers, underscore or dot only.';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) $e[] = 'Please enter a valid email address.';
            if (strlen($pw) < 8) $e[] = 'Password must be at least 8 characters long.';
            elseif (strlen($pw) > 72) $e[] = 'Password must be 72 characters or fewer.';
            elseif (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) $e[] = 'Password must include at least one letter and one number.';
            if ($pw !== $confirm) $e[] = 'Password and confirm password do not match.';
        }
        if (empty($in['terms'])) $e[] = 'You must accept the Terms and Conditions to register.';
        if ($e) out(['ok' => false, 'errors' => $e], 422);

        $s = $pdo->prepare('SELECT email, username FROM users WHERE email = ? OR username = ?');
        $s->execute([$email, $username]);
        foreach ($s->fetchAll() as $r) {
            if ($r['email'] === $email) $e[] = 'That email address is already registered. Try logging in instead.';
            if (strcasecmp($r['username'], $username) === 0) $e[] = 'That username is already taken. Please choose another.';
        }
        if ($e) out(['ok' => false, 'errors' => array_values(array_unique($e))], 409);

        try {
            $pdo->prepare('INSERT INTO users (full_name, username, email, password_hash) VALUES (?, ?, ?, ?)')
                ->execute([$name, $username, $email, password_hash($pw, PASSWORD_DEFAULT)]);
        } catch (PDOException $x) {
            if ($x->getCode() === '23000') out(['ok' => false, 'errors' => ['That email or username is already registered.']], 409);
            throw $x;
        }
        out(['ok' => true, 'username' => $username]);
    }

    if ($action === 'login') {
        $id = strtolower(trim((string)($in['identifier'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        if ($id === '' || $pw === '') out(['ok' => false, 'error' => 'Please enter your email/username and password.'], 422);

        $s = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE identifier = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
        $s->execute([$id]);
        if ((int)$s->fetchColumn() >= 5) out(['ok' => false, 'error' => 'Too many failed attempts. Please wait 15 minutes and try again.'], 429);

        $s = $pdo->prepare('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1');
        $s->execute([$id, $id]);
        $u = $s->fetch();
        // Always run a hash check so unknown accounts and wrong passwords take similar time
        $hash = $u['password_hash'] ?? '$2y$10$usesomesillystringforsalt.invalidinvalidinvalidinvalidinv';
        if ($u && password_verify($pw, $hash)) {
            $pdo->prepare('DELETE FROM login_attempts WHERE identifier = ?')->execute([$id]);
            session_regenerate_id(true);
            $_SESSION['uid'] = (int)$u['id'];
            if (!empty($in['remember'])) {
                setcookie(session_name(), session_id(), ['expires' => time() + 30 * 86400, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
            }
            if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
                $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
            }
            out(['ok' => true, 'user' => user_json($u)]);
        }
        $pdo->prepare('INSERT INTO login_attempts (identifier) VALUES (?)')->execute([$id]);
        // Same message for wrong password and unknown account (prevents account enumeration)
        out(['ok' => false, 'error' => 'Invalid email/username or password. New here? Sign up to create an account.'], 401);
    }

    out(['ok' => false, 'error' => 'Unknown action.'], 400);
} catch (Throwable $t) {
    error_log('JMK auth error: ' . $t->getMessage());
    out(['ok' => false, 'error' => 'Server error. Make sure MySQL is running and database.sql has been imported.',
         'errors' => ['Server error. Make sure MySQL is running and database.sql has been imported.']], 500);
}
