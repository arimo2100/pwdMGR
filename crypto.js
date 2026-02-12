const CryptoUtils = {
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(text, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(text)
        );
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);
        
        let binary = '';
        const bytes = new Uint8Array(combined);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    async decrypt(encryptedBase64, password) {
        try {
            const binaryString = atob(encryptedBase64);
            const combined = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                combined[i] = binaryString.charCodeAt(i);
            }
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            const key = await this.deriveKey(password, salt);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            return null;
        }
    },

    async hashPassword(password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        const combined = new Uint8Array(salt.length + derivedBits.byteLength);
        combined.set(salt, 0);
        combined.set(new Uint8Array(derivedBits), salt.length);
        
        let binary = '';
        const bytes = new Uint8Array(combined);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    async verifyPassword(password, storedHash) {
        const binaryString = atob(storedHash);
        const combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            combined[i] = binaryString.charCodeAt(i);
        }
        const salt = combined.slice(0, 16);
        const storedKey = combined.slice(16);
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        const derivedKey = new Uint8Array(derivedBits);
        if (derivedKey.length !== storedKey.length) return false;
        for (let i = 0; i < derivedKey.length; i++) {
            if (derivedKey[i] !== storedKey[i]) return false;
        }
        return true;
    }
};
