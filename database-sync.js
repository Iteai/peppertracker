class DatabaseSync {
    constructor() {
        // Usa variabili d'ambiente diverse per il database
        this.binId = this.getEnvironmentVariable('DATABASE_BIN_ID');
        this.apiKey = this.getEnvironmentVariable('API_KEY'); // Stessa API key, diverso bin
        this.localStorageKey = 'pepperDatabaseData'; // Diverso localStorage
        this.lastSyncKey = 'pepperDatabaseLastSync';

        console.log('🔧 Configurazione DatabaseSync:', {
            hasBinId: !!this.binId,
            hasApiKey: !!this.apiKey
        });
    }

    getEnvironmentVariable(key) {
        return this.getFromNetlifyEnv(key) ||
               this.getFromURLParams(key) ||
               this.getFallback(key);
    }

    getFromNetlifyEnv(key) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        return null;
    }

    getFromURLParams(key) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(key);
    }

    getFallback(key) {
        const fallbacks = {
            'DATABASE_BIN_ID': '68d27066d0ea881f4087bc46', // Diverso dal tracker
            'API_KEY': '$2a$10$NcHrspX7bTeSu4bSYMXaceFMq2i1gRYBbFktXEHebmJz/2hs4C7UO'
        };
        return fallbacks[key];
    }

    // Carica dati dal cloud
    async loadFromCloud() {
        if (!this.binId || !this.apiKey) {
            console.log('❌ Credenziali cloud mancanti');
            throw new Error('Credenziali cloud mancanti');
        }

        try {
            console.log('📡 Caricamento database dal cloud...');
            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.binId}/latest`, {
                headers: {
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Meta': 'false'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Database caricato dal cloud');
            return data;
        } catch (error) {
            console.error('❌ Errore sync database cloud:', error);
            throw new Error('Errore nel caricamento dal cloud');
        }
    }

    // Salva dati sul cloud
    async saveToCloud(data) {
        if (!this.binId || !this.apiKey) {
            console.log('❌ Credenziali cloud mancanti');
            return;
        }

        try {
            console.log('📡 Salvataggio database sul cloud...');
            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            console.log('✅ Database salvato sul cloud');
        } catch (error) {
            console.error('❌ Errore salvataggio database cloud:', error);
            throw error;
        }
    }

    // Carica dati dal localStorage
    loadFromLocal() {
        try {
            console.log('📱 Database caricato dal localStorage');
            const data = localStorage.getItem(this.localStorageKey);
            return data ? JSON.parse(data) : { databasePeppers: [], lastUpdate: new Date().toISOString() };
        } catch (error) {
            console.error('❌ Errore caricamento database localStorage:', error);
            return { databasePeppers: [], lastUpdate: new Date().toISOString() };
        }
    }

    // Salva dati nel localStorage
    saveToLocal(data) {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(data));
            localStorage.setItem(this.lastSyncKey, new Date().toISOString());
            console.log('✅ Database salvato localmente');
        } catch (error) {
            console.error('❌ Errore salvataggio database localStorage:', error);
        }
    }

    // Sincronizzazione intelligente
    async sync() {
        console.log('🔄 Inizio sincronizzazione database...');
        
        const localData = this.loadFromLocal();
        const hasLocalData = localData.databasePeppers && localData.databasePeppers.length > 0;
        
        try {
            const cloudData = await this.loadFromCloud();
            const hasCloudData = cloudData.databasePeppers && cloudData.databasePeppers.length > 0;
            
            if (!hasLocalData && hasCloudData) {
                console.log('☁️ Primo accesso database: caricamento dal cloud');
                this.saveToLocal(cloudData);
                console.log('✅ Sincronizzazione database completata');
                return cloudData;
            }
            
            if (hasLocalData && !hasCloudData) {
                console.log('📱 Primo upload database: caricamento locale sul cloud');
                await this.saveToCloud(localData);
                console.log('✅ Sincronizzazione database completata');
                return localData;
            }
            
            if (hasLocalData && hasCloudData) {
                const localDate = new Date(localData.lastUpdate || 0);
                const cloudDate = new Date(cloudData.lastUpdate || 0);
                
                let finalData;
                if (cloudDate > localDate) {
                    console.log('☁️ Database cloud più recente, aggiornamento locale');
                    finalData = cloudData;
                    this.saveToLocal(finalData);
                } else if (localDate > cloudDate) {
                    console.log('📱 Database locale più recente, aggiornamento cloud');
                    finalData = localData;
                    await this.saveToCloud(finalData);
                } else {
                    console.log('⚖️ Database sincronizzato');
                    finalData = localData;
                }
                
                console.log('✅ Sincronizzazione database completata');
                return finalData;
            }
            
            console.log('🆕 Nessun database disponibile, creazione dataset vuoto');
            const emptyData = { databasePeppers: [], lastUpdate: new Date().toISOString() };
            this.saveToLocal(emptyData);
            console.log('✅ Sincronizzazione database completata');
            return emptyData;
            
        } catch (error) {
            console.error('❌ Errore sincronizzazione database, uso dati locali');
            return localData;
        }
    }

    // Salva dati e sincronizza
    async saveData(data) {
        data.lastUpdate = new Date().toISOString();
        this.saveToLocal(data);
        
        try {
            await this.saveToCloud(data);
        } catch (error) {
            console.warn('⚠️ Errore sync database cloud, dati salvati localmente');
        }
    }

    // Forza sincronizzazione
    async forceSync() {
        return await this.sync();
    }

    // Testa la connessione
    async testConnection() {
        try {
            await this.loadFromCloud();
            return true;
        } catch (error) {
            return false;
        }
    }
}
