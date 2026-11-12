<?php
// Database settings (XAMPP defaults). Edit here only - this file is never sent to the browser.
const DB_HOST = '127.0.0.1';
const DB_NAME = 'jmk_fr';
const DB_USER = 'root';
const DB_PASS = '';

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.gc_maxlifetime', (string)(30 * 86400));
session_start();

function db(): PDO {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}
