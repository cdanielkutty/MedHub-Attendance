# MedHub Attendance Tracker

A web-based application for tracking lecture attendance in MedHub without requiring the codeReadr app.

## Purpose

This application provides a simple interface to:

1. Select or scan a lecture QR code
2. Scan attendee badges
3. Submit attendance data directly to MedHub

## How to Use

### Setup
1. Open the application on any device (desktop, tablet, or mobile)
2. Connect a USB barcode/QR scanner if using a desktop/laptop

### Recording Attendance
1. **Select Lecture Type**:
   - Click on the appropriate lecture button
   - OR scan the lecture QR code

2. **Scan Badges**:
   - After lecture setup, the system will switch to attendance mode
   - Scan student/resident ID badges
   - Each successful scan will be recorded with a visual confirmation
   - Duplicate scans are automatically prevented

3. **Session Timing**:
   - Each session lasts 20 minutes
   - The timer will display the remaining time
   - When time expires, you will need to restart the session

4. **Reset**:
   - Use the "RESET / NEW LECTURE" button to start a new lecture session
   - On mobile, you can also swipe left to reset

## Technical Information

This application uses a server-side proxy to communicate with MedHub's API using the same protocol and format as the codeReadr app. The interface is optimized for both desktop and mobile devices.

### Access Points
- Main application: [https://medhub-attendance.glitch.me/](https://medhub-attendance.glitch.me/)
- API proxy endpoint: [https://medhub-attendance.glitch.me/proxy-to-medhub](https://medhub-attendance.glitch.me/proxy-to-medhub)

### MedHub Integration
The system sends attendance data directly to MedHub using the following parameters:
- `deviceid`: Device identifier
- `sid`: Session ID
- `tid`: Transaction ID (lecture code or badge ID)
- `udid`: Unique device identifier
- `userid`: User identifier

## Support and Maintenance

For support or assistance with this application, please contact Cyril Danielkutty at cdanielkutty@northwell.edu or 631-871-4268.

Last Updated: 05/19/2025
