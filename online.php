<?php
session_start();
$file = 'online.txt';

if (!file_exists($file)) {
    file_put_contents($file, "0");
}

$online = (int)file_get_contents($file);

// belépéskor növeljük
if (!isset($_SESSION['online_noveltek'])) {
    $_SESSION['online_noveltek'] = true;
    $online++;
    file_put_contents($file, $online);
}

echo $online;
