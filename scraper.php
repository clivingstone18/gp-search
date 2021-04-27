<?php
$state = $_POST['state'];
$suburb = $_POST['suburb'];
$postcode = $_POST['postcode'];

include('simple_html_dom.php');


$core = "https://healthengine.com.au";
$url = "https://healthengine.com.au/appointments/gp/" . $state . "/" . $suburb . "-" . $postcode . "/NextAvailable?acceptsNewPatients=true";
$html = file_get_html($url);
$links = $html->find('a[class="ProfileNamestyles__StyledLink-tgn88t-0 fLcCFy"]');
for ($i = 0; $i < count($links); $i++) {

    $practiceInfo = [];
    $practiceInfo["staff"] = [];


    $prac_link = $core . $links[$i]->href;
    $html = file_get_html($prac_link);
    $address = preg_replace('/\s+/', ' ', $html->find('h2[class="practice-address-text"]', 0)->plaintext);
    $telehealth = $html->find('span[class="profile-telehealth-pill-mob"]', 0)->plaintext;
    $pracName = $html->find('div[class="profile-header-content"]', 0)->find("h1", 0)->plaintext;
    $bulkbills = $html->find('p[class="profile-title bulked-billed"]', 0)->plaintext;
    $rating = $html->find('span[class="rating-percent"]', 0)->plaintext;

    $langs = $html->find('div[class="language one-third"]', 0);
    $langs_arr = [];
    if ($langs) {
        $langs = $langs->find("span");
        for ($j = 0; $j < count($langs); $j++) {
            array_push($langs_arr, trim($langs[$j]->plaintext));
        }
    }
    $practiceInfo["languages"] = $langs_arr;
    $phone = trim($html->find('li[class="phone phone-container"]', 0)->find("span", 0)->plaintext);
    


    $facilities = $html->find('div[class="practice-facilities one-third"]', 0);
    $facilities_arr = [];
    if ($facilities) {
        $facilities = $facilities->find("span");
        for ($j = 0; $j < count($facilities); $j++) {
            if ($facilities[$j]->plaintext) {
                array_push($facilities_arr, $facilities[$j]->plaintext);

            }
        }
    }

    $practiceInfo["facilities"] = $facilities_arr;
    $staff = $html->find('div[class="listing-details with-picture"]');


    for ($j = 0; $j < count($staff); $j++) {
        $name = $staff[$j]->find("h3", 0)->plaintext;
        $prac_type = $staff[$j]->find("span")[0]->plaintext;
        $gender = $staff[$j]->find("span")[1]->plaintext;
        $staffMem = ["name"=>$name, "prac_type"=>$prac_type, "gender"=>$gender];
        array_push($practiceInfo["staff"], $staffMem);
    }
    $practiceInfo["main"] = ["address" => trim($address), "telehealth" => $telehealth, 
    "bulkbills" => $bulkbills, "practiceName" => $pracName, "rating" => $rating, "phone" => $phone]; 

    echo json_encode($practiceInfo);
}
?>


