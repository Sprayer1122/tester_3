// --- Detail Page Logic for Tester Talk ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('Detail page loaded');
    console.log('Current URL:', window.location.pathname);
    
    const issueId = getIssueIdFromUrl();
    console.log('Extracted issue ID:', issueId);
    
    if (issueId) {
        loadIssueDetail(issueId);
    } else {
        console.error('No issue ID found in URL');
        document.querySelector('.container').innerHTML = '<div>Issue not found</div>';
    }
});

function getIssueIdFromUrl() {
    console.log('Getting issue ID from URL:', window.location.pathname);
    const match = window.location.pathname.match(/\/issues\/(\d+)/);
    console.log('URL match result:', match);
    const issueId = match ? match[1] : null;
    console.log('Extracted issue ID:', issueId);
    return issueId;
}

async function loadIssueDetail(issueId) {
    try {
        console.log('Loading issue details for ID:', issueId);
        const response = await fetch(`/api/issues/${issueId}`);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const issue = await response.json();
        console.log('Issue data:', issue);
        updateIssueDisplay(issue);
        setupEventListeners(issueId);
        
    } catch (error) {
        console.error('Error loading issue:', error);
        document.querySelector('.container').innerHTML = '<div>Error loading issue details: ' + error.message + '</div>';
    }
}

function updateIssueDisplay(issue) {
    console.log('Updating issue display with:', issue);
    
    // Update issue title
    const titleElement = document.getElementById('issue-title');
    if (titleElement) {
        titleElement.textContent = issue.testcase_title;
        console.log('Updated title to:', issue.testcase_title);
    } else {
        console.error('Title element not found!');
    }
    
    // Update voting buttons
    const upvotesElement = document.getElementById('upvotes');
    const downvotesElement = document.getElementById('downvotes');
    if (upvotesElement) upvotesElement.textContent = issue.upvotes || 0;
    if (downvotesElement) downvotesElement.textContent = issue.downvotes || 0;
    
    // Update status
    const statusElement = document.getElementById('issue-status');
    if (statusElement) {
        statusElement.textContent = issue.status.toUpperCase();
        statusElement.className = `tag status-${issue.status}`;
    }
    
    // Update severity
    const severityElement = document.getElementById('issue-severity');
    if (severityElement) {
        severityElement.textContent = issue.severity;
        severityElement.className = `tag severity-${issue.severity}`;
    }
    
    // Update tags
    const tagsElement = document.getElementById('issue-tags');
    if (tagsElement) {
        tagsElement.innerHTML = issue.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
    }
    
    // Update CCR number if exists - show CCR number and hide Move to CCR button
    const ccrDisplay = document.getElementById('ccr-display');
    const ccrElement = document.getElementById('issue-ccr');
    const moveCcrBtn = document.getElementById('move-ccr-btn');
    
    if (issue.ccr_number && ccrElement) {
        // Show CCR number, hide Move to CCR button
        ccrElement.textContent = issue.ccr_number;
        if (ccrDisplay) ccrDisplay.style.display = 'inline';
        if (moveCcrBtn) moveCcrBtn.style.display = 'none';
    } else {
        // Hide CCR number, show Move to CCR button
        if (ccrDisplay) ccrDisplay.style.display = 'none';
        if (moveCcrBtn) moveCcrBtn.style.display = 'inline-block';
    }
    
    // Update test case details
    const testcaseIdsElement = document.getElementById('issue-testcase-ids');
    if (testcaseIdsElement) {
        testcaseIdsElement.textContent = issue.test_case_ids || '-';
    }
    
    const testcasePathElement = document.getElementById('issue-testcase-path');
    if (testcasePathElement) {
        testcasePathElement.textContent = issue.testcase_path || '-';
    }
    
    const releaseElement = document.getElementById('issue-release');
    if (releaseElement) {
        releaseElement.textContent = issue.release || '-';
    }
    
    const platformElement = document.getElementById('issue-platform');
    if (platformElement) {
        platformElement.textContent = issue.platform_display || issue.platform || '-';
    }
    
    const buildElement = document.getElementById('issue-build');
    if (buildElement) {
        buildElement.textContent = issue.build || '-';
    }
    
    const targetElement = document.getElementById('issue-target');
    if (targetElement) {
        targetElement.textContent = issue.target || '-';
    }
    
    // Update metadata
    const authorElement = document.getElementById('issue-author');
    if (authorElement) {
        authorElement.textContent = issue.reporter_name;
    }
    
    const createdElement = document.getElementById('issue-created');
    if (createdElement) {
        createdElement.textContent = new Date(issue.created_at).toLocaleString();
    }
    
    const updatedElement = document.getElementById('issue-updated');
    if (updatedElement) {
        updatedElement.textContent = new Date(issue.updated_at).toLocaleString();
    }
    
    const scoreElement = document.getElementById('issue-score');
    if (scoreElement) {
        scoreElement.textContent = issue.score || 0;
    }
    
    // Update resolved time tag if issue is resolved
    const resolvedLabel = document.getElementById('resolved-label');
    if (resolvedLabel) {
        if (issue.status === 'resolved' && issue.updated_at && issue.created_at) {
            const resolutionTime = getResolutionTime(issue.created_at, issue.updated_at);
            if (resolutionTime) {
                resolvedLabel.textContent = `Resolved in ${resolutionTime}`;
                resolvedLabel.style.display = 'inline';
            }
        } else {
            resolvedLabel.style.display = 'none';
        }
    }
    
    // Update description
    const descElement = document.getElementById('issue-desc');
    if (descElement) {
        descElement.textContent = issue.description;
    }
    
    // Update additional comments if exists
    const additionalCommentsSection = document.getElementById('additional-comments-section');
    const additionalCommentsElement = document.getElementById('issue-additional-comments');
    if (issue.additional_comments && additionalCommentsSection && additionalCommentsElement) {
        additionalCommentsElement.textContent = issue.additional_comments;
        additionalCommentsSection.style.display = 'block';
    }
    
    // Update attachments if exists
    const attachmentsSection = document.getElementById('attachments-section');
    const attachmentsElement = document.getElementById('issue-attachments');
    if (issue.attachments && issue.attachments.length > 0 && attachmentsSection && attachmentsElement) {
        attachmentsElement.innerHTML = issue.attachments.map(attachment => 
            `<div class="attachment-item">
                <a href="/uploads/${attachment.filename}" target="_blank" class="attachment-link">
                    📎 ${attachment.filename}
                </a>
                <span class="attachment-meta">(${formatFileSize(attachment.file_size)})</span>
            </div>`
        ).join('');
        attachmentsSection.style.display = 'block';
    }
    
    // Load comments
    loadComments(issue.id);
}

async function loadComments(issueId) {
    try {
        const response = await fetch(`/api/issues/${issueId}/comments`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const comments = await response.json();
        renderComments(comments);
        
    } catch (error) {
        console.error('Error loading comments:', error);
        document.getElementById('comments-list').innerHTML = '<div>Error loading comments</div>';
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    const commentsBadge = document.getElementById('comments-badge');
    
    if (!commentsList) return;
    
    // Update comment count
    if (commentsBadge) {
        commentsBadge.textContent = comments.length;
    }
    
    if (comments.length === 0) {
        commentsList.innerHTML = ''; // Let CSS handle empty state
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => renderCommentHTML(comment)).join('');
}

function renderCommentHTML(comment) {
    const isVerified = comment.is_verified_solution;
    const verificationButton = !isVerified ? 
        `<button class="verify-solution-btn" onclick="verifySolution(${comment.id})">Mark as Solution</button>` : 
        `<span class="verified-badge">Verified Solution</span>`;

    return `
        <div class="comment-card ${isVerified ? 'verified' : ''}">
            <div class="comment-header">
                <div class="comment-avatar">${comment.commenter_name.charAt(0).toUpperCase()}</div>
                <span class="comment-author">${comment.commenter_name}</span>
                <span class="comment-votes">Score: ${comment.upvotes - comment.downvotes}</span>
                <span class="comment-time">${timeAgo(comment.created_at)}</span>
                ${verificationButton}
            </div>
            <div class="comment-content">${comment.content}</div>
            <div class="comment-footer">
                <button onclick="upvoteComment(${comment.id})" ${comment.user_vote === 'upvote' ? 'class="upvoted"' : ''}>
                    👍 ${comment.upvotes}
                </button>
                <button onclick="downvoteComment(${comment.id})" ${comment.user_vote === 'downvote' ? 'class="downvoted"' : ''}>
                    👎 ${comment.downvotes}
                </button>
            </div>
        </div>
    `;
}

function setupEventListeners(issueId) {
    // Comment form submission
    const commentForm = document.getElementById('add-comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitComment(issueId);
        });
    }
    
    // Add voting buttons
    const upvoteBtn = document.getElementById('upvote-btn');
    const downvoteBtn = document.getElementById('downvote-btn');
    if (upvoteBtn) {
        upvoteBtn.addEventListener('click', () => voteIssue('upvote'));
    }
    if (downvoteBtn) {
        downvoteBtn.addEventListener('click', () => voteIssue('downvote'));
    }
    
    // Add move to CCR button
    const moveToCcrBtn = document.getElementById('move-ccr-btn');
    if (moveToCcrBtn) {
        moveToCcrBtn.addEventListener('click', () => moveToCcr(issueId));
    }
}

async function submitComment(issueId) {
    const commentForm = document.getElementById('add-comment-form');
    const authorInput = document.getElementById('comment-author');
    const contentInput = document.getElementById('comment-content');
    const messageDiv = document.getElementById('comment-form-message');
    const submitBtn = commentForm.querySelector('.comment-submit-btn');
    
    const author = authorInput.value.trim();
    const content = contentInput.value.trim();
    
    if (!author) {
        showCommentMessage('Please enter your name', 'error');
        authorInput.focus();
        return;
    }
    
    if (!content) {
        showCommentMessage('Please enter a comment', 'error');
        contentInput.focus();
        return;
    }
    
    // Disable submit button during submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    
    try {
        const response = await fetch(`/api/issues/${issueId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                commenter_name: author,
                content: content
            })
        });
        
        if (response.ok) {
            showCommentMessage('Comment posted successfully!', 'success');
            authorInput.value = '';
            contentInput.value = '';
            
            // Reload comments after short delay
            setTimeout(() => {
                loadComments(issueId);
                clearCommentMessage();
            }, 1000);
        } else {
            const error = await response.json();
            showCommentMessage(`Error: ${error.error || 'Failed to post comment'}`, 'error');
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        showCommentMessage('Error: Network error occurred', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
    }
}

function showCommentMessage(message, type) {
    const messageDiv = document.getElementById('comment-form-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `comment-message ${type}`;
    }
}

function clearCommentMessage() {
    const messageDiv = document.getElementById('comment-form-message');
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.className = 'comment-message';
    }
}

async function verifySolution(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Reload the page to show updated status
            window.location.reload();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to verify solution'}`);
        }
    } catch (error) {
        console.error('Error verifying solution:', error);
        alert('Error: Network error occurred');
    }
}

async function upvoteComment(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}/upvote`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Reload comments to show updated votes
            const issueId = getIssueIdFromUrl();
            loadComments(issueId);
        }
    } catch (error) {
        console.error('Error upvoting comment:', error);
    }
}

async function downvoteComment(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}/downvote`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Reload comments to show updated votes
            const issueId = getIssueIdFromUrl();
            loadComments(issueId);
        }
    } catch (error) {
        console.error('Error downvoting comment:', error);
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function voteIssue(voteType) {
    const issueId = getIssueIdFromUrl();
    if (!issueId) return;
    
    try {
        const endpoint = voteType === 'upvote' ? 'upvote' : 'downvote';
        const response = await fetch(`/api/issues/${issueId}/${endpoint}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Reload the page to show updated votes
            window.location.reload();
        } else {
            console.error('Failed to vote:', response.status);
        }
    } catch (error) {
        console.error('Error voting:', error);
    }
}

async function moveToCcr(issueId) {
    const ccrNumber = prompt('Enter CCR number:');
    if (!ccrNumber) return;
    
    try {
        const response = await fetch(`/api/issues/${issueId}/move-to-ccr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ccr_number: ccrNumber })
        });
        
        if (response.ok) {
            alert('Issue moved to CCR successfully!');
            window.location.reload();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to move to CCR'}`);
        }
    } catch (error) {
        console.error('Error moving to CCR:', error);
        alert('Error: Network error occurred');
    }
}

function getResolutionTime(createdAt, updatedAt) {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffInSeconds = Math.floor((updated - created) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''}`;
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
} 