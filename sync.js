class DatabaseSync {
    constructor() {
        // Leggi dalle variabili d'ambiente Netlify
        this.binId = this.getEnvironmentVariable('BIN_ID');
        this.apiKey = this.getEnvironmentVariable('API_KEY');
        this.localStorageKey = 'pepperTrackerData';
        this.lastSyncKey = 'pepperTrackerLastSync';

        console.log('🔧 Configurazione DatabaseSync:', {
            hasBinId: !!this.binId,
            hasApiKey: !!this.apiKey
        });
    }

    getEnvironmentVariable(key) {
        // Prova in ordine: Netlify env vars -> URL params -> fallback
        return this.getFromNetlifyEnv(key) ||
               this.getFromURLParams(key) ||
               this.getFallback(key);
    }

    getFromNetlifyEnv(key) {
        // Netlify injects env vars during build
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        return null;
    }

    getFromURLParams(key) {
        // Per testing locale: your-site.netlify.app?BIN_ID=xxx&API_KEY=yyy
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(key);
    }

    getFallback(key) {
        // Fallback per sviluppo locale
        const fallbacks = {
            'BIN_ID': '68d19787d0ea881f4086c3ed',
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
            console.log('📡 Caricamento dati dal cloud...');
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
            console.log('✅ Dati caricati dal cloud');
            return data;
        } catch (error) {
            console.error('❌ Errore sync cloud:', error);
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
            console.log('📡 Salvataggio dati sul cloud...');
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

            console.log('✅ Dati salvati sul cloud');
        } catch (error) {
            console.error('❌ Errore salvataggio cloud:', error);
            throw error;
        }
    }

    // Carica dati dal localStorage
    loadFromLocal() {
        try {
            console.log('📱 Dati caricati dal localStorage');
            const data = localStorage.getItem(this.localStorageKey);
            return data ? JSON.parse(data) : { peppers: [], lastUpdate: new Date().toISOString() };
        } catch (error) {
            console.error('❌ Errore caricamento localStorage:', error);
            return { peppers: [], lastUpdate: new Date().toISOString() };
        }
    }

    // Salva dati nel localStorage
    saveToLocal(data) {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(data));
            localStorage.setItem(this.lastSyncKey, new Date().toISOString());
            console.log('✅ Dati salvati localmente');
        } catch (error) {
            console.error('❌ Errore salvataggio localStorage:', error);
        }
    }

    // Sincronizzazione intelligente
    async sync() {
        console.log('🔄 Inizio sincronizzazione...');
        
        // Carica dati locali
        const localData = this.loadFromLocal();
        const hasLocalData = localData.peppers && localData.peppers.length > 0;
        
        try {
            // Prova a caricare dal cloud
            const cloudData = await this.loadFromCloud();
            const hasCloudData = cloudData.peppers && cloudData.peppers.length > 0;
            
            // Se non ci sono dati locali ma ci sono dati cloud, usa il cloud
            if (!hasLocalData && hasCloudData) {
                console.log('☁️ Primo accesso: caricamento dati dal cloud');
                this.saveToLocal(cloudData);
                console.log('✅ Sincronizzazione completata');
                return cloudData;
            }
            
            // Se non ci sono dati cloud ma ci sono dati locali, usa i dati locali
            if (hasLocalData && !hasCloudData) {
                console.log('📱 Primo upload: caricamento dati locali sul cloud');
                await this.saveToCloud(localData);
                console.log('✅ Sincronizzazione completata');
                return localData;
            }
            
            // Se entrambi hanno dati, confronta le date
            if (hasLocalData && hasCloudData) {
                const localDate = new Date(localData.lastUpdate || 0);
                const cloudDate = new Date(cloudData.lastUpdate || 0);
                
                let finalData;
                if (cloudDate > localDate) {
                    console.log('☁️ Dati cloud più recenti, aggiornamento locale');
                    finalData = cloudData;
                    this.saveToLocal(finalData);
                } else if (localDate > cloudDate) {
                    console.log('📱 Dati locali più recenti, aggiornamento cloud');
                    finalData = localData;
                    await this.saveToCloud(finalData);
                } else {
                    console.log('⚖️ Dati sincronizzati');
                    finalData = localData;
                }
                
                console.log('✅ Sincronizzazione completata');
                return finalData;
            }
            
            // Se nessuno ha dati, crea dataset vuoto
            console.log('🆕 Nessun dato disponibile, creazione dataset vuoto');
            const emptyData = { peppers: [], lastUpdate: new Date().toISOString() };
            this.saveToLocal(emptyData);
            console.log('✅ Sincronizzazione completata');
            return emptyData;
            
        } catch (error) {
            console.error('❌ Errore sincronizzazione, uso dati locali');
            return localData;
        }
    }

    // Salva dati e sincronizza
    async saveData(data) {
        // Aggiorna timestamp
        data.lastUpdate = new Date().toISOString();
        
        // Salva localmente
        this.saveToLocal(data);
        
        // Prova a salvare sul cloud
        try {
            await this.saveToCloud(data);
        } catch (error) {
            console.warn('⚠️ Errore sync cloud, dati salvati localmente');
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
