import os
import sqlite3
import json
import csv
import io
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from cryptography.fernet import Fernet

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.environ.get('DB_DIR', os.path.join(BASE_DIR, 'db'))
DB_PATH = os.environ.get('DB_PATH', os.path.join(DB_DIR, 'passwords.db'))
ENCRYPT_KEY_FILE = os.environ.get('ENCRYPT_KEY_FILE', os.path.join(DB_DIR, '.key'))

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'change-me-in-production')
CORS(app)

IS_DEBUG = os.environ.get('FLASK_ENV', 'development') != 'production'


class PasswordManager:
    def __init__(self):
        self.init_db()
        self.init_encryption()

    def init_db(self):
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                icon TEXT DEFAULT '📁',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                username TEXT,
                password TEXT,
                url TEXT,
                category_id INTEGER,
                notes TEXT,
                favorite INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS account_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                username TEXT,
                password TEXT,
                notes TEXT,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            )
        ''')

        # 兼容旧库：添加 favorite 列
        cursor.execute('PRAGMA table_info(accounts)')
        columns = [row[1] for row in cursor.fetchall()]
        if 'favorite' not in columns:
            cursor.execute('ALTER TABLE accounts ADD COLUMN favorite INTEGER DEFAULT 0')

        default_categories = [
            ('社交媒体', '💬'), ('邮箱', '📧'), ('工作', '💼'),
            ('游戏', '🎮'), ('金融', '💰'), ('购物', '🛒'),
            ('开发', '👨‍💻'), ('其他', '📁'),
        ]
        for name, icon in default_categories:
            cursor.execute(
                'INSERT OR IGNORE INTO categories (name, icon) VALUES (?, ?)',
                (name, icon),
            )

        conn.commit()
        conn.close()

    def init_encryption(self):
        if os.path.exists(ENCRYPT_KEY_FILE):
            with open(ENCRYPT_KEY_FILE, 'rb') as f:
                self.key = f.read()
        else:
            os.makedirs(os.path.dirname(ENCRYPT_KEY_FILE), exist_ok=True)
            self.key = Fernet.generate_key()
            with open(ENCRYPT_KEY_FILE, 'wb') as f:
                f.write(self.key)
        self.cipher = Fernet(self.key)

    def encrypt(self, text):
        if not text:
            return ''
        return self.cipher.encrypt(text.encode()).decode()

    def decrypt(self, encrypted_text):
        if not encrypted_text:
            return ''
        try:
            return self.cipher.decrypt(encrypted_text.encode()).decode()
        except Exception:
            return encrypted_text

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


pm = PasswordManager()


def row_to_account(row):
    account = dict(row)
    account['password'] = pm.decrypt(account['password'])
    return account


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/manifest.json')
def manifest():
    return jsonify({
        'name': '密码管理器',
        'short_name': '密码库',
        'description': '安全便捷的本地密码管理',
        'start_url': '/',
        'display': 'standalone',
        'background_color': '#f8fafc',
        'theme_color': '#6366f1',
        'orientation': 'portrait-primary',
        'icons': [
            {'src': '/static/favicon.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any'},
        ],
    })


@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories ORDER BY name')
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(categories)


@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    conn = pm.get_connection()
    cursor = conn.cursor()

    category_id = request.args.get('category_id')
    search = request.args.get('search', '').strip()
    favorite_only = request.args.get('favorite') == '1'
    sort_by = request.args.get('sort', 'updated_at')

    query = '''
        SELECT a.*, c.name as category_name, c.icon as category_icon
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
    '''
    params = []
    conditions = []

    if category_id:
        conditions.append('a.category_id = ?')
        params.append(category_id)
    if search:
        conditions.append(
            '(a.title LIKE ? OR a.username LIKE ? OR a.url LIKE ? OR a.notes LIKE ?)'
        )
        params.extend([f'%{search}%'] * 4)
    if favorite_only:
        conditions.append('a.favorite = 1')

    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)

    sort_map = {
        'title': 'a.title ASC',
        'created_at': 'a.created_at DESC',
        'updated_at': 'a.updated_at DESC',
        'favorite': 'a.favorite DESC, a.updated_at DESC',
    }
    query += f' ORDER BY {sort_map.get(sort_by, "a.updated_at DESC")}'

    cursor.execute(query, params)
    accounts = [row_to_account(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(accounts)


@app.route('/api/accounts', methods=['POST'])
def create_account():
    data = request.json or {}
    if not data.get('title', '').strip():
        return jsonify({'error': '标题不能为空'}), 400

    conn = pm.get_connection()
    cursor = conn.cursor()
    encrypted_password = pm.encrypt(data.get('password', ''))

    cursor.execute('''
        INSERT INTO accounts (title, username, password, url, category_id, notes, favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title').strip(),
        data.get('username'),
        encrypted_password,
        data.get('url'),
        data.get('category_id'),
        data.get('notes'),
        1 if data.get('favorite') else 0,
    ))

    account_id = cursor.lastrowid
    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, 1)
    ''', (account_id, data.get('username'), encrypted_password, data.get('notes')))

    conn.commit()
    conn.close()
    return jsonify({'id': account_id, 'message': '创建成功'}), 201


@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def get_account(account_id):
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, c.name as category_name, c.icon as category_icon
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ?
    ''', (account_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': '账号不存在'}), 404
    return jsonify(row_to_account(row))


@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def update_account(account_id):
    data = request.json or {}
    conn = pm.get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT MAX(version) as max_version FROM account_versions WHERE account_id = ?', (account_id,))
    result = cursor.fetchone()
    new_version = (result['max_version'] or 0) + 1
    encrypted_password = pm.encrypt(data.get('password', ''))

    cursor.execute('''
        UPDATE accounts
        SET title=?, username=?, password=?, url=?, category_id=?, notes=?,
            favorite=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (
        data.get('title'),
        data.get('username'),
        encrypted_password,
        data.get('url'),
        data.get('category_id'),
        data.get('notes'),
        1 if data.get('favorite') else 0,
        account_id,
    ))

    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, ?)
    ''', (account_id, data.get('username'), encrypted_password, data.get('notes'), new_version))

    conn.commit()
    conn.close()
    return jsonify({'message': '更新成功', 'version': new_version})


@app.route('/api/accounts/<int:account_id>/favorite', methods=['POST'])
def toggle_favorite(account_id):
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT favorite FROM accounts WHERE id = ?', (account_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': '账号不存在'}), 404

    new_val = 0 if row['favorite'] else 1
    cursor.execute(
        'UPDATE accounts SET favorite=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        (new_val, account_id),
    )
    conn.commit()
    conn.close()
    return jsonify({'favorite': new_val, 'message': '已更新收藏'})


@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '删除成功'})


@app.route('/api/accounts/<int:account_id>/versions', methods=['GET'])
def get_account_versions(account_id):
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM account_versions
        WHERE account_id = ?
        ORDER BY version DESC
    ''', (account_id,))
    versions = []
    for row in cursor.fetchall():
        version = dict(row)
        version['password'] = pm.decrypt(version['password'])
        versions.append(version)
    conn.close()
    return jsonify(versions)


@app.route('/api/accounts/<int:account_id>/restore/<int:version>', methods=['POST'])
def restore_version(account_id, version):
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM account_versions
        WHERE account_id = ? AND version = ?
    ''', (account_id, version))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': '版本不存在'}), 404

    version_data = dict(row)
    cursor.execute('SELECT MAX(version) as max_version FROM account_versions WHERE account_id = ?', (account_id,))
    new_version = cursor.fetchone()['max_version'] + 1

    cursor.execute('''
        UPDATE accounts
        SET username=?, password=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (version_data['username'], version_data['password'], version_data['notes'], account_id))

    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, ?)
    ''', (account_id, version_data['username'], version_data['password'], version_data['notes'], new_version))

    conn.commit()
    conn.close()
    return jsonify({'message': f'已恢复到版本 {version}', 'new_version': new_version})


@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': '分类名称不能为空'}), 400

    conn = pm.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO categories (name, icon) VALUES (?, ?)',
            (name, data.get('icon', '📁')),
        )
        conn.commit()
        category_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': category_id, 'message': '创建成功'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': '分类已存在'}), 400


@app.route('/api/export', methods=['GET'])
def export_data():
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, icon FROM categories')
    categories = [dict(row) for row in cursor.fetchall()]
    cursor.execute('SELECT * FROM accounts ORDER BY id')
    accounts = []
    for row in cursor.fetchall():
        acc = dict(row)
        acc['password'] = pm.decrypt(acc['password'])
        accounts.append(acc)
    conn.close()

    return jsonify({
        'version': 1,
        'exported_at': datetime.utcnow().isoformat() + 'Z',
        'categories': categories,
        'accounts': accounts,
    })


@app.route('/api/import', methods=['POST'])
def import_data():
    data = request.json or {}
    accounts_data = data.get('accounts', [])
    if not accounts_data:
        return jsonify({'error': '没有可导入的数据'}), 400

    conn = pm.get_connection()
    cursor = conn.cursor()
    imported = 0

    for acc in accounts_data:
        encrypted_password = pm.encrypt(acc.get('password', ''))
        cursor.execute('''
            INSERT INTO accounts (title, username, password, url, category_id, notes, favorite)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            acc.get('title', '未命名'),
            acc.get('username'),
            encrypted_password,
            acc.get('url'),
            acc.get('category_id'),
            acc.get('notes'),
            1 if acc.get('favorite') else 0,
        ))
        account_id = cursor.lastrowid
        cursor.execute('''
            INSERT INTO account_versions (account_id, username, password, notes, version)
            VALUES (?, ?, ?, ?, 1)
        ''', (account_id, acc.get('username'), encrypted_password, acc.get('notes')))
        imported += 1

    conn.commit()
    conn.close()
    return jsonify({'message': f'成功导入 {imported} 条账号', 'imported': imported})


@app.route('/api/import/parse', methods=['POST'])
def import_parse():
    file = request.files.get('file')
    text = request.form.get('text', '').strip()
    rows = []

    try:
        if file and file.filename:
            filename = file.filename.lower()
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                try:
                    import openpyxl
                except ImportError:
                    return jsonify({'error': '服务器未安装 openpyxl，无法解析 Excel 文件，请先安装依赖'}), 400
                wb = openpyxl.load_workbook(io.BytesIO(file.read()), data_only=True)
                ws = wb.active
                for row in ws.iter_rows(values_only=True):
                    rows.append([str(cell) if cell is not None else '' for cell in row])
            else:
                content = file.read().decode('utf-8-sig')
                delimiter = '\t' if '\t' in content.split('\n')[0] else ','
                reader = csv.reader(io.StringIO(content), delimiter=delimiter)
                rows = [row for row in reader]
        elif text:
            delimiter = '\t' if '\t' in text.split('\n')[0] else ','
            reader = csv.reader(io.StringIO(text), delimiter=delimiter)
            rows = [row for row in reader]
        else:
            return jsonify({'error': '请上传文件或粘贴数据'}), 400
    except Exception as e:
        return jsonify({'error': f'解析失败：{str(e)}'}), 400

    # 过滤空行
    rows = [row for row in rows if any(cell.strip() for cell in row)]
    return jsonify({'rows': rows, 'total': len(rows)})


@app.route('/api/import/batch', methods=['POST'])
def import_batch():
    data = request.json or {}
    items = data.get('items', [])
    if not items:
        return jsonify({'error': '没有可导入的数据'}), 400

    conn = pm.get_connection()
    cursor = conn.cursor()
    imported = 0
    errors = []

    for idx, item in enumerate(items):
        title = (item.get('title') or '').strip()
        if not title:
            errors.append(f'第 {idx + 1} 行：标题不能为空')
            continue
        try:
            encrypted_password = pm.encrypt(item.get('password', ''))
            cursor.execute('''
                INSERT INTO accounts (title, username, password, url, category_id, notes, favorite)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                title,
                item.get('username'),
                encrypted_password,
                item.get('url'),
                item.get('category_id'),
                item.get('notes'),
                1 if item.get('favorite') else 0,
            ))
            account_id = cursor.lastrowid
            cursor.execute('''
                INSERT INTO account_versions (account_id, username, password, notes, version)
                VALUES (?, ?, ?, ?, 1)
            ''', (account_id, item.get('username'), encrypted_password, item.get('notes')))
            imported += 1
        except Exception as e:
            errors.append(f'第 {idx + 1} 行：{str(e)}')

    conn.commit()
    conn.close()

    result = {'imported': imported, 'message': f'成功导入 {imported} 条账号'}
    if errors:
        result['errors'] = errors
        result['message'] += f'，{len(errors)} 条失败'
    return jsonify(result)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = pm.get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as total FROM accounts')
    total = cursor.fetchone()['total']

    cursor.execute('SELECT COUNT(*) as fav FROM accounts WHERE favorite = 1')
    favorites = cursor.fetchone()['fav']

    cursor.execute('''
        SELECT c.name, c.icon, COUNT(a.id) as count
        FROM categories c
        LEFT JOIN accounts a ON c.id = a.category_id
        GROUP BY c.id
        ORDER BY count DESC
    ''')
    categories_stats = [dict(row) for row in cursor.fetchall()]

    cursor.execute('''
        SELECT a.title, a.updated_at, c.icon as category_icon
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
        ORDER BY a.updated_at DESC
        LIMIT 5
    ''')
    recent_updates = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        'total_accounts': total,
        'favorite_accounts': favorites,
        'categories_stats': categories_stats,
        'recent_updates': recent_updates,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 9090))
    app.run(host='0.0.0.0', port=port, debug=IS_DEBUG)
