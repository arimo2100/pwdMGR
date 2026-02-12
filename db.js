const DB_NAME = 'PasswordManagerDB';
const DB_VERSION = 1;
const STORE_PASSWORDS = 'passwords';
const STORE_SETTINGS = 'settings';

let db = null;

const DB = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                
                if (!database.objectStoreNames.contains(STORE_PASSWORDS)) {
                    database.createObjectStore(STORE_PASSWORDS, { keyPath: 'id' });
                }
                
                if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
                    database.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
                }
            };
        });
    },
    
    async getPasswords() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PASSWORDS], 'readonly');
            const store = transaction.objectStore(STORE_PASSWORDS);
            const request = store.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    },
    
    async savePassword(password) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PASSWORDS], 'readwrite');
            const store = transaction.objectStore(STORE_PASSWORDS);
            const request = store.put(password);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },
    
    async deletePassword(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PASSWORDS], 'readwrite');
            const store = transaction.objectStore(STORE_PASSWORDS);
            const request = store.delete(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },
    
    async clearPasswords() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PASSWORDS], 'readwrite');
            const store = transaction.objectStore(STORE_PASSWORDS);
            const request = store.clear();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },
    
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SETTINGS], 'readonly');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.get(key);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result?.value);
        });
    },
    
    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.put({ key, value });
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },
    
    async clearAll() {
        await this.clearPasswords();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.clear();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
};
