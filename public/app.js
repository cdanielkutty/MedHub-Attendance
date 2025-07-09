        document.addEventListener('DOMContentLoaded', function() {
            const CONFIG = {
                MEDHUB_PROXY_URL: 'https://medhub-attendance-b3f2bmfqefgzgmat.eastus2-01.azurewebsites.net/proxy-to-medhub',
                DEVICE_ID: "134",
                SID: "704",
                UDID: "301ad0e3bd",
                USER_ID: "codereadrTestUDID",
                LECTURE_TYPES: [
                    { name: "MKSAP", code: "MH-AUTO-curriculumID:13" },
                    { name: "Noon Conference", code: "MH-AUTO-curriculumID:5" },
                    { name: "Grand Rounds", code: "MH-AUTO-curriculumID:2" },
                    { name: "SIM LAB", code: "MH-AUTO-curriculumID:529" },
                    { name: "Academic Block", code: "MH-AUTO-curriculumID:392" },
                    { name: "Board Review", code: "MH-AUTO-curriculumID:7" },
                    { name: "Guidelines", code: "MH-AUTO-curriculumID:397" },
                    { name: "Journal Club", code: "MH-AUTO-curriculumID:3" },
                    { name: "Workshop", code: "MH-AUTO-curriculumID:9" },
                    { name: "Intern School", code: "MH-AUTO-curriculumID:12" }
                ],
                FOCUS_INTERVAL_MS: 500,
                FOCUS_RETRY_DELAY_MS: 100,
                MOBILE_FOCUS_RETRY_DELAY_MS: 100,
                BADGE_SCAN_REFOCUS_DELAY_MS: 10,
                SUCCESS_FLASH_DURATION_MS: 1000,
                QR_DISPLAY_LENGTH: 15 
            };

            const container = document.getElementById('mainContainer');
            const statusDisplay = document.getElementById('statusDisplay');
            const setupSection = document.getElementById('setupSection');
            const attendanceSection = document.getElementById('attendanceSection');
            const lectureInfo = document.getElementById('lectureInfo');
            const scanInput = document.getElementById('scanInput');
            const badgeScanInput = document.getElementById('badgeScanInput');
            const actionLog = document.getElementById('actionLog');
            const scanCount = document.getElementById('scanCount');
            const resetButton = document.getElementById('resetButton');
            const lectureButtons = document.getElementById('lectureButtons');
            
            let mode = 'setup'; 
            let scannedIds = new Set();
            let lectureCode = '';
            let lectureName = '';
            let inputFocusInterval = null;
            
            function logMessage(message, type = 'info') {
                const timestamp = new Date().toLocaleTimeString();
                let icon = '📝';
                let className = 'log-info'; 

                switch(type) {
                    case 'success': icon = '✅'; className = 'log-success'; break;
                    case 'error':   icon = '❌'; className = 'log-error';   break;
                    case 'info':    icon = 'ℹ️'; className = 'log-info';    break;
                    case 'warning': icon = '⚠️'; className = 'log-warning'; break;
                }
                
                const logEntry = document.createElement('div');
                logEntry.className = className; 
                logEntry.innerHTML = `${icon} ${timestamp}: ${message}`;
                return logEntry;
            }
            
            CONFIG.LECTURE_TYPES.forEach(lecture => {
                const button = document.createElement('button');
                button.className = 'lecture-btn';
                button.textContent = lecture.name;
                button.dataset.code = lecture.code;
                button.addEventListener('click', function() {
                    handleLectureSetup(this.dataset.code, lecture.name);
                });
                lectureButtons.appendChild(button);
            });
            
            function setupFocusManagement() {
                if (inputFocusInterval) {
                    clearInterval(inputFocusInterval);
                }
                inputFocusInterval = setInterval(() => {
                    if (document.activeElement.tagName !== 'INPUT' && 
                        document.activeElement.tagName !== 'TEXTAREA' && 
                        document.activeElement.tagName !== 'SELECT') {
                        if (mode === 'setup') {
                            scanInput.focus();
                        } else {
                            badgeScanInput.focus();
                        }
                    }
                }, CONFIG.FOCUS_INTERVAL_MS);
            }
            
            function handleMobileFocus() {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS) {
                    [scanInput, badgeScanInput].forEach(input => {
                        input.addEventListener('blur', function() {
                            setTimeout(() => {
                                if ((input === scanInput && mode === 'setup') ||
                                    (input === badgeScanInput && mode === 'attendance')) {
                                    this.setAttribute('readonly', 'readonly');
                                    setTimeout(() => {
                                        this.removeAttribute('readonly');
                                        this.focus();
                                    }, 0);
                                }
                            }, CONFIG.MOBILE_FOCUS_RETRY_DELAY_MS);
                        });
                    });
                }
            }
            
            function addSwipeSupport() {
                let touchStartX = 0;
                let touchEndX = 0;
                
                document.addEventListener('touchstart', e => {
                    touchStartX = e.changedTouches[0].screenX;
                }, { passive: true });
                
                document.addEventListener('touchend', e => {
                    touchEndX = e.changedTouches[0].screenX;
                    handleSwipe();
                }, { passive: true });
                
                function handleSwipe() {
                    if (touchEndX < touchStartX - 100 && mode === 'attendance') { 
                        if (confirm('Reset and return to lecture selection?')) {
                            resetToSetupMode();
                        }
                    }
                }
            }
            
            function extractErrorMessage(xmlResponse) {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlResponse, "application/xml");

                    const parserError = xmlDoc.getElementsByTagName("parsererror");
                    if (parserError.length) {
                        console.error("XML Parsing Error Details:", parserError[0].innerHTML);
                        const errorTextElement = parserError[0].querySelector('div') || parserError[0].childNodes[0];
                        const summary = errorTextElement ? errorTextElement.textContent.split('\n')[0] : "Unknown XML parsing error";
                        const snippet = xmlResponse.length > 100 ? xmlResponse.substring(0, 100) + "..." : xmlResponse;
                        return `MedHub: Failed to parse response as XML. Content preview: ${snippet}`;
                    }

                    let textNode = xmlDoc.querySelector("xml > message > text");
                    if (!textNode) {
                        textNode = xmlDoc.querySelector("message > text");
                    }
                    if (!textNode) {
                        textNode = xmlDoc.querySelector("response > text");
                    }

                    if (textNode && textNode.textContent && textNode.textContent.trim() !== "") {
                        return `MedHub: ${textNode.textContent.trim()}`;
                    }

                    let statusNode = xmlDoc.querySelector("xml > message > status");
                    if (!statusNode) {
                        statusNode = xmlDoc.querySelector("message > status");
                    }
                    if (!statusNode) {
                        statusNode = xmlDoc.querySelector("response > status");
                    }

                    if (statusNode && statusNode.textContent === "0") {
                        return "MedHub: Operation failed (status 0, no specific <text> error message provided by MedHub).";
                    }

                    console.warn("MedHub response did not contain a standard error message or <status>0</status> via expected paths. Raw response (first 250 chars):", xmlResponse.substring(0,250));
                    const snippet = xmlResponse.length > 250 ? xmlResponse.substring(0, 250) + "..." : xmlResponse;
                    return `MedHub: Response content (expected XML error format not found): ${snippet}`;

                } catch (e) {
                    console.error("Exception during XML parsing logic:", e);
                    const snippet = xmlResponse ? (xmlResponse.length > 100 ? xmlResponse.substring(0, 100) + "..." : xmlResponse) : "N/A";
                    return `Fatal error: Could not interpret MedHub's response. Input preview: ${snippet}`;
                }
            }

            scanInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const scannedValue = this.value.trim();
                    if (scannedValue) {
                        const matchingLecture = CONFIG.LECTURE_TYPES.find(lt => lt.code === scannedValue);
                        const displayName = matchingLecture ? matchingLecture.name : "QR: " + scannedValue.substring(0, CONFIG.QR_DISPLAY_LENGTH) + (scannedValue.length > CONFIG.QR_DISPLAY_LENGTH ? "..." : "");
                        handleLectureSetup(scannedValue, displayName);
                        this.value = '';
                    }
                }
            });
            
            badgeScanInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const scannedValue = this.value.trim();
                    if (scannedValue) {
                        handleAttendanceScan(scannedValue);
                        this.value = '';
                        setTimeout(() => this.focus(), CONFIG.BADGE_SCAN_REFOCUS_DELAY_MS);
                    }
                }
            });
            
            resetButton.addEventListener('click', function() {
                 if (confirm('Are you sure you want to reset and select a new lecture?')) {
                    resetToSetupMode();
                }
            });
            
            function handleLectureSetup(qrCode, displayName) {
                actionLog.prepend(logMessage(`<strong>📚 LECTURE SETUP: ${displayName}</strong>`, 'info'));
                lectureCode = qrCode;
                lectureName = displayName;
                
                sendToMedHub(qrCode)
                    .then(response => {
                        switchToAttendanceMode(displayName);
                        actionLog.prepend(logMessage("Lecture setup successful with MedHub.", 'success'));
                    })
                    .catch(error => {
                        actionLog.prepend(logMessage(`Lecture Setup Failed: ${error.message}`, 'error'));
                        scanInput.focus(); 
                    });
            }
            
            function handleAttendanceScan(badgeId) {
                if (scannedIds.has(badgeId)) {
                    actionLog.prepend(logMessage(`DUPLICATE: ID #${badgeId} already scanned.`, 'warning'));
                    return;
                }
                
                actionLog.prepend(logMessage(`Processing badge ID #${badgeId}...`, 'info'));
                
                sendToMedHub(badgeId)
                    .then(response => {
                        scannedIds.add(badgeId);
                        scanCount.textContent = "Total scans: " + scannedIds.size;
                        
                        container.classList.add('success-flash');
                        badgeScanInput.classList.add('success-beep');
                        
                        setTimeout(() => {
                            container.classList.remove('success-flash');
                            badgeScanInput.classList.remove('success-beep');
                        }, CONFIG.SUCCESS_FLASH_DURATION_MS);
                        
                        actionLog.prepend(logMessage(`ID #${badgeId} successfully recorded.`, 'success'));
                    })
                    .catch(error => {
                        actionLog.prepend(logMessage(`Badge Scan Error (ID #${badgeId}): ${error.message}`, 'error'));
                    });
            }
            
            async function sendToMedHub(scanData) {
                const url = CONFIG.MEDHUB_PROXY_URL;
                const formData = new URLSearchParams();
                formData.append('deviceid', CONFIG.DEVICE_ID);
                formData.append('sid', CONFIG.SID);
                formData.append('tid', scanData); 
                formData.append('udid', CONFIG.UDID);
                formData.append('userid', CONFIG.USER_ID);
                
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: formData.toString()
                    });

                    const responseText = await response.text();
                    console.log("MedHub Raw Response:", responseText);

                    if (responseText && responseText.trim().startsWith("<") && 
                        (responseText.includes('<status>0</status>') || responseText.includes('<status>0</status>')) ) { // Check for <status>0</status> within xml > message or just message
                        throw new Error(extractErrorMessage(responseText));
                    }

                    if (!response.ok) {
                        throw new Error(`Network error: ${response.status} ${response.statusText}. MedHub details: ${extractErrorMessage(responseText) || 'Raw response: ' + responseText.substring(0, 200)}`);
                    }
                    
                    return responseText;

                } catch (error) {
                    console.error('Error in sendToMedHub:', error.message);
                    throw new Error(error.message || "Failed to communicate with MedHub.");
                }
            }

            function switchToAttendanceMode(currentLectureName) {
                mode = 'attendance';
                container.classList.remove('setup-mode');
                container.classList.add('attendance-mode');
                statusDisplay.textContent = "RECORDING ATTENDANCE";
                setupSection.classList.add('hidden');
                attendanceSection.classList.remove('hidden');
                lectureInfo.textContent = "Lecture: " + currentLectureName;
                actionLog.prepend(logMessage("Ready to scan badges.", 'info'));
                badgeScanInput.value = '';
                setTimeout(() => badgeScanInput.focus(), CONFIG.FOCUS_RETRY_DELAY_MS);
            }
            
            function resetToSetupMode() {
                mode = 'setup';
                container.classList.remove('attendance-mode');
                container.classList.add('setup-mode');
                statusDisplay.textContent = "SELECT LECTURE TYPE";
                setupSection.classList.remove('hidden');
                attendanceSection.classList.add('hidden');
                scannedIds.clear();
                scanCount.textContent = "Total scans: 0";
                lectureCode = '';
                lectureName = '';
                actionLog.prepend(logMessage("System reset. Ready for new lecture setup.", 'info'));
                scanInput.value = '';
                setTimeout(() => scanInput.focus(), CONFIG.FOCUS_RETRY_DELAY_MS);
            }
            
            // Initialize
            setupFocusManagement();
            handleMobileFocus();
            addSwipeSupport();
            resetToSetupMode(); 
            
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                    setTimeout(() => {
                        if (mode === 'setup') {
                            scanInput.focus();
                        } else {
                            badgeScanInput.focus();
                        }
                    }, 300); 
                }
            });
        });
