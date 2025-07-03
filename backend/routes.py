from flask import request, jsonify, send_file, session
from app import app, db
from models import Issue, Comment, Tag, Attachment, User
import os
from werkzeug.utils import secure_filename
import markdown
from datetime import datetime
from functools import wraps

# Authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    print(f"Login attempt for username: {username}")
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password) and user.is_active:
        session['user_id'] = user.id
        user.last_login = datetime.now()
        db.session.commit()
        
        print(f"Login successful for user: {user.username}, session user_id: {session.get('user_id')}")
        print(f"Session data: {dict(session)}")
        
        return jsonify(user.to_dict())
    
    print(f"Login failed for username: {username}")
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    if not session.get('user_id'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({'error': 'User not found'}), 401
    
    return jsonify(user.to_dict())

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password required'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(username=username, email=email)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

# Admin routes
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = data['is_active']
    
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/admin/issues/<int:issue_id>', methods=['DELETE'])
@admin_required
def delete_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    db.session.delete(issue)
    db.session.commit()
    
    return jsonify({'message': 'Issue deleted successfully'})

@app.route('/api/admin/comments/<int:comment_id>', methods=['DELETE'])
@admin_required
def delete_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted successfully'})

@app.route('/api/admin/issues/<int:issue_id>/edit', methods=['PUT'])
@admin_required
def admin_edit_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.json
    
    if 'testcase_title' in data:
        issue.testcase_title = data['testcase_title']
    if 'description' in data:
        issue.description = data['description']
    if 'test_case_ids' in data:
        issue.test_case_ids = data['test_case_ids']
    if 'status' in data:
        issue.status = data['status']
    if 'reporter_name' in data:
        issue.reporter_name = data['reporter_name']
    
    # Update tags if provided
    if 'tags' in data:
        issue.tags.clear()
        for tag_name in data['tags']:
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.session.add(tag)
            issue.tags.append(tag)
    
    db.session.commit()
    
    return jsonify(issue.to_dict())

@app.route('/api/admin/issues/ids', methods=['GET'])
@admin_required
def get_all_issue_ids():
    """Get all issue IDs for bulk operations"""
    status = request.args.get('status')
    severity = request.args.get('severity')
    release = request.args.get('release')
    platform = request.args.get('platform')
    build = request.args.get('build')
    target = request.args.get('target')
    
    query = Issue.query
    
    if status:
        query = query.filter(Issue.status == status)
    if severity:
        query = query.filter(Issue.severity == severity)
    if release:
        query = query.filter(Issue.release == release)
    if platform:
        query = query.filter(Issue.platform == platform)
    if build:
        query = query.filter(Issue.build == build)
    if target:
        query = query.filter(Issue.target == target)
    
    # Get all issue IDs that match the filters
    issue_ids = [issue.id for issue in query.all()]
    
    return jsonify({
        'issue_ids': issue_ids,
        'total': len(issue_ids)
    })

@app.route('/api/admin/issues/bulk-delete', methods=['POST'])
@admin_required
def bulk_delete_issues():
    """Delete multiple issues at once"""
    data = request.json
    issue_ids = data.get('issue_ids', [])
    
    if not issue_ids:
        return jsonify({'error': 'No issue IDs provided'}), 400
    
    try:
        # Delete issues from database
        issues_to_delete = Issue.query.filter(Issue.id.in_(issue_ids)).all()
        for issue in issues_to_delete:
            db.session.delete(issue)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully deleted {len(issues_to_delete)} issues',
            'deleted_count': len(issues_to_delete)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete issues: {str(e)}'}), 500

# Helper function to save file
def save_file(file, folder='uploads'):
    if file and file.filename:
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(folder, filename)
        file.save(file_path)
        return filename, file_path
    return None, None

# Helper function to index issue in Elasticsearch
def index_issue(issue):
    doc = {
        'testcase_title': issue.testcase_title,
        'testcase_path': issue.testcase_path,
        'severity': issue.severity,
        'test_case_ids': issue.test_case_ids,
        'release': issue.release,
        'platform': issue.platform,
        'build': issue.build,
        'target': issue.target,
        'description': issue.description,
        'additional_comments': issue.additional_comments,
        'reporter_name': issue.reporter_name,
        'status': issue.status,
        'tags': [tag.name for tag in issue.tags],
        'created_at': issue.created_at.isoformat() if issue.created_at else None
    }
    es.index(index='issues', id=issue.id, body=doc)

# Issues endpoints
@app.route('/api/issues', methods=['GET'])
def get_issues():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    severity = request.args.get('severity')
    release = request.args.get('release')
    platform = request.args.get('platform')
    build = request.args.get('build')
    target = request.args.get('target')
    test_case_id = request.args.get('test_case_id')
    
    query = Issue.query
    
    if status:
        query = query.filter(Issue.status == status)
    if severity:
        query = query.filter(Issue.severity == severity)
    if release:
        query = query.filter(Issue.release == release)
    if platform:
        query = query.filter(Issue.platform == platform)
    if build:
        query = query.filter(Issue.build == build)
    if target:
        query = query.filter(Issue.target == target)
    if test_case_id:
        query = query.filter(Issue.test_case_ids == test_case_id)
    
    issues = query.order_by(Issue.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'issues': [issue.to_dict() for issue in issues.items],
        'total': issues.total,
        'pages': issues.pages,
        'current_page': page
    })

@app.route('/api/issues', methods=['POST'])
def create_issue():
    # Handle both JSON and FormData
    if request.content_type and 'multipart/form-data' in request.content_type:
        # FormData with files
        data = {}
        for key in request.form:
            data[key] = request.form[key]
        files = request.files.getlist('files') if request.files else []
    else:
        # JSON data
        data = request.json
        files = []

    # Validate required fields (removed test_case_ids from required fields)
    required_fields = [
        'testcase_title', 'testcase_path', 'severity', 
        'description', 'reporter_name'
    ]
    missing = [field for field in required_fields if not data or field not in data or not data[field]]
    if missing:
        return jsonify({'error': f'Missing required field(s): {", ".join(missing)}'}), 400

    # Generate unique test case ID
    unique_test_case_id = Issue.generate_unique_test_case_id()
    
    # Use only the auto-generated test case ID
    test_case_ids = unique_test_case_id

    # Parse testcase path to extract release and platform
    release, platform = Issue.parse_testcase_path(data['testcase_path'])

    # Create issue
    issue = Issue(
        testcase_title=data['testcase_title'],
        testcase_path=data['testcase_path'],
        severity=data['severity'],
        test_case_ids=test_case_ids,
        release=release,
        platform=platform,
        build=data.get('build'),
        target=data.get('target'),
        description=data['description'],
        additional_comments=data.get('additional_comments', ''),
        reporter_name=data['reporter_name'],
        status='open'
    )
    
    # Handle tags
    tags_input = data.get('tags', [])
    if isinstance(tags_input, str):
        tag_names = [tag.strip() for tag in tags_input.split(',') if tag.strip()]
    else:
        tag_names = tags_input
    
    for tag_name in tag_names:
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.session.add(tag)
        issue.tags.append(tag)
    
    db.session.add(issue)
    db.session.commit()
    
    # Handle file attachments (screenshots)
    for file in files:
        if file and file.filename:
            filename, file_path = save_file(file)
            if filename:
                attachment = Attachment(
                    issue_id=issue.id,
                    filename=filename,
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    mime_type=file.content_type,
                    uploaded_by=data['reporter_name']
                )
                db.session.add(attachment)
    
    db.session.commit()
    
    return jsonify(issue.to_dict()), 201

@app.route('/api/issues/<int:issue_id>', methods=['GET'])
def get_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    issue_dict = issue.to_dict()
    # Order comments by creation date descending (newest first)
    comments = Comment.query.filter_by(issue_id=issue_id).order_by(Comment.created_at.desc()).all()
    issue_dict['comments'] = [comment.to_dict() for comment in comments]
    issue_dict['attachments'] = [att.to_dict() for att in issue.attachments]
    return jsonify(issue_dict)

@app.route('/api/issues/<int:issue_id>', methods=['PUT'])
def update_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.json
    
    if 'testcase_title' in data:
        issue.testcase_title = data['testcase_title']
    if 'testcase_path' in data:
        issue.testcase_path = data['testcase_path']
        # Re-parse release and platform if testcase_path is updated
        release, platform = Issue.parse_testcase_path(data['testcase_path'])
        issue.release = release
        issue.platform = platform
    if 'severity' in data:
        issue.severity = data['severity']
    if 'test_case_ids' in data:
        issue.test_case_ids = data['test_case_ids']
    if 'build' in data:
        issue.build = data['build']
    if 'target' in data:
        issue.target = data['target']
    if 'description' in data:
        issue.description = data['description']
    if 'additional_comments' in data:
        issue.additional_comments = data['additional_comments']
    if 'reporter_name' in data:
        issue.reporter_name = data['reporter_name']
    if 'status' in data:
        issue.status = data['status']
    
    # Update tags if provided
    if 'tags' in data:
        issue.tags.clear()
        for tag_name in data['tags']:
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.session.add(tag)
            issue.tags.append(tag)
    
    db.session.commit()
    
    return jsonify(issue.to_dict())

@app.route('/api/issues/<int:issue_id>/move-to-ccr', methods=['POST'])
def move_to_ccr(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.json
    
    if not data or 'ccr_number' not in data or not data['ccr_number']:
        return jsonify({'error': 'CCR number is required'}), 400
    
    # Update issue status and CCR number
    issue.status = 'ccr'
    issue.ccr_number = data['ccr_number']
    
    db.session.commit()
    
    return jsonify(issue.to_dict())

# Comments endpoints
@app.route('/api/issues/<int:issue_id>/comments', methods=['GET'])
def get_comments(issue_id):
    comments = Comment.query.filter_by(issue_id=issue_id).order_by(Comment.created_at.desc()).all()
    return jsonify([comment.to_dict() for comment in comments])

@app.route('/api/issues/<int:issue_id>/comments', methods=['POST'])
def create_comment(issue_id):
    data = request.json
    files = request.files.getlist('files') if request.files else []
    
    comment = Comment(
        issue_id=issue_id,
        commenter_name=data['commenter_name'],
        content=data['content']
    )
    
    db.session.add(comment)
    db.session.commit()
    
    # Handle file attachments
    for file in files:
        if file and file.filename:
            filename, file_path = save_file(file)
            if filename:
                attachment = Attachment(
                    issue_id=issue_id,
                    comment_id=comment.id,
                    filename=filename,
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    mime_type=file.content_type,
                    uploaded_by=data['commenter_name']
                )
                db.session.add(attachment)
    
    db.session.commit()
    
    return jsonify(comment.to_dict()), 201

@app.route('/api/comments/<int:comment_id>/verify', methods=['POST'])
def verify_solution(comment_id):
    # Get the comment
    comment = Comment.query.get_or_404(comment_id)
    
    # Unverify all other comments for this issue
    Comment.query.filter_by(issue_id=comment.issue_id).update({'is_verified_solution': False})
    
    # Verify the selected comment
    comment.is_verified_solution = True
    
    # Update issue status to resolved
    issue = Issue.query.get_or_404(comment.issue_id)
    issue.status = 'resolved'
    
    db.session.commit()
    
    return jsonify(comment.to_dict())

# Voting endpoints
@app.route('/api/issues/<int:issue_id>/upvote', methods=['POST'])
def upvote_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    issue.upvotes += 1
    db.session.commit()
    return jsonify(issue.to_dict())

@app.route('/api/issues/<int:issue_id>/downvote', methods=['POST'])
def downvote_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    issue.downvotes += 1
    db.session.commit()
    return jsonify(issue.to_dict())

@app.route('/api/comments/<int:comment_id>/upvote', methods=['POST'])
def upvote_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    comment.upvotes += 1
    db.session.commit()
    return jsonify(comment.to_dict())

@app.route('/api/comments/<int:comment_id>/downvote', methods=['POST'])
def downvote_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    comment.downvotes += 1
    db.session.commit()
    return jsonify(comment.to_dict())

# Search endpoint
@app.route('/api/search', methods=['GET', 'POST'])
def search_issues():
    if request.method == 'POST':
        data = request.get_json() or {}
        query = data.get('search', '')
        status = data.get('status')
        severity = data.get('severity')
        release = data.get('release')
        platform = data.get('platform')
        build = data.get('build')
        target = data.get('target')
        test_case_id = data.get('test_case_id')
        reporter_name = data.get('reporter_name')
        tags = data.get('tags', [])
        size = data.get('size', 20)
        from_date = data.get('from_date')
        to_date = data.get('to_date')
    else:
        query = request.args.get('q', '')
        status = request.args.get('status')
        severity = request.args.get('severity')
        release = request.args.get('release')
        platform = request.args.get('platform')
        build = request.args.get('build')
        target = request.args.get('target')
        test_case_id = request.args.get('test_case_id')
        reporter_name = request.args.get('reporter_name')
        tags = request.args.get('tags', '').split(',') if request.args.get('tags') else []
        size = request.args.get('size', 20, type=int)
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')

    # Use only SQLAlchemy for all search and filters
    db_query = Issue.query

    # Full-text search (case-insensitive, partial match)
    if query:
        db_query = db_query.filter(
            db.or_(
                Issue.testcase_title.ilike(f'%{query}%'),
                Issue.description.ilike(f'%{query}%'),
                Issue.test_case_ids.ilike(f'%{query}%')
            )
        )
    if status:
        db_query = db_query.filter(Issue.status == status)
    if severity:
        db_query = db_query.filter(Issue.severity == severity)
    if release:
        db_query = db_query.filter(Issue.release == release)
    if platform:
        db_query = db_query.filter(Issue.platform == platform)
    if build:
        db_query = db_query.filter(Issue.build == build)
    if target:
        db_query = db_query.filter(Issue.target == target)
    if test_case_id:
        db_query = db_query.filter(Issue.test_case_ids == test_case_id)
    if reporter_name:
        db_query = db_query.filter(Issue.reporter_name == reporter_name)
    if tags:
        valid_tags = [tag.strip() for tag in tags if tag.strip()]
        if valid_tags:
            # This is a simplified tag search - in production you'd want a proper tag relationship
            pass
    # Date range filter (if needed)
    # if from_date or to_date:
    #     ...

    issues = db_query.order_by(Issue.created_at.desc()).limit(size).all()
    return jsonify({
        'issues': [issue.to_dict() for issue in issues],
        'total': len(issues)
    })

# Tags endpoint
@app.route('/api/tags', methods=['GET'])
def get_tags():
    tags = Tag.query.all()
    return jsonify([tag.to_dict() for tag in tags])

@app.route('/api/releases', methods=['GET'])
def get_releases():
    """Get all available releases from existing issues"""
    releases = db.session.query(Issue.release).filter(Issue.release.isnot(None)).distinct().all()
    return jsonify([release[0] for release in releases if release[0]])

@app.route('/api/platforms', methods=['GET'])
def get_platforms():
    platforms = db.session.query(Issue.platform).distinct().filter(Issue.platform.isnot(None)).all()
    platform_list = [platform[0] for platform in platforms]
    
    # Add display names
    platform_options = []
    for platform in platform_list:
        display_name = Issue.get_platform_display_name(platform)
        platform_options.append({
            'code': platform,
            'display': display_name
        })
    
    return jsonify(platform_options)

@app.route('/api/builds', methods=['GET'])
def get_builds():
    """Get all available build options"""
    build_options = Issue.get_build_options()
    return jsonify(build_options)

@app.route('/api/targets/<release>', methods=['GET'])
def get_targets(release):
    """Get target options for a specific release"""
    target_options = Issue.get_target_options(release)
    return jsonify(target_options)

# File download endpoint
@app.route('/api/attachments/<int:attachment_id>', methods=['GET'])
def download_attachment(attachment_id):
    attachment = Attachment.query.get_or_404(attachment_id)
    return send_file(attachment.file_path, as_attachment=True, download_name=attachment.filename)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}) 