import os
import sqlite3
import hashlib
import base64
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

app = Flask(__name__)
app.secret_key = os.urandom(32)
CORS(app)

# 配置
DB_PATH = '/opt/Project/password-manager/db/passwords.db'
ENCRYPT_KEY_FILE = '/opt/Project/password-manager/db/.key'

class PasswordManager:
    def __init__(self):
        self.init_db()
        self.init_encryption()
    
    def init_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 分类表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                icon TEXT DEFAULT '📁',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 账号表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                username TEXT,
                password TEXT,
                url TEXT,
                category_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        ''')
        
        # 版本历史表
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
        
        # 插入默认分类
        default_categories = [
            ('社交媒体', '💬'),
            ('邮箱', '📧'),
            ('工作', '💼'),
            ('游戏', '🎮'),
            ('金融', '💰'),
            ('购物', '🛒'),
            ('开发', '👨‍💻'),
            ('其他', '📁')
        ]
        
        for name, icon in default_categories:
            cursor.execute('INSERT OR IGNORE INTO categories (name, icon) VALUES (?, ?)', (name, icon))
        
        conn.commit()
        conn.close()
    
    def init_encryption(self):
        """初始化加密密钥"""
        if os.path.exists(ENCRYPT_KEY_FILE):
            with open(ENCRYPT_KEY_FILE, 'rb') as f:
                self.key = f.read()
        else:
            self.key = Fernet.generate_key()
            os.makedirs(os.path.dirname(ENCRYPT_KEY_FILE), exist_ok=True)
            with open(ENCRYPT_KEY_FILE, 'wb') as f:
                f.write(self.key)
        
        self.cipher = Fernet(self.key)
    
    def encrypt(self, text):
        """加密文本"""
        if not text:
            return ''
        return self.cipher.encrypt(text.encode()).decode()
    
    def decrypt(self, encrypted_text):
        """解密文本"""
        if not encrypted_text:
            return ''
        try:
            return self.cipher.decrypt(encrypted_text.encode()).decode()
        except:
            return encrypted_text
    
    def get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

pm = PasswordManager()

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """获取所有分类"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories ORDER BY name')
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(categories)

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """获取所有账号"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    category_id = request.args.get('category_id')
    search = request.args.get('search', '')
    
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
        conditions.append('(a.title LIKE ? OR a.username LIKE ? OR a.url LIKE ?)')
        params.extend([f'%{search}%'] * 3)
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    query += ' ORDER BY a.updated_at DESC'
    
    cursor.execute(query, params)
    accounts = []
    for row in cursor.fetchall():
        account = dict(row)
        account['password'] = pm.decrypt(account['password'])
        accounts.append(account)
    
    conn.close()
    return jsonify(accounts)

@app.route('/api/accounts', methods=['POST'])
def create_account():
    """创建新账号"""
    data = request.json
    
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    encrypted_password = pm.encrypt(data.get('password', ''))
    
    cursor.execute('''
        INSERT INTO accounts (title, username, password, url, category_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title'),
        data.get('username'),
        encrypted_password,
        data.get('url'),
        data.get('category_id'),
        data.get('notes')
    ))
    
    account_id = cursor.lastrowid
    
    # 创建初始版本
    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, 1)
    ''', (account_id, data.get('username'), encrypted_password, data.get('notes')))
    
    conn.commit()
    conn.close()
    
    return jsonify({'id': account_id, 'message': '创建成功'}), 201

@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def get_account(account_id):
    """获取单个账号详情"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT a.*, c.name as category_name, c.icon as category_icon
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ?
    ''', (account_id,))
    
    row = cursor.fetchone()
    if not row:
        return jsonify({'error': '账号不存在'}), 404
    
    account = dict(row)
    account['password'] = pm.decrypt(account['password'])
    
    conn.close()
    return jsonify(account)

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def update_account(account_id):
    """更新账号"""
    data = request.json
    
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    # 获取当前版本号
    cursor.execute('SELECT MAX(version) as max_version FROM account_versions WHERE account_id = ?', (account_id,))
    result = cursor.fetchone()
    current_version = result['max_version'] if result['max_version'] else 0
    new_version = current_version + 1
    
    encrypted_password = pm.encrypt(data.get('password', ''))
    
    cursor.execute('''
        UPDATE accounts 
        SET title=?, username=?, password=?, url=?, category_id=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (
        data.get('title'),
        data.get('username'),
        encrypted_password,
        data.get('url'),
        data.get('category_id'),
        data.get('notes'),
        account_id
    ))
    
    # 保存新版本
    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, ?)
    ''', (account_id, data.get('username'), encrypted_password, data.get('notes'), new_version))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '更新成功', 'version': new_version})

@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    """删除账号"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '删除成功'})

@app.route('/api/accounts/<int:account_id>/versions', methods=['GET'])
def get_account_versions(account_id):
    """获取账号版本历史"""
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
    """恢复到指定版本"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    # 获取指定版本的数据
    cursor.execute('''
        SELECT * FROM account_versions 
        WHERE account_id = ? AND version = ?
    ''', (account_id, version))
    
    row = cursor.fetchone()
    if not row:
        return jsonify({'error': '版本不存在'}), 404
    
    version_data = dict(row)
    
    # 获取当前版本号
    cursor.execute('SELECT MAX(version) as max_version FROM account_versions WHERE account_id = ?', (account_id,))
    result = cursor.fetchone()
    new_version = result['max_version'] + 1
    
    # 更新账号
    cursor.execute('''
        UPDATE accounts 
        SET username=?, password=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (version_data['username'], version_data['password'], version_data['notes'], account_id))
    
    # 创建新版本记录
    cursor.execute('''
        INSERT INTO account_versions (account_id, username, password, notes, version)
        VALUES (?, ?, ?, ?, ?)
    ''', (account_id, version_data['username'], version_data['password'], version_data['notes'], new_version))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': f'已恢复到版本 {version}', 'new_version': new_version})

@app.route('/api/categories', methods=['POST'])
def create_category():
    """创建新分类"""
    data = request.json
    
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('INSERT INTO categories (name, icon) VALUES (?, ?)', 
                      (data.get('name'), data.get('icon', '📁')))
        conn.commit()
        category_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': category_id, 'message': '创建成功'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': '分类已存在'}), 400

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取统计信息"""
    conn = pm.get_connection()
    cursor = conn.cursor()
    
    # 总账号数
    cursor.execute('SELECT COUNT(*) as total FROM accounts')
    total = cursor.fetchone()['total']
    
    # 各分类账号数
    cursor.execute('''
        SELECT c.name, c.icon, COUNT(a.id) as count
        FROM categories c
        LEFT JOIN accounts a ON c.id = a.category_id
        GROUP BY c.id
        ORDER BY count DESC
    ''')
    categories_stats = [dict(row) for row in cursor.fetchall()]
    
    # 最近更新的账号
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
        'categories_stats': categories_stats,
        'recent_updates': recent_updates
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9090, debug=True)
