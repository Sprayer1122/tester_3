document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and admin status
    checkAdminAuth();
    
    // Load initial data
    loadUsers();
    loadIssuesForAdmin();
});

async function checkAdminAuth() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        
        const user = await response.json();
        if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/';
            return;
        }
        
        localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
        window.location.href = '/login.html';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        localStorage.removeItem('currentUser');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}

function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const users = await response.json();
            renderUsersTable(users);
        } else {
            console.error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
                <select onchange="updateUserRole(${user.id}, this.value)" ${user.role === 'admin' ? 'disabled' : ''}>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td>
                <select onchange="updateUserStatus(${user.id}, this.value)" ${user.role === 'admin' ? 'disabled' : ''}>
                    <option value="true" ${user.is_active ? 'selected' : ''}>Active</option>
                    <option value="false" ${!user.is_active ? 'selected' : ''}>Inactive</option>
                </select>
            </td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})" ${user.role === 'admin' ? 'disabled' : ''}>Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateUserRole(userId, role) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role })
        });
        
        if (response.ok) {
            loadUsers(); // Reload table
        } else {
            alert('Failed to update user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        alert('Error updating user role');
    }
}

async function updateUserStatus(userId, isActive) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_active: isActive === 'true' })
        });
        
        if (response.ok) {
            loadUsers(); // Reload table
        } else {
            alert('Failed to update user status');
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        alert('Error updating user status');
    }
}

async function loadIssuesForAdmin() {
    const status = document.getElementById('admin-status-filter').value;
    const severity = document.getElementById('admin-severity-filter').value;
    
    try {
        let url = '/api/issues?per_page=50';
        if (status) url += `&status=${status}`;
        if (severity) url += `&severity=${severity}`;
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            renderIssuesTable(data.issues);
        } else {
            console.error('Failed to load issues');
        }
    } catch (error) {
        console.error('Error loading issues:', error);
    }
}

function renderIssuesTable(issues) {
    const tbody = document.getElementById('issues-tbody');
    tbody.innerHTML = '';
    
    issues.forEach(issue => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${issue.id}</td>
            <td>${issue.testcase_title.substring(0, 50)}${issue.testcase_title.length > 50 ? '...' : ''}</td>
            <td>
                <select onchange="updateIssueStatus(${issue.id}, this.value)">
                    <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
                    <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    <option value="closed" ${issue.status === 'closed' ? 'selected' : ''}>Closed</option>
                    <option value="ccr" ${issue.status === 'ccr' ? 'selected' : ''}>CCR</option>
                </select>
            </td>
            <td>${issue.severity}</td>
            <td>${issue.reporter_name}</td>
            <td>${new Date(issue.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editIssue(${issue.id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteIssue(${issue.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateIssueStatus(issueId, status) {
    try {
        const response = await fetch(`/api/issues/${issueId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadIssuesForAdmin(); // Reload table
        } else {
            alert('Failed to update issue status');
        }
    } catch (error) {
        console.error('Error updating issue status:', error);
        alert('Error updating issue status');
    }
}

async function deleteIssue(issueId) {
    if (!confirm('Are you sure you want to delete this issue?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/issues/${issueId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadIssuesForAdmin(); // Reload table
        } else {
            alert('Failed to delete issue');
        }
    } catch (error) {
        console.error('Error deleting issue:', error);
        alert('Error deleting issue');
    }
}

async function bulkDeleteIssues() {
    const status = document.getElementById('bulk-status-filter').value;
    const severity = document.getElementById('bulk-severity-filter').value;
    
    if (!confirm('Are you sure you want to delete all issues matching the selected filters?')) {
        return;
    }
    
    try {
        // Get issue IDs that match the filters
        let url = '/api/admin/issues/ids';
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (severity) params.append('severity', severity);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.issue_ids.length === 0) {
                alert('No issues found matching the selected filters');
                return;
            }
            
            // Delete the issues
            const deleteResponse = await fetch('/api/admin/issues/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ issue_ids: data.issue_ids })
            });
            
            if (deleteResponse.ok) {
                const result = await deleteResponse.json();
                alert(`Successfully deleted ${result.deleted_count} issues`);
                loadIssuesForAdmin(); // Reload table
            } else {
                alert('Failed to delete issues');
            }
        } else {
            alert('Failed to get issue IDs');
        }
    } catch (error) {
        console.error('Error in bulk delete:', error);
        alert('Error performing bulk delete');
    }
}

function editIssue(issueId) {
    // Redirect to issue detail page for editing
    window.location.href = `/issues/${issueId}`;
} 