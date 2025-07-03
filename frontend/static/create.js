document.addEventListener('DOMContentLoaded', function() {
    // Populate dropdowns with real API data
    populateDropdowns();
    
    // Handle form submission
    const form = document.getElementById('create-issue-form');
    form.addEventListener('submit', handleFormSubmit);
});

async function populateDropdowns() {
    try {
        // Populate severity dropdown
        const severitySelect = document.getElementById('severity-select');
        const severities = ['Critical', 'High', 'Medium', 'Low'];
        severitySelect.innerHTML = '<option value="">Select Severity</option>';
        severities.forEach(severity => {
            const option = document.createElement('option');
            option.value = severity;
            option.textContent = severity;
            severitySelect.appendChild(option);
        });

        // Populate build dropdown from API
        await populateBuilds();

        // Populate target dropdown (will be populated when release is selected)
        const targetSelect = document.getElementById('target-select');
        targetSelect.innerHTML = '<option value="">Select Release First</option>';

    } catch (error) {
        console.error('Error populating dropdowns:', error);
    }
}

async function populateBuilds() {
    try {
        const response = await fetch('/api/builds');
        if (response.ok) {
            const builds = await response.json();
            const buildSelect = document.getElementById('build-select');
            buildSelect.innerHTML = '<option value="">Select Build</option>';
            builds.forEach(build => {
                const option = document.createElement('option');
                option.value = build;
                option.textContent = build;
                buildSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching builds:', error);
        // Fallback to hardcoded builds
        const builds = ['Weekly', 'Daily', 'Daily Plus'];
        const buildSelect = document.getElementById('build-select');
        buildSelect.innerHTML = '<option value="">Select Build</option>';
        builds.forEach(build => {
            const option = document.createElement('option');
            option.value = build;
            option.textContent = build;
            buildSelect.appendChild(option);
        });
    }
}

// Target options by release
const TARGETS_BY_RELEASE = {
  '261': ['26.10-d075_1_May_08'],
  '251': [
    '25.11-d065_1_Jun23',
    '25.11-d062_1_Jun_19',
    '25.11-d057_1_Jun_12',
    '25.11-d049_1Jun_05'
  ],
  '231': [
    '23.13-d014_1_Oct_23',
    '23.13-d012_1_Oct_15'
  ]
};

function populateTargetsForRelease(release) {
    const targetSelect = document.getElementById('target-select');
    targetSelect.innerHTML = '<option value="">Select Target</option>';
    if (release && TARGETS_BY_RELEASE[release]) {
        TARGETS_BY_RELEASE[release].forEach(target => {
            const option = document.createElement('option');
            option.value = target;
            option.textContent = target;
            targetSelect.appendChild(option);
        });
    }
}

// Platform code to display name mapping
const PLATFORM_MAP = {
    'lnx86': 'Linux',
    'LR': 'LR',
    'RHEL7.6': 'RHEL7.6',
    'CENTOS7.4': 'CENTOS7.4',
    'SLES12SP#': 'SLES12SP#',
    'LOP': 'LOP'
};
const RELEASES = ['251', '261', '231'];
const AREAS = ['etpv', 'etpv3', 'etpv5'];

function extractInfoFromPath(path) {
    // Regex: /lan/fed/<area>/release/<release>/<platform>/etautotest/
    const regex = /\/lan\/fed\/(etpv|etpv3|etpv5)\/release\/(251|261|231)\/([^/]+)\/etautotest\//;
    const match = path.match(regex);
    if (match) {
        const area = match[1];
        const release = match[2];
        const platformCode = match[3];
        const platform = PLATFORM_MAP[platformCode] || platformCode;
        return { area, release, platformCode, platform };
    }
    return null;
}

// Update info box and dropdowns when testcase path changes
function updateInfoFromPath() {
    const testcasePathInput = document.getElementById('testcase-path');
    const infoBox = document.getElementById('testcase-info-box');
    const platformSelect = document.getElementById('platform-select');
    const targetSelect = document.getElementById('target-select');
    const path = testcasePathInput.value;
    const info = extractInfoFromPath(path);
    if (info) {
        // Update info box
        infoBox.innerHTML = `<b>Information:</b> Release: ${info.release} &nbsp;&nbsp; Platform: ${info.platform} (${info.platformCode})`;
        infoBox.style.color = '#2563eb';
        infoBox.style.background = '#e8f0fe';
        // Always update targets for this release
        populateTargetsForRelease(info.release);
        // Auto-select platform dropdown if present
        if (platformSelect) {
            platformSelect.value = info.platformCode;
        }
    } else {
        infoBox.innerHTML = '<b>Information:</b> Could not extract release/platform from path.';
        infoBox.style.color = '#d32f2f';
        infoBox.style.background = '#fff0f0';
        if (platformSelect) platformSelect.value = '';
        if (targetSelect) targetSelect.innerHTML = '<option value="">Select Release First</option>';
    }
}

// Also update targets when release is changed manually
function onReleaseChange() {
    const releaseSelect = document.getElementById('release-select');
    if (releaseSelect) {
        populateTargetsForRelease(releaseSelect.value);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const testcasePathInput = document.getElementById('testcase-path');
    if (testcasePathInput) {
        testcasePathInput.addEventListener('input', updateInfoFromPath);
        testcasePathInput.addEventListener('blur', updateInfoFromPath);
    }
    const releaseSelect = document.getElementById('release-select');
    if (releaseSelect) {
        releaseSelect.addEventListener('change', onReleaseChange);
    }
});

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const messageDiv = document.getElementById('form-message');
    
    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        
        // Validate required fields
        const requiredFields = ['testcase_title', 'testcase_path', 'severity', 'description', 'reporter_name'];
        const missingFields = [];
        
        requiredFields.forEach(field => {
            const value = formData.get(field);
            if (!value || value.trim() === '') {
                missingFields.push(field.replace('_', ' '));
            }
        });
        
        if (missingFields.length > 0) {
            messageDiv.textContent = `Please fill in all required fields: ${missingFields.join(', ')}`;
            messageDiv.style.color = '#d32f2f';
            return;
        }
        
        // Send form data to backend
        const response = await fetch('/api/issues', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            messageDiv.textContent = 'Issue created successfully!';
            messageDiv.style.color = '#219653';
            
            // Redirect to the new issue detail page
            setTimeout(() => {
                window.location.href = `/issues/${result.id}`;
            }, 1500);
        } else {
            const error = await response.json();
            messageDiv.textContent = `Error: ${error.error || 'Failed to create issue'}`;
            messageDiv.style.color = '#d32f2f';
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        messageDiv.textContent = 'Error: Network error occurred';
        messageDiv.style.color = '#d32f2f';
    } finally {
        // Reset button state
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Issue';
        submitBtn.disabled = false;
    }
} 