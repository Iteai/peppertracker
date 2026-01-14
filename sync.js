/**
 * Pepper Tracker - Database Sync Module
 * Gestisce il salvataggio locale e la sincronizzazione dati
 */

// ============================================
// DATABASE SYNC - Local Storage Only
// ============================================

class DatabaseSync {
    constructor(storageKey = 'pepperTracker') {
        this.storageKey = storageKey;
        this.lastSync = null;
    }

    /**
     * Carica dati dal localStorage
     */
    loadFromLocal() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                console.log('📂 Dati caricati da localStorage');
                return parsed;
            }
            return this.getDefaultData();
        } catch (error) {
            console.error('❌ Errore caricamento localStorage:', error);
            return this.getDefaultData();
        }
    }

    /**
     * Salva dati nel localStorage
     */
    saveToLocal(data) {
        try {
            const dataWithTimestamp = {
                ...data,
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataWithTimestamp));
            console.log('💾 Dati salvati in localStorage');
            return true;
        } catch (error) {
            console.error('❌ Errore salvataggio localStorage:', error);
            return false;
        }
    }

    /**
     * Carica dati dal cloud (placeholder - per ora usa localStorage)
     */
    async loadFromCloud() {
        // Per ora ritorna i dati locali
        // In futuro: implementare chiamata API GitHub/cloud
        console.log('☁️ loadFromCloud: usando dati locali (cloud non configurato)');
        return this.loadFromLocal();
    }

    /**
     * Salva dati nel cloud (placeholder - per ora usa localStorage)
     */
    async saveToCloud(data) {
        // Per ora salva solo localmente
        // In futuro: implementare chiamata API GitHub/cloud
        console.log('☁️ saveToCloud: salvando localmente (cloud non configurato)');
        return this.saveToLocal(data);
    }

    /**
     * Sincronizza dati (carica e unisce)
     */
    async sync() {
        try {
            console.log('🔄 Sincronizzazione in corso...');

            // Per ora solo dati locali
            const localData = this.loadFromLocal();

            this.lastSync = new Date().toISOString();
            console.log('✅ Sincronizzazione completata');

            return localData;
        } catch (error) {
            console.error('❌ Errore sincronizzazione:', error);
            return this.loadFromLocal();
        }
    }

    /**
     * Salva dati con sincronizzazione
     */
    async saveData(data) {
        try {
            // Salva localmente
            this.saveToLocal(data);

            // Tenta sync cloud (placeholder)
            await this.saveToCloud(data);

            return true;
        } catch (error) {
            console.error('❌ Errore salvataggio dati:', error);
            throw error;
        }
    }

    /**
     * Carica dati con priorità cloud
     */
    async loadData() {
        try {
            return await this.sync();
        } catch (error) {
            console.error('❌ Errore caricamento dati:', error);
            return this.loadFromLocal();
        }
    }

    /**
     * Test connessione (placeholder)
     */
    async testConnection() {
        // Per ora ritorna sempre false (nessun cloud configurato)
        console.log('🔌 Test connessione: cloud non configurato');
        return false;
    }

    /**
     * Dati di default
     */
    getDefaultData() {
        return {
            peppers: [],
            databasePeppers: [],
            trackerEntries: [],
            diaryEntries: [],
            quickNotes: '',
            lastUpdate: null
        };
    }
}

// ============================================
// GITHUB SYNC - Alias per compatibilità
// ============================================

class GitHubSync extends DatabaseSync {
    constructor() {
        super('pepperTracker');
        console.log('📦 GitHubSync inizializzato (modalità localStorage)');
    }
}

// Esporta per uso globale
window.DatabaseSync = DatabaseSync;
window.GitHubSync = GitHubSync;

console.log('✅ Sync module caricato');
