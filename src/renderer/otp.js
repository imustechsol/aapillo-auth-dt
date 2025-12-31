const { ipcRenderer } = require('electron');

let userId = null;
let userConfig = null;
let resendTimeout = null;
let countdownInterval = null;
let attemptCount = 0;
const maxAttempts = 2;

ipcRenderer.on('init-otp', (event, data) => {
    userId = data.userId;
    userConfig = data.userConfig;
    
    document.querySelector('.user-display').textContent = `User ID: ${userId.substring(0, 20)}...`;
    
    requestOTP();
    setupOTPInput();
});

function setupOTPInput() {
    const otpInput = document.getElementById('otpInput');
    
    otpInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value;
        
        if (value.length === 6) {
            verifyOTP();
        }
    });
    
    otpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyOTP();
        }
    });

    otpInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        otpInput.value = pastedData.substring(0, 6);
        if (pastedData.length === 6) {
            verifyOTP();
        }
    });
}

async function requestOTP() {
    try {
        showStatus('Sending OTP to your registered mobile number...', 'info');
        setButtonsEnabled(false);
        
        const result = await ipcRenderer.invoke('request-otp', userId);
        
        if (result.success) {
            showStatus('OTP sent successfully! Please check your mobile.', 'success');
            startResendCountdown(60);
            attemptCount = 0;
        } else {
            showStatus('Failed to send OTP: ' + result.error, 'error');
            document.getElementById('resendBtn').disabled = false;
        }
    } catch (error) {
        showStatus('Error requesting OTP: ' + error.message, 'error');
        document.getElementById('resendBtn').disabled = false;
    } finally {
        document.getElementById('verifyBtn').disabled = false;
        document.getElementById('otpInput').disabled = false;
        document.getElementById('otpInput').focus();
    }
}

async function verifyOTP() {
    const otp = document.getElementById('otpInput').value.trim();
    
    if (!otp) {
        showStatus('Please enter OTP', 'error');
        return;
    }
    
    if (otp.length !== 6) {
        showStatus('OTP must be 6 digits', 'error');
        return;
    }
    
    if (attemptCount >= maxAttempts) {
        showStatus('Maximum attempts exceeded. Please request a new OTP.', 'error');
        document.getElementById('otpInput').value = '';
        return;
    }
    
    try {
        showStatus('Verifying OTP...', 'info');
        setButtonsEnabled(false);
        
        attemptCount++;
        
        const result = await ipcRenderer.invoke('verify-otp', userId, otp);
        
        if (result.success) {
            showStatus('✓ OTP verified successfully! Access granted.', 'success');
            
            setTimeout(() => {
                ipcRenderer.invoke('close-otp-window');
            }, 2000);
        } else {
            const remainingAttempts = maxAttempts - attemptCount;
            if (remainingAttempts > 0) {
                showStatus(`Invalid OTP. ${remainingAttempts} attempt(s) remaining.`, 'error');
            } else {
                showStatus('Maximum attempts exceeded. Please request a new OTP.', 'error');
            }
            document.getElementById('otpInput').value = '';
            document.getElementById('otpInput').focus();
        }
    } catch (error) {
        showStatus('Error verifying OTP: ' + error.message, 'error');
    } finally {
        if (attemptCount < maxAttempts) {
            setButtonsEnabled(true);
        }
    }
}

async function resendOTP() {
    attemptCount = 0;
    document.getElementById('otpInput').value = '';
    await requestOTP();
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('otpStatus');
    statusDiv.textContent = message;
    statusDiv.className = `otp-status ${type}`;
    statusDiv.style.display = 'block';
}

function setButtonsEnabled(enabled) {
    document.getElementById('verifyBtn').disabled = !enabled;
    document.getElementById('otpInput').disabled = !enabled;
}

function startResendCountdown(seconds) {
    const resendBtn = document.getElementById('resendBtn');
    const countdownDiv = document.getElementById('countdown');
    
    resendBtn.disabled = true;
    
    let remaining = seconds;
    
    countdownDiv.textContent = `Resend available in ${remaining}s`;
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        remaining--;
        countdownDiv.textContent = `Resend available in ${remaining}s`;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            resendBtn.disabled = false;
            countdownDiv.textContent = '';
        }
    }, 1000);
}

window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '';
    return '';
});

window.addEventListener('unload', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    if (resendTimeout) {
        clearTimeout(resendTimeout);
    }
});