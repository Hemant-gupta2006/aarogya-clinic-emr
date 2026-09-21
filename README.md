# 🏥 Aarogya Clinic EMR

<div align="center">

### **Next-Generation, Offline-First Electronic Medical Records (EMR) for Solo Practitioners & Outpatient Clinics**

[![React Native](https://img.shields.io/badge/React%20Native-0.86.2-blue.svg?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-57.0.15-000020.svg?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.45.2-C5F74F.svg?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![SQLite](https://img.shields.io/badge/Storage-SQLCipher%20Encrypted-003B57.svg?logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 📖 Overview

**Aarogya Clinic EMR** is an enterprise-grade, offline-first mobile and desktop-compatible Electronic Medical Records application designed specifically for independent physicians, polyclinics, and healthcare providers. 

In resource-constrained environments or high-volume outpatient clinics where internet reliability cannot be guaranteed, Aarogya Clinic ensures **zero operational downtime**. Patient records, clinical consultations, vital sign histories, encrypted photos, and prescription generation function 100% locally on-device with zero reliance on cloud infrastructure.

Data privacy and clinical confidentiality are safeguarded using **hardware-backed biometric security**, **SQLCipher database encryption**, and **tamper-evident cryptographic audit trails**.

---

## 🌟 Key Features

### 👤 1. Comprehensive Patient Demographics
- **Demographic Intake**: Track patient name, unique Patient ID (`PAT-XXXXXX`), phone number, date of birth / estimated age, gender, blood group, address, allergies, and emergency contact details.
- **Sandboxed Photo Archival**: Capture and store patient profile images and clinical pathology photos with SHA-256 content verification within sandboxed local storage.
- **Instant Search & Triage**: Fast indexing across names, phone numbers, and unique patient identifiers.

### 🩺 2. Longitudinal Clinical Consultations & Vitals
- **Structured Consultations**: Record chief complaints, symptoms, clinical diagnosis, prescribed treatment, charges/fees, and lab remarks.
- **Vitals Monitoring**: Dedicated fields for Blood Pressure (Systolic/Diastolic), Pulse, Body Temperature (°F/°C), Weight (kg), and Oxygen Saturation ($SpO_2$).
- **Historical Timeline**: View full chronological medical records and past visit summaries in one tap during consultation.

### 💊 3. Digital Prescriptions & In-App Doctor Signatures
- **Structured Rx Medication**: Add medicines with dosage (e.g., `500mg`), intake frequency (e.g., `1-0-1 After Food`), duration, and specific instructions.
- **Digital Touch Signature**: Doctors can sign prescriptions on-screen using the interactive `SignaturePadModal` canvas.
- **Offline Vector PDF Generator**: Generates clean, branded PDF prescriptions with clinic headers, doctor credentials, Rx tables, and signatures without requiring external web services or server APIs.
- **1-Tap Sharing**: Print or share prescriptions directly via WhatsApp, Email, or AirPrint/Nearby Share via `expo-sharing`.

### 📊 4. Practice Analytics & Multi-Sheet Excel Reports
- **Dynamic Time Filters**: Analyze clinic performance across Today, Yesterday, This Week, This Month, or Custom Date Ranges.
- **Financial & Intake Metrics**: Real-time tracking of gross consultation fees (INR ₹), total consultations, new patient registrations, and follow-ups.
- **Multi-Sheet XLSX Export**: Generate standardized Excel spreadsheets containing formatted sheets for **Patients**, **Visits**, **Prescriptions**, and **Revenue Summaries**.

### 🛡️ 5. Military-Grade Security & Privacy
- **100% On-Device Sovereignty**: Patient health data never leaves the doctor's physical device without explicit user action.
- **Biometric & PIN Authentication**: Unlock via Fingerprint / Face ID or a secure 4–6 digit PIN hashed with random salt and pepper via SHA-256, stored in hardware keystore (`Expo SecureStore`).
- **Configurable Auto-Lock**: Automatically locks the app when placed in the background after an inactivity timeout.
- **Tamper-Evident Audit Logging**: Every critical action (`PATIENT_CREATED`, `VISIT_CREATED`, `BACKUP_CREATED`, etc.) is logged in an append-only table using cryptographic SHA-256 previous-hash chaining (blockchain-style integrity).

### 📦 6. Encrypted Disaster Recovery & Backups
- **Portable `.clinicbackup` Format**: Exports complete relational database tables and base64-encoded clinical photos into an authenticated, encrypted bundle.
- **Cryptographic Specifications**: Key derivation using **PBKDF2-HMAC-SHA256 (100,000 iterations)**, authenticated encryption with **AES-256-CBC**, and **HMAC-SHA256** message authentication tags.
- **Integrity Validation**: Automated verification of manifest files and HMAC checks to reject corrupted or tampered backup files before restoration.

---

## 🏗️ Technical Architecture

```
APK/
├── app/                           # Expo Router 4 File-based Navigation
│   ├── (auth)/                    # PIN Setup & Biometric Lock Screens
│   │   ├── pin-setup.tsx
│   │   └── unlock.tsx
│   ├── (tabs)/                    # Main Navigation Tab Screens
│   │   ├── index.tsx              # Executive Dashboard (KPIs, Quick Actions, Recent Visits)
│   │   ├── patients.tsx           # Directory, Search, Filters
│   │   ├── reports.tsx            # Clinical & Financial Analytics, XLSX Export
│   │   └── settings.tsx           # Clinic Details, Security, Biometrics, Backup & Restore
│   ├── patients/                  # Patient Intake & Detailed Dossier
│   │   ├── [id]/index.tsx         # Patient Profile, Longitudinal History
│   │   ├── [id]/edit.tsx          # Edit Demographics
│   │   └── new.tsx                # Patient Registration
│   ├── visits/                    # Clinical Consultations & Prescription Composer
│   │   └── [id]/edit.tsx
│   └── backup/                    # Backup Creation & Restore Workflows
│       ├── create.tsx
│       └── restore.tsx
│
├── src/
│   ├── backup/                    # PBKDF2/AES-256 Packager, Crypto & Manifest Verifier
│   │   ├── crypto.ts
│   │   ├── manifest.ts
│   │   ├── packager.ts
│   │   ├── restore.ts
│   │   └── verifier.ts
│   ├── components/                # Modular UI Components
│   │   ├── common/                # SignaturePadModal, Form Inputs
│   │   └── visits/                # VitalsInputGroup, PrescriptionPreviewModal
│   ├── constants/                 # Design Tokens, Color Palette, Typography
│   ├── context/                   # AuthContext & Session Security State
│   ├── db/                        # Database Layer (Drizzle ORM + SQLite / SQLCipher)
│   │   ├── client.ts              # Database Connection & Migration Pipeline
│   │   ├── schema.ts              # Relational Schema Definition
│   │   └── repositories/          # Type-Safe Data Repositories (Patient, Visit, Audit, Meta)
│   ├── security/                  # Hardware Keystore, Salted PIN & Biometric APIs
│   └── services/                  # Business Logic (Pure Vector PDF, SheetJS XLSX, Photo Sandbox)
│
├── assets/                        # App Icons, Splash, Adaptive Foreground/Background
├── test/                          # Unit & Verification Test Suites (Crypto & Roundtrip)
├── app.json                       # Expo Application Manifest & Plugin Configuration
├── eas.json                       # EAS Cloud Build & Release Profiles
└── package.json                   # Dependencies & Scripts
```

---

## 🗄️ Database Schema & Data Models

Managed with **Drizzle ORM** over SQLite / SQLCipher:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| `patients` | Core patient demographics & medical history | `id`, `patient_number`, `name`, `phone`, `dob`, `gender`, `allergies`, `deleted_at` |
| `patient_photos` | Metadata for sandboxed patient & clinical images | `id`, `patient_id`, `file_path`, `photo_type`, `sha256` |
| `visits` | Longitudinal consultations & vital records | `id`, `patient_id`, `visit_date`, `vitals` (JSON), `diagnosis`, `charges` |
| `prescriptions` | Consultation prescription headers | `id`, `visit_id`, `instructions` |
| `prescription_items` | Structured medication dosages & timing | `id`, `prescription_id`, `medicine_name`, `dosage`, `frequency`, `duration` |
| `audit_logs` | Tamper-evident, hash-chained activity trail | `id`, `action`, `entity_type`, `previous_hash`, `hash` (SHA-256) |
| `app_settings` | Clinic metadata, branding, lock timeouts | `key`, `value`, `updated_at` |
| `app_metadata` | Installation identifiers & backup hashes | `key`, `value`, `updated_at` |

---

## 💻 Tech Stack

| Domain | Technology / Library |
| :--- | :--- |
| **Framework** | [React Native 0.86](https://reactnative.dev/) with [Expo SDK 57](https://expo.dev/) |
| **Language** | [TypeScript 6.0](https://www.typescriptlang.org/) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based, dynamic segments) |
| **ORM & Database** | [Drizzle ORM](https://orm.drizzle.team/) + [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) with SQLCipher |
| **Security & Auth** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/secure-store/), [`expo-local-authentication`](https://docs.expo.dev/versions/latest/sdk/local-authentication/) |
| **Cryptography** | [`expo-crypto`](https://docs.expo.dev/versions/latest/sdk/crypto/) & [`crypto-es`](https://github.com/entron-group/crypto-es) (AES-256, PBKDF2, HMAC) |
| **Document Generation**| Pure TypeScript Vector PDF Engine & [SheetJS (`xlsx`)](https://sheetjs.com/) |
| **Icons & UI** | [`lucide-react-native`](https://lucide.dev/), `react-native-safe-area-context` |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18.x or higher recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* [Expo Go](https://expo.dev/go) app on your mobile device (or an Android Emulator / iOS Simulator)
* [EAS CLI](https://docs.expo.dev/build/setup/) (`npm install -g eas-cli`) for standalone builds

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Hemant-gupta2006/aarogya-clinic-emr.git
   cd aarogya-clinic-emr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npx expo start
   ```

4. **Run on specific platforms:**
   ```bash
   # Android device / emulator
   npm run android

   # iOS simulator (macOS required)
   npm run ios

   # Web browser
   npm run web
   ```

---

## 📱 Building Standalone Binaries (EAS Build)

The project includes pre-configured profiles in [eas.json](eas.json) for building standalone installable packages:

### 1. Build Preview APK (Direct Install for Testing)
```bash
eas build --platform android --profile preview
```
* Generates a downloadable `.apk` file that can be side-loaded directly onto any Android device.

### 2. Build Production Package
```bash
eas build --platform android --profile production
```

---

## 🧪 Testing Cryptographic Integrity

Run the automated crypto test suite to verify PBKDF2 key derivation, AES-256-CBC encryption, authentication tag matching, wrong password rejection, and anti-tamper safeguards:

```bash
npx ts-node test/crypto-verify.ts
```

Expected Output:
```text
--- RUNNING AAROGYA CLINIC CRYPTO & BACKUP VERIFICATION TESTS ---
✓ Test 1: Encrypted package created with PBKDF2 (100k iterations) & AES-256
✓ Test 2: Decrypted payload perfectly matches original snapshot
✓ Test 3: Wrong password correctly rejected with AUTHENTICATION_FAILED
✓ Test 4: Tampered/corrupted archive rejected with zero database corruption
=============================================
ALL 4 CRYPTO & BACKUP TESTS PASSED WITH 100% SUCCESS!
```

---

## 🔒 Security & Privacy Statement

* **Local Sovereignty**: Aarogya Clinic EMR does not transmit health information or identifiers to third-party telemetric, analytical, or cloud databases.
* **Encrypted at Rest**: Application databases utilize SQLCipher encryption; cryptographic keys and credentials are stored exclusively in hardware-backed Secure Storage.
* **Integrity Auditing**: Any deletion or alteration is permanently recorded with immutable SHA-256 hash chains.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Aarogya Clinic EMR</b> • Empowering Doctors with Privacy, Speed, and Reliability.
</div>
