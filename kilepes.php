<?php
session_start();
$file = 'online.txt';

if (file_exists($file) && isset($_SESSION['online_noveltek'])) {
    unset($_SESSION['online_noveltek']);
    $online = (int)file_get_contents($file);
    $online = max(0, $online - 1);
    file_put_contents($file, $online);
}

header("Location: vitakor.html");
