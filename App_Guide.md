# EmployeeNest Kiosk — App Guide

A simple, end-to-end walkthrough of every screen and feature, written for anyone to understand.

---

## What Is This App?

EmployeeNest Kiosk is an **attendance tablet app** placed at an office entrance. Employees walk up to it, and their attendance is logged — either automatically via **facial recognition** or manually by searching their name. An admin (HR / manager) can switch the app into a management mode to add employees, review logs, and configure the system.

The app has **two modes** you can switch between at any time using a toggle at the top of the screen:

| Mode | Who Uses It | Purpose |
|------|-------------|---------|
| **Kiosk** | All employees | Day-to-day check-in / check-out |
| **Admin** | HR / Managers | Manage employees, view logs, configure settings |

---

## Kiosk Mode (Employee-Facing Screens)

### Screen 1: Kiosk Home

This is the **main idle screen** the tablet stays on all day.

**What you see:**
- App name ("Attendance Kiosk") and office name ("HQ Entrance") at the top.
- A **live camera feed** in the center, actively scanning for faces.
- A **recognition status** indicator showing how many faces the camera sees and what action it's taking (e.g., "Matched", "Reviewing", "No faces detected").
- A **Kiosk / Employees** toggle to switch into Admin mode.
- A **Device ID** badge showing which device this is (e.g., `tablet-frontdesk-01`).
- **Quick-action buttons:**
    - `Manual fallback` — go to the manual check-in screen.
    - `Sync now` — force-sync data with the backend server.
    - `Settings` — open system settings.
    - `Edit employees` — shortcut to switch into Admin mode.
- Three **metric cards** at the bottom:
    - Cached employees (how many employee profiles are stored locally).
    - Pending queue (attendance records waiting to upload).
    - Last sync (when data was last synced with the server).

**What happens automatically:**
When the camera detects a face, the app compares it against all enrolled employee face data. If it finds a confident match, it:
1. Shows a **match card** with the employee's photo, name, ID, team, and confidence score.
2. Automatically logs a Check-In or Check-Out (whichever is next for that person).

**If the confidence is too low**, the match is flagged for review or the employee is asked to use the manual fallback.

---

### Screen 2: Manual Attendance

This is the **backup screen** when facial recognition isn't reliable.

**What you see:**
- A **search bar** to find the employee by name, employee ID, or team.
- A **CHECKIN / CHECKOUT toggle** — the employee (or an admin) selects which action to log.
- A **camera preview** — still active for capturing a proof photo.
- A **filtered employee list** (up to 8 results) — tap on the correct person to select them.
- **Action buttons:**
    - `Capture proof photo` — takes a photo from the camera as evidence.
    - `Save attendance` — submits the record (queues it for sync).
    - `Cancel` — goes back to the Kiosk Home screen.

**The flow:**
1. Type the employee's name or ID in the search bar.
2. Tap the correct employee from the list.
3. Select CHECKIN or CHECKOUT.
4. Capture a proof photo (optional but recommended).
5. Tap "Save attendance".

---

## Admin Mode (Management Screens)

### Screen 3: Admin Dashboard

This is the **management home screen** — the central hub for everything.

**What you see:**
- An "Admin Panel" eyebrow label and "Dashboard overview" title.
- A **Kiosk / Employees** mode toggle.
- A **Device ID** badge.
- Three **metric cards** (same as Kiosk Home): Employees, Pending uploads, Last sync.
- Four **navigation cards** under "Management":
    - **Employee Directory** — View and search all enrolled employees.
    - **Add Employee** — Onboard a new employee with face capture.
    - **Activity Logs** — View recent history and pending sync queue.
    - **System Settings** — Configure API URL and backend connection.
- A **Quick Actions** panel:
    - `Sync now` — force-sync with the server.
    - `Launch kiosk mode` — switch back to Kiosk mode immediately.

---

### Screen 4: Employee Directory

**What you see:**
- A **searchable list** of all employees.
- Each employee card shows:
    - Profile photo (or initials if no photo).
    - Name, Employee ID, and Team.
    - **Recognition status**: either "● Recognition ready" (green) or "○ Needs enrollment" (orange) — indicating if the employee has face data captured.
- A floating **"+ Add Employee"** button at the bottom-right corner.

**What you can do:**
- Search/filter by name, ID, or team.
- Tap an employee to go to their **Employee Editor** (view/edit profile).
- Tap "+ Add Employee" to onboard a brand-new person.

---

### Screen 5: Employee Editor

This screen has **two sub-modes**: creating a new employee, or viewing/editing an existing one.

#### When Creating / Editing:
**What you see:**
- Title says **"New Onboarding"** (for create) or **"Edit Profile"** (for editing).
- A form with three text fields:
    - **Employee name**
    - **Employee ID**
    - **Team**
- A **Face Enrollment** section:
    - A live **camera feed** for capturing the employee's face.
    - A **preview area** showing the captured photo and whether face features have been extracted.
    - `Capture Photo` button — snaps a photo and extracts a face embedding (the data the app uses later to recognize that face).
    - `Save Changes` button — submits the employee to the backend.
    - `Cancel` button — discards and goes back.

#### When Viewing an Existing Employee:
**What you see:**
- A **profile hero card** with the employee's photo, name, Employee ID, team, and last updated time.
- An **"Edit Profile"** button.
- A **"Recent Attendance"** panel showing that specific employee's last synced clock-in/out history.

---

### Screen 6: Recent Activity (Activity Logs)

**What you see:**
- Two clearly separated sections:
    - **Synced History** — attendance records that have already been uploaded to the server. Each entry shows the employee name, type (CHECKIN/CHECKOUT), method (FACE/MANUAL), and timestamp.
    - **Pending Uploads** — attendance records captured offline, waiting to be synced next time the device connects to the backend.

---

### Screen 7: System Settings (Global Settings)

**What you see:**
- A **Backend Connection** panel (the `ApiSettingsPanel` component) with:
    - The currently active **API URL** shown at the top.
    - A **Runtime target selector** — pick your environment:
        - `Android emulator` (uses `10.0.2.2`)
        - `Android USB` (uses `127.0.0.1`)
        - `iOS simulator` (uses `localhost`)
        - `Physical device` (uses your computer's Wi-Fi IP)
        - `Custom` (enter any URL)
    - A **Draft API URL** text field to enter or edit the URL.
    - A **connection status** card — green for success, red for error.
    - Buttons: `Ping backend` (test the connection), `Save API URL` (apply the URL).
- An **About Device** info panel:
    - App Version: `1.0.0`
    - Platform: `Android/iOS Native`

---

## Behind the Scenes (How Data Flows)

Even though users don't see this directly, here's what the app does under the hood:

1. **Offline-first:** All attendance records are saved locally first, then synced to the server when a connection is available. This means the app works even without internet.
2. **Employee sync:** Employee profiles (and their face data) are pulled from the backend and cached on the device. The app periodically syncs to stay up-to-date.
3. **Pending queue:** If the backend is unreachable, attendance records sit in a "pending" queue and upload automatically later.
4. **Face embeddings:** When a photo is captured during enrollment, the app extracts a numerical "face embedding" — a set of numbers that uniquely represent that person's face. During recognition, the live camera's face embedding is compared against all stored embeddings to find a match.
5. **Confidence scoring:** Every match has a confidence score:
    - **≥ 0.75** → Auto-match (attendance logged automatically).
    - **0.60 – 0.74** → Review match (flagged, may need confirmation).
    - **< 0.60** → No match (use manual fallback).

---

## Quick Summary

| Screen | Mode | One-Liner |
|--------|------|-----------|
| Kiosk Home | Kiosk | Live camera auto-recognizes employees and logs attendance |
| Manual Attendance | Kiosk | Search + proof photo fallback for manual check-in |
| Admin Dashboard | Admin | Overview metrics + navigation hub for management |
| Employee Directory | Admin | Searchable list of all enrolled employees |
| Employee Editor | Admin | Add/edit employees with face enrollment camera |
| Recent Activity | Admin | View synced history and pending offline records |
| System Settings | Admin | Configure backend URL, test connection, view device info |
