import type { InsectRecord } from "@/lib/types";

export const sampleRecords: InsectRecord[] = [
  {
    id:"kabuto-001", userId:"demo-user", commonNameJa:"カブトムシ", commonNameEn:"Japanese rhinoceros beetle", scientificName:"Trypoxylus dichotomus", order:"コウチュウ目", family:"コガネムシ科", genus:"カブトムシ属", isInsect:true,
    candidates:[{ commonNameJa:"カブトムシ", scientificName:"Trypoxylus dichotomus", confidence:.96 }], confidence:.96,
    identificationReason:"大きく湾曲した頭角と、光沢のある赤褐色の上翅が確認できます。", description:"日本の雑木林を代表する大型の甲虫。夜間にクヌギやコナラの樹液へ集まります。", habitat:"雑木林、里山", activeSeason:"6月〜8月", dangerLevel:"none", warnings:[], capturedAt:"2026-07-20T19:42:00+09:00", locationName:"東京都・高尾山", latitude:35.625, longitude:139.243, memo:"クヌギの樹液に来ていた。", tags:["夏","夜","雑木林"], favorite:true,
    driveFileId:"demo-file-kabuto", driveFolderId:"demo-folder", originalFileName:"IMG_2142.jpg", storedFileName:"01H-kabuto.webp", mimeType:"image/webp", width:1200, height:1600, fileSize:482000, contentHash:"demo-kabuto-hash", uploadStatus:"completed", aiModel:"mock-v1", aiRawResult:{}, searchKeywords:["かぶとむし","カブトムシ","kabuto","trypoxylus"], createdAt:"2026-07-20T19:44:00+09:00", updatedAt:"2026-07-20T19:44:00+09:00", imageUrl:"/images/kabuto.jpg"
  },
  {
    id:"ageha-001", userId:"demo-user", commonNameJa:"ナミアゲハ", commonNameEn:"Asian swallowtail", scientificName:"Papilio xuthus", order:"チョウ目", family:"アゲハチョウ科", genus:"アゲハチョウ属", isInsect:true,
    candidates:[{ commonNameJa:"ナミアゲハ", scientificName:"Papilio xuthus", confidence:.91 }], confidence:.91,
    identificationReason:"黄白色と黒色の翅模様、後翅の尾状突起が確認できます。", description:"街中でもよく見られる大型のチョウ。ミカン科植物の周りを飛びます。", habitat:"庭、公園、林縁", activeSeason:"4月〜10月", dangerLevel:"none", warnings:[], capturedAt:"2026-07-18T10:20:00+09:00", locationName:"神奈川県・鎌倉市", latitude:35.319, longitude:139.547, memo:"花壇のランタナで吸蜜。", tags:["蝶","花","昼"], favorite:false,
    driveFileId:"demo-file-ageha", driveFolderId:"demo-folder", originalFileName:"IMG_2098.jpg", storedFileName:"01H-ageha.webp", mimeType:"image/webp", width:1600, height:1067, fileSize:396000, contentHash:"demo-ageha-hash", uploadStatus:"completed", aiModel:"mock-v1", aiRawResult:{}, searchKeywords:["なみあげは","ナミアゲハ","papilio"], createdAt:"2026-07-18T10:21:00+09:00", updatedAt:"2026-07-18T10:21:00+09:00", imageUrl:"/images/ageha.jpg"
  },
  {
    id:"tamamushi-001", userId:"demo-user", commonNameJa:"ヤマトタマムシ", commonNameEn:"Jewel beetle", scientificName:"Chrysochroa fulgidissima", order:"コウチュウ目", family:"タマムシ科", genus:"ルリタマムシ属", isInsect:true,
    candidates:[{ commonNameJa:"ヤマトタマムシ", scientificName:"Chrysochroa fulgidissima", confidence:.83 }], confidence:.83,
    identificationReason:"緑色の金属光沢と、縦方向に走る赤紫色の帯が特徴と一致します。", description:"虹色の金属光沢が美しい甲虫。晴れた暑い日に活発に飛びます。", habitat:"エノキやケヤキのある林", activeSeason:"7月〜8月", dangerLevel:"none", warnings:[], capturedAt:"2026-07-12T13:08:00+09:00", locationName:"埼玉県・飯能市", latitude:35.855, longitude:139.327, memo:"飛んできて柵に止まった。", tags:["甲虫","虹色","夏"], favorite:true,
    driveFileId:"demo-file-tamamushi", driveFolderId:"demo-folder", originalFileName:"IMG_1981.png", storedFileName:"01H-tamamushi.webp", mimeType:"image/webp", width:1580, height:1180, fileSize:512000, contentHash:"demo-tamamushi-hash", uploadStatus:"completed", aiModel:"mock-v1", aiRawResult:{}, searchKeywords:["たまむし","ヤマトタマムシ","jewel"], createdAt:"2026-07-12T13:10:00+09:00", updatedAt:"2026-07-12T13:10:00+09:00", imageUrl:"/images/tamamushi.png"
  }
];
