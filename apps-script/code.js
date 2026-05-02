// ================================================================

//  GOOGLE APPS SCRIPT — Sistem Order & Retur EIGER

//  Sheet yang dipakai:

//    - Master_Toko    -> sumber data toko

//    - Master_Produk  -> sumber data produk (SKU dan Quantity)

//    - Master_Admin   -> daftar admin (Admin ID, Username, Password, Nama, Aktif)

//    - Orders         -> hasil input order/retur (dibuat otomatis)

// ================================================================



var SHEET_TOKO   = "Master_Toko";

var SHEET_PRODUK = "Master_Produk";

var SHEET_ORDERS = "Orders";

var SHEET_ADMIN  = "Master_Admin";



// ----------------------------------------------------------------

// doGet

// ----------------------------------------------------------------

function doGet(e) {

  var action = e.parameter.action;



  if (action === "getInit")      return getInit();

  if (action === "getToko")      return getToko();

  if (action === "getProduk")    return getProduk();

  if (action === "getOrders")    return getOrders();

  if (action === "updateStatus") return updateStatus(e.parameter.id, e.parameter.status);

  if (action === "loginAdmin")   return loginAdmin(e.parameter.username, e.parameter.password);



  return HtmlService

    .createHtmlOutputFromFile("index")

    .setTitle("Sistem Order & Retur - EIGER")

    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

}



// ----------------------------------------------------------------

// doPost  --  PERBAIKAN: simpan SKU/Nama/Type/Qty dari produkList

// ----------------------------------------------------------------

function doPost(e) {

  try {

    var data  = JSON.parse(e.postData.contents);

    var ss    = SpreadsheetApp.getActiveSpreadsheet();

    var sheet = ss.getSheetByName(SHEET_ORDERS);



    if (!sheet) {

      sheet = ss.insertSheet(SHEET_ORDERS);

      var header = ["ID Order","Timestamp","Store ID","Nama Toko","Branch",

                    "SKU Article","Nama Produk","Type","Qty","Jenis","EA Method","Catatan","Produk List","Status"];

      sheet.appendRow(header);

      var hr = sheet.getRange(1, 1, 1, header.length);

      hr.setFontWeight("bold");

      hr.setBackground("#1D9E75");

      hr.setFontColor("#FFFFFF");

      sheet.setFrozenRows(1);

    }



    var newId = generateOrderId(sheet);

    var produkList = data.produkList || [];



    // ── PERBAIKAN: ambil produk pertama untuk kolom SKU/Nama/Type/Qty

    // Kalau ada >1 produk, gabung jadi ringkasan di kolom-kolom tersebut

    var firstSku = "", firstNama = "", firstType = "", totalQty = 0, ringkasanSku = "", ringkasanNama = "";



    if (produkList.length > 0) {

      firstSku  = produkList[0].sku  || "";

      firstNama = produkList[0].nama || "";

      firstType = produkList[0].type || "";



      var skuArr = [], namaArr = [];

      produkList.forEach(function(p) {

        totalQty += (parseInt(p.qty) || 0);

        if (p.sku)  skuArr.push(p.sku);

        if (p.nama) namaArr.push(p.nama + " (x" + (p.qty || 0) + ")");

      });



      if (produkList.length > 1) {

        ringkasanSku  = skuArr.join(", ");

        ringkasanNama = namaArr.join(" | ");

      } else {

        ringkasanSku  = firstSku;

        ringkasanNama = firstNama;

      }

    } else {

      // Fallback jika kirim format lama (1 produk per request)

      firstSku  = data.skuArticle || "";

      firstNama = data.namaProduk || "";

      firstType = data.typeProduk || "";

      totalQty  = parseInt(data.qty) || 0;

      ringkasanSku  = firstSku;

      ringkasanNama = firstNama;

    }



    sheet.appendRow([

      newId,

      new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),

      data.storeId    || "",

      data.namaToko   || "",

      data.branch     || "",

      ringkasanSku,                                  // SKU Article (gabungan)

      ringkasanNama,                                 // Nama Produk (gabungan)

      firstType,                                     // Type (produk pertama)

      totalQty,                                      // Qty total

      data.jenis      || "EA",

      data.eaMethod   || "",

      data.catatan    || "",

      JSON.stringify(produkList),                    // Produk List (JSON lengkap)

      "Pending"

    ]);



    return jsonOk({ success: true, id: newId,

                    pesan: "Berhasil dikirim! ID Order kamu: " + newId });

  } catch(err) {

    return jsonOk({ success: false, pesan: "Gagal: " + err.message });

  }

}



// ----------------------------------------------------------------

// generateOrderId  --  ID acak unik ORD-XXXXXX

// ----------------------------------------------------------------

function generateOrderId(sheet) {

  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  var existingIds = [];



  if (sheet.getLastRow() > 1) {

    var idColumn = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();

    existingIds = idColumn.map(function(row) { return String(row[0]); });

  }



  for (var attempt = 0; attempt < 100; attempt++) {

    var code = "";

    for (var i = 0; i < 6; i++) {

      code += chars.charAt(Math.floor(Math.random() * chars.length));

    }

    var newId = "ORD-" + code;

    if (existingIds.indexOf(newId) === -1) return newId;

  }



  return "ORD-" + Date.now().toString(36).toUpperCase().slice(-6);

}



// ----------------------------------------------------------------

// getInit  --  gabungan getToko + getProduk (1 request, tanpa cache)

// ----------------------------------------------------------------

function getInit() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();



  // Ambil data toko

  var tokoSheet = ss.getSheetByName(SHEET_TOKO);

  var toko = [];

  if (tokoSheet) {

    var tokoRows = tokoSheet.getDataRange().getValues();

    for (var i = 1; i < tokoRows.length; i++) {

      var r = tokoRows[i];

      if (!r[0] && !r[1]) continue;

      toko.push({ storeId: r[0], namaToko: r[1], branch: r[2] });

    }

  }



  // Ambil data produk

  var produkSheet = ss.getSheetByName(SHEET_PRODUK);

  var produk = [];

  if (produkSheet) {

    var produkRows = produkSheet.getDataRange().getValues();

    for (var j = 1; j < produkRows.length; j++) {

      var p    = produkRows[j];

      var sku  = String(p[1] || "").trim();

      var nama = String(p[2] || "").trim();

      if (!sku && !nama) continue;

      // A=Gambar(0), B=SKU(1), C=Nama(2), D=Type(3), E=BIN CODE(4), F=Harga(5), G=Qty(6)

      produk.push({ s: sku, n: nama, t: p[3] || "", b: String(p[4]||"").trim(), h: p[5] || 0, q: p[6] || 0 });

    }

  }



  return jsonOk({ toko: toko, produk: produk });

}



// ----------------------------------------------------------------

// loginAdmin

// Kolom A: Admin ID | B: Username | C: Password | D: Nama | E: Aktif

// ----------------------------------------------------------------

function loginAdmin(username, password) {

  if (!username || !password)

    return jsonOk({ success: false, pesan: "Username dan password wajib diisi." });



  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);

  if (!sheet) return jsonOk({ success: false, pesan: "Sheet Master_Admin belum ada." });



  var rows = sheet.getDataRange().getValues();

  var usernameLower = String(username).toLowerCase().trim();



  for (var i = 1; i < rows.length; i++) {

    var r       = rows[i];

    var dbUser  = String(r[1] || "").toLowerCase().trim();

    var dbPass  = String(r[2] || "").trim();

    var dbNama  = String(r[3] || "").trim();

    var dbAktif = r[4];



    if (dbUser === usernameLower) {

      if (dbAktif === false || String(dbAktif).toLowerCase() === "false")

        return jsonOk({ success: false, pesan: "Akun ini tidak aktif." });

      if (dbPass === String(password).trim())

        return jsonOk({ success: true, username: dbUser, nama: dbNama || username, pesan: "Login berhasil!" });

      else

        return jsonOk({ success: false, pesan: "Password salah!" });

    }

  }



  return jsonOk({ success: false, pesan: "Username tidak ditemukan." });

}



// ----------------------------------------------------------------

// getToko (fallback)

// ----------------------------------------------------------------

function getToko() {

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TOKO);

  if (!sheet) return jsonOk([]);

  var rows = sheet.getDataRange().getValues();

  var hasil = [];

  for (var i = 1; i < rows.length; i++) {

    var r = rows[i];

    if (!r[0] && !r[1]) continue;

    hasil.push({ storeId: r[0], namaToko: r[1], branch: r[2] });

  }

  return jsonOk(hasil);

}



// ----------------------------------------------------------------

// getProduk (fallback, tanpa cache)

// ----------------------------------------------------------------

function getProduk() {

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUK);

  if (!sheet) return jsonOk([]);

  var rows = sheet.getDataRange().getValues();

  var hasil = [];

  for (var i = 1; i < rows.length; i++) {

    var r = rows[i];

    var sku  = String(r[1] || "").trim();

    var nama = String(r[2] || "").trim();

    if (!sku && !nama) continue;

    hasil.push({ s: sku, n: nama, t: r[3] || "", b: String(r[4]||"").trim(), h: r[5] || 0, q: r[6] || 0 });

  }

  return jsonOk(hasil);

}



// ----------------------------------------------------------------

// getOrders

// ----------------------------------------------------------------

function getOrders() {

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);

  if (!sheet || sheet.getLastRow() < 2) return jsonOk([]);

  var rows = sheet.getDataRange().getValues();

  var headers = rows[0];

  var hasil = [];

  for (var i = 1; i < rows.length; i++) {

    var obj = {};

    for (var j = 0; j < headers.length; j++) obj[headers[j]] = rows[i][j];

    hasil.push(obj);

  }

  return jsonOk(hasil);

}



// ----------------------------------------------------------------

// updateStatus  --  dengan manajemen stok otomatis

// ----------------------------------------------------------------

function updateStatus(orderId, statusBaru) {

  var ss    = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(SHEET_ORDERS);

  if (!sheet) return jsonOk({ success: false });



  var rows    = sheet.getDataRange().getValues();

  var headers = rows[0];



  var statusCol  = -1, produkListCol = -1, jenisCol = -1;

  for (var k = 0; k < headers.length; k++) {

    if (headers[k] === "Status")       statusCol    = k;

    if (headers[k] === "Produk List")  produkListCol= k;

    if (headers[k] === "Jenis")        jenisCol     = k;

  }

  if (statusCol === -1) return jsonOk({ success: false, pesan: "Kolom Status tidak ditemukan" });



  for (var i = 1; i < rows.length; i++) {

    if (String(rows[i][0]) === String(orderId)) {

      var statusLama = String(rows[i][statusCol] || "Pending");

      var jenis      = jenisCol >= 0 ? String(rows[i][jenisCol] || "") : "";



      sheet.getRange(i + 1, statusCol + 1).setValue(statusBaru);



      if (jenis !== "Retur" && produkListCol >= 0) {

        var produkListRaw = rows[i][produkListCol];

        var produkList = [];

        try { produkList = JSON.parse(produkListRaw || "[]"); } catch(e) {}



        var selesaiGroup = ["Selesai"];

        var batalGroup   = ["Cancel", "Ditolak"];

        var masukSelesai = selesaiGroup.indexOf(statusBaru) >= 0 && batalGroup.indexOf(statusLama) < 0 && statusLama !== "Selesai";

        var keluarSelesai= batalGroup.indexOf(statusBaru) >= 0 && selesaiGroup.indexOf(statusLama) >= 0;



        if (masukSelesai && produkList.length) {

          adjustStok(ss, produkList, -1);

        } else if (keluarSelesai && produkList.length) {

          adjustStok(ss, produkList, +1);

        }

      }



      return jsonOk({ success: true });

    }

  }

  return jsonOk({ success: false, pesan: "ID tidak ditemukan" });

}



// ----------------------------------------------------------------

// adjustStok  --  kurangi/tambah stok produk di Master_Produk

// ----------------------------------------------------------------

function adjustStok(ss, produkList, multiplier) {

  var produkSheet = ss.getSheetByName(SHEET_PRODUK);

  if (!produkSheet) return;



  var rows = produkSheet.getDataRange().getValues();



  var skuRowMap = {};

  for (var r = 1; r < rows.length; r++) {

    var sku = String(rows[r][1] || "").trim();

    if (sku) skuRowMap[sku] = r + 1;

  }



  produkList.forEach(function(p) {

    var sku = String(p.sku || "").trim();

    var qty = parseInt(p.qty) || 0;

    if (!sku || !qty) return;

    var rowNum = skuRowMap[sku];

    if (!rowNum) return;

    var stokCell = produkSheet.getRange(rowNum, 7); // kolom G

    var stokLama = parseInt(stokCell.getValue()) || 0;

    var stokBaru = Math.max(0, stokLama + (multiplier * qty));

    stokCell.setValue(stokBaru);

  });

}



// ----------------------------------------------------------------

// Helper

// ----------------------------------------------------------------

function jsonOk(data) {

  return ContentService

    .createTextOutput(JSON.stringify(data))

    .setMimeType(ContentService.MimeType.JSON);

}



