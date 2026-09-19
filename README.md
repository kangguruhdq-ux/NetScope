# NetScope
### Real-Time Network Operations Center & Diagnostics Platform

[![Python](https://img.shields.io/badge/Python-3.9%20%7C%203.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-Obsidian_NOC-06B6D4.svg)](https://tailwindcss.com)

**NetScope** adalah platform monitoring jaringan terpusat kelas enterprise untuk router, switch, access point, server, printer, dan PC di lingkungan sekolah, kampus, dan instansi. NetScope dibangun dengan arsitektur asynchronous berkemampuan tinggi, safeguards anti-bug tingkat lanjut, dan visual interface Dark Obsidian NOC bertaraf profesional.

---

## 1. TAMPILAN & FITUR UTAMA

- **Dark Obsidian NOC Dashboard**:
  - Top status cards: Total Devices, UP, DEGRADED, DOWN, MAINTENANCE, dan Uptime SLA (%).
  - Live Average Latency Waveform Chart (Dual-curve glowing telemetry).
  - Real-time Interface Throughput Area Chart (Inbound RX & Outbound TX bandwidth dalam Kbps/Mbps).
  - Global Packet Loss Sparkline Chart.
  - Dynamic Node Uptime Visualizer (Heartbeat rack bar per perangkat).
  - Recent Critical Incident Ticker.
  - Quick-Status Grid dengan warna status real-time.
- **Device Management (`/devices` & `/devices/:id`)**:
  - Inventarisasi perangkat lengkap dengan filter tipe dan status.
  - Tombol **"Test Connectivity"** langsung pada modal input sebelum menyimpan data.
  - Tombol **"Live Diagnostic Ping Now"** untuk uji responsivitas instan.
  - Grafik riwayat metrik (1 Jam, 6 Jam, 24 Jam, 7 Hari) untuk Latency, Loss, CPU, dan Memory.
  - Tabel Interface dengan perhitungan throughput counter delta nyata:  
    $$\text{throughput\_bps} = \frac{(\text{curr\_octets} - \text{prev\_octets}) \times 8}{\text{delta\_seconds}}$$
  - Timeline riwayat outage dan transisi status perangkat.
- **Interactive Cyber Grid Topology (`/topology`)**:
  - Kanvas diagram topologi interaktif dengan link bercahaya dan paket data teranimasi.
  - Drag-and-drop penataan posisi perangkat di kanvas.
  - Tool penarik garis koneksi antar node (Ethernet, Fiber, Wireless).
  - Tombol **"Save Layout"** untuk menyimpan koordinat ke database.
- **Network Subnet Discovery (`/discovery`)**:
  - Pemindaian subnet aman (misal: `192.168.1.0/24`) dengan konkurensi terkontrol (`Semaphore(16)`) dan timeout 1.5 detik per IP.
  - Deteksi open port (SSH, DNS, HTTP, HTTPS, SNMP, Mikrotik Winbox 8291).
  - Tombol 1-klik: **"Add to Monitoring"**.
- **Troubleshooting Diagnostics Center (`/troubleshooting`)**:
  - Eksekusi diagnosa 4 lapis berurutan:
    1. ICMP Ping Reachability (Loss & RTT).
    2. DNS Reverse Lookup (Verifikasi PTR record).
    3. TCP Port Check (Port 80, 443, 22, 161, 8291).
    4. SNMP Query Responsiveness (Validasi Community & MIB OID).
  - Output checklist interaktif dan analisis akar masalah (*Root Cause Analysis*) disertai rekomendasi perbaikan teknis.
- **Alert Management Center (`/alerts`)**:
  - Pemrosesan threshold otomatis:
    - Down Threshold: 3 kali polling berturut-turut gagal baru berstatus DOWN (mencegah false-positive).
    - High Latency Threshold: > 100 ms.
    - High Packet Loss Threshold: > 5%.
    - High CPU / Memory Threshold: > 85%.
  - Aksi: Acknowledge (dengan input catatan operator), Resolve, dan Mute.
- **SLA & Audit Reports (`/reports`)**:
  - Laporan periodik (24 Jam, 7 Hari, 30 Hari).
  - Metrik: Availability SLA %, Total Insiden, MTTR (Mean Time to Repair), dan Top 5 Flapping Devices.
  - Tombol Export: Format PDF resmi (CSS Print Friendly), CSV raw data, dan JSON audit file.
- **User Profile & Security (`/profile`)**:
  - Dapat diakses oleh SEMUA role user (`ADMIN`, `OPERATOR`, `VIEWER`) tanpa redirect mental ke dashboard.
  - Pembaruan nama, email, dan ganti password dengan verifikasi password lama.

---

## 2. PANDUAN PENGHUBUNGAN HARDWARE NYATA

> [!IMPORTANT]
> **Pentingnya Jangkauan Jaringan Fisik (Network Reachability)**:
> Server yang menjalankan NetScope **HARUS** memiliki rute IP menuju perangkat yang dimonitor (berada dalam satu LAN fisik, subnet VLAN yang ter-routing, atau terhubung melalui tunnel VPN seperti WireGuard / OpenVPN / IPsec).
> Server yang diletakkan di Cloud VPS umum **tidak dapat** mem-ping atau meng-query IP private lokal (`192.168.x.x`, `10.x.x.x`) tanpa adanya koneksi VPN Site-to-Site menuju router gateway jaringan lokal Anda.

### A. Menghubungkan Router Mikrotik (RouterOS SNMP v2c)
Buka Terminal Winbox / SSH ke Router Mikrotik Anda dan jalankan:
```bash
/snmp set enabled=yes
/snmp community add name=netscope-sec addresses=192.168.1.0/24 read-access=yes
```
*Ganti `192.168.1.0/24` dengan IP subnet server NetScope Anda.*  
Di NetScope:
- Masukkan IP router Mikrotik (contoh: `192.168.1.1`).
- Pilih protokol: `ICMP`, `SNMP`, `TCP`.
- Community String: `netscope-sec`.
- Port TCP: `8291, 80, 22`.

### B. Menghubungkan Cisco Switch (Cisco IOS)
Masuk ke mode konfigurasi terminal Cisco IOS (`conf t`):
```bash
snmp-server community netscope-sec RO
snmp-server location "Main Server Room Rack A"
snmp-server contact "noc-admin@school.net"
```
Di NetScope:
- Masukkan IP switch Cisco (contoh: `192.168.1.2`).
- Pilih protokol: `ICMP`, `SNMP`.
- Community String: `netscope-sec`.

---

## 3. CARA MENJALANKAN

### Kredensial Default Development:
- **Username**: `admin`
- **Password**: `AdminPassword123!`

---

### Opsi 1: Menjalankan Secara Lokal (Development)

#### 1. Jalankan Backend:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API akan berjalan di: `http://localhost:8000` (Dokumentasi Swagger di `http://localhost:8000/docs`).

#### 2. Jalankan Frontend:
```bash
cd frontend
npm install
npm run dev
```
Buka browser di: `http://localhost:5173`.

---

### Opsi 2: Menjalankan dengan Docker Compose (Production Ready)

```bash
docker compose up -d --build
```
Akses platform di: `http://localhost`.

---

## 4. SAFEGUARDS TEKNIS ANTI-BUG

1. **ICMP Dual-Engine Ping**:
   - Engine pertama-tama mencoba raw socket ICMP.
   - Jika hak akses Administrator / root tidak tersedia (`PermissionError`), engine **otomatis** beralih ke Native Subprocess Execution (`ping -n 1 -w 2000` di Windows, `ping -c 1 -W 2` di Linux) dengan parser regex multubahasa.
   - Aplikasi dijamin tidak akan pernah crash akibat socket permissions.
2. **Non-Blocking Network I/O**:
   - Polling background dijalankan secara asinkron dengan pembatasan konkurensi `asyncio.Semaphore(32)` dan per-device timeout maksimal 2.5 detik. Satu perangkat mati tidak akan memperlambat pemantauan perangkat lainnya.
3. **WebSocket Browser Authentication**:
   - Menghindari keterbatasan browser Web API dengan mendukung query token:  
     `/api/v1/ws/telemetry?token=<jwt_token>`.
4. **Pemisahan Rute Profile vs Platform Settings**:
   - `/profile`: Dapat diakses oleh semua role (`ADMIN`, `OPERATOR`, `VIEWER`) tanpa redirect mental.
   - `/settings`: Khusus role `ADMIN`.
5. **Isolasi Mode Development vs Production**:
   - Dikonfigurasi melalui `DEMO_MODE=true/false` di file `.env`.
   - `DEMO_MODE=true`: Mengaktifkan simulator telemetri dinamis dan menampilkan badge `[DEMO SIMULATOR]`.
   - `DEMO_MODE=false`: Metrik langsung diambil dari perangkat fisik nyata.
