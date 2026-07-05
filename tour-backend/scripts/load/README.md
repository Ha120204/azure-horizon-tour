# Booking load test

Script nay dung k6 de gia lap nhieu khach cung goi `POST /booking`.

Mac dinh script:

- login bang customer seed `minh.nguyen.traveler@gmail.com` / `Seed@Review2026`
- gui booking voi `paymentMethod: "IN_STORE"` de khong goi PayOS
- chap nhan HTTP `200/201` la tao booking, `409` la het slot/hop le
- fail neu co status khac nhu `400`, `401`, `500`, timeout

## Chuan bi

0. Cai k6 neu may chua co.

Neu may co winget:

```powershell
winget install k6 --source winget
k6 version
```

Neu PowerShell bao `winget` khong ton tai, tai installer chinh thuc tai:

https://dl.k6.io/msi/k6-latest-amd64.msi

Tai xong thi mo file `.msi` de cai, dong/mo lai terminal, roi kiem tra:

```powershell
k6 version
```

Neu may co Docker, co the chay khong can cai k6 truc tiep:

```powershell
docker run --rm -i `
  -v "${PWD}:/app" `
  -e BASE_URL="http://host.docker.internal:3000" `
  -e TOUR_ID="1" `
  -e PACKAGE_ID="1" `
  -e DEPARTURE_ID="1" `
  -e VUS="100" `
  -e ITERATIONS="100" `
  grafana/k6 run /app/scripts/load/booking.k6.js
```

1. Chay backend local/staging, vi du:

```powershell
cd tour-backend
npm run start:dev
```

2. Chon mot tour/package/departure de test.

Lay `TOUR_ID` tu URL tour hoac API `GET /tour`. Lay `PACKAGE_ID` va `DEPARTURE_ID` tu chi tiet tour `GET /tour/:id`.

Lay ID nhanh bang PowerShell:

```powershell
$base="http://localhost:3000"
$tours=(Invoke-RestMethod "$base/tour?limit=10").data
$tours | Select-Object id,name,availableSeats,status | Format-Table
```

Sau khi chon duoc `TOUR_ID`, xem package va departure:

```powershell
$tour=(Invoke-RestMethod "$base/tour/1").data
$tour.packages | Select-Object id,name,price,isActive | Format-Table
$tour.departures | Select-Object id,departureDate,availableSeats,isActive | Format-Table
```

Thay `1` bang id tour ban muon test. Copy:

- `tour.id` thanh `TOUR_ID`
- `packages[0].id` hoac package ban chon thanh `PACKAGE_ID`
- `departures[0].id` hoac ngay khoi hanh ban chon thanh `DEPARTURE_ID`

3. Dam bao slot test dung voi muc tieu:

- Muon test 100 booking deu thanh cong: departure/tour can con it nhat 100 ghe.
- Muon test chong overbooking: dat departure/tour con it ghe hon so request, vi du 1 ghe hoac 10 ghe.

## Chay test

Vi du 100 request nhanh:

```powershell
$env:BASE_URL="http://localhost:3000"
$env:TOUR_ID="1"
$env:PACKAGE_ID="1"
$env:DEPARTURE_ID="1"
$env:VUS="100"
$env:ITERATIONS="100"
k6 run scripts/load/booking.k6.js
```

Vi du gan dung bai toan "100 nguoi cung bam dat cho":

```powershell
$env:BASE_URL="http://localhost:3000"
$env:TOUR_ID="1"
$env:PACKAGE_ID="1"
$env:DEPARTURE_ID="1"
$env:MODE="burst"
$env:VUS="100"
$env:ITERATIONS_PER_VU="1"
k6 run scripts/load/booking.k6.js
```

Neu dung tai khoan khac:

```powershell
$env:LOGIN_EMAIL="customer@example.com"
$env:LOGIN_PASSWORD="your-password"
k6 run scripts/load/booking.k6.js
```

Neu da co cookie login san:

```powershell
$env:AUTH_COOKIE="accessToken=...; refreshToken=..."
k6 run scripts/load/booking.k6.js
```

## Doc ket qua

- `booking_created`: so request tao booking thanh cong.
- `booking_conflict`: so request bi tu choi vi het slot, day la hop le khi nhieu nguoi tranh cung slot.
- `booking_failed`: phai bang `0`.
- `http_req_failed`: phai bang `0` vi script da xem `409` la expected status.
- `booking_duration_ms p(95)`: 95% request booking nhanh hon moc nay.

Ket qua tot:

- Slot con 100 ghe, ban 100 request: ky vong gan `100` created, `0` failed.
- Slot con 1 ghe, ban 100 request: ky vong `1` created, `99` conflict, `0` failed.
- Khong duoc co `500`, timeout, hoac created vuot qua so ghe con lai.

## Kiem tra hieu nang

Tach 2 loai test:

1. Test dung logic chong overbooking:

- Dung slot it ghe, vi du 1, 5, 35 ghe.
- Ky vong `booking_created` bang so ghe con lai, phan con lai la `booking_conflict`.
- Muc tieu: chung minh khong dat qua so ghe.

2. Test toc do tao booking that:

- Dung slot/departure test con nhieu ghe hon tong request.
- Vi du muon test 300 request thanh cong thi departure can con it nhat 300 ghe.
- Muc tieu: do latency khi backend phai tao booking that, ghi DB, tao payment transaction, notification.

Chay theo tung bac tai:

```powershell
$env:BASE_URL="http://localhost:3000"
$env:TOUR_ID="1"
$env:PACKAGE_ID="1"
$env:DEPARTURE_ID="1"
$env:MODE="burst"
$env:ITERATIONS_PER_VU="1"
```

Lan 1:

```powershell
$env:VUS="100"
k6 run scripts/load/booking.k6.js
```

Lan 2:

```powershell
$env:VUS="300"
k6 run scripts/load/booking.k6.js
```

Lan 3:

```powershell
$env:VUS="500"
k6 run scripts/load/booking.k6.js
```

Danh gia nhanh:

- Tot: `booking_failed=0`, `http_req_failed=0%`, `p95 < 1000ms`.
- Can soi them: `p95` tu 1-2 giay hoac co vai request rat cham.
- Can toi uu/sua loi: co `500`, timeout, DB connection error, hoac `booking_failed > 0`.

Sau moi lan test, kiem tra lai ghe:

```powershell
$base="http://localhost:3000"
$tour=(Invoke-RestMethod "$base/tour/1").data
$tour.departures | Where-Object { $_.id -eq 1 } | Select-Object id,departureDate,availableSeats
```
