/**
 * GitHub-based sync system for Pepper Tracker
 * Uses GitHub repository as free, unlimited JSON storage
 */
class GitHubSync {
    constructor() {
        // CONFIGURAZIONE - AGGIORNA QUESTI VALORI!
        this.owner = 'Iteai'; // ⬅️ SOSTITUISCI con il tuo username GitHub
        this.repo = 'peppertracker'; // ⬅️ Nome del tuo repository
        this.branch = 'main'; // ⬅️ Branch (main o master)
        this.token = null; // ⬅️ Optional: Personal Access Token per repo privati
        
        this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents`;
        this.dataFiles = {
            peppers: 'data/peppers.json',
            diaryEntries: 'data/diary.json',
            quickNotes: 'data/notes.json',
            trackerData: 'data/tracker.json',
            genealogy: 'data/genealogy.json'
        };
        
        console.log('🔄 GitHubSync initialized:', {
            owner: this.owner,
            repo: this.repo,
            branch: this.branch
        });
    }
    
    /**
     * Save single file to GitHub
     */
    async saveFileToGitHub(filename, data) {
        try {
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            const url = `${this.baseUrl}/${filename}`;
            
            // Get current file SHA if exists
            let sha = null;
            try {
                const response = await fetch(url, {
                    headers: this.getHeaders()
                });
                if (response.ok) {
                    const fileData = await response.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                // File doesn't exist, that's ok for new files
            }
            
            const body = {
                message: `Update ${filename} - ${new Date().toISOString()}`,
                content: content,
                branch: this.branch
            };
            
            if (sha) {
                body.sha = sha;
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`GitHub API error ${response.status}: ${errorData}`);
            }
            
            console.log(`✅ Saved to GitHub: ${filename}`);
            return true;
            
        } catch (error) {
            console.error(`❌ GitHub save error for ${filename}:`, error);
            return false;
        }
    }
    
    /**
     * Load single file from GitHub - ROBUST VERSION
     */
    async loadFileFromGitHub(filename) {
        try {
            const url = `${this.baseUrl}/${filename}`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`📄 File not found on GitHub: ${filename}`);
                    return null;
                }
                throw new Error(`GitHub API error ${response.status}`);
            }
            
            const fileData = await response.json();
            let content = decodeURIComponent(escape(atob(fileData.content)));
            
            // Handle empty files and whitespace
            content = content.trim();
            if (!content || content === '') {
                console.log(`📄 Empty file on GitHub: ${filename}`);
                return null;
            }
            
            try {
                const parsedData = JSON.parse(content);
                
                // Handle peppers.json special structure
                if (filename === 'data/peppers.json' && parsedData.peppers) {
                    console.log('🔄 Converting peppers.json structure');
                    return parsedData.peppers; // Return just the array
                }
                
                return parsedData;
            } catch (parseError) {
                console.error(`❌ JSON parse error for ${filename}:`, parseError);
                console.log('Raw content:', content.substring(0, 200) + '...');
                return null;
            }
            
        } catch (error) {
            console.error(`❌ GitHub load error for ${filename}:`, error);
            return null;
        }
    }
    
    /**
     * Get headers for GitHub API
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        
        return headers;
    }
    
    /**
     * Save to local storage
     */
    saveToLocal(data) {
        try {
            localStorage.setItem('pepperTracker', JSON.stringify(data));
            console.log('💾 Saved to local storage');
        } catch (error) {
            console.error('❌ Local storage error:', error);
        }
    }
    
    /**
     * Load from local storage
     */
    loadFromLocal() {
        try {
            const data = localStorage.getItem('pepperTracker');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('❌ Local storage load error:', error);
            return {};
        }
    }
    
    /**
     * Save data to GitHub (all files)
     */
    async saveToCloud(data) {
        console.log('☁️ Saving to GitHub...');
        
        const results = await Promise.allSettled([
            this.saveFileToGitHub(this.dataFiles.peppers, data.peppers || []),
            this.saveFileToGitHub(this.dataFiles.diaryEntries, data.diaryEntries || []),
            this.saveFileToGitHub(this.dataFiles.quickNotes, data.quickNotes || ''),
            this.saveFileToGitHub(this.dataFiles.trackerData, data.trackerData || []),
            this.saveFileToGitHub(this.dataFiles.genealogy, data.genealogy || {})
        ]);
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const total = results.length;
        
        console.log(`✅ GitHub sync: ${successful}/${total} files saved`);
        
        if (successful > 0) {
            console.log('✅ Data saved to GitHub');
            return true;
        } else {
            throw new Error('Failed to save any files to GitHub');
        }
    }
    
    /**
     * Load data from GitHub (all files)
     */
    async loadFromCloud() {
        console.log('📡 Loading from GitHub...');
        
        const results = await Promise.allSettled([
            this.loadFileFromGitHub(this.dataFiles.peppers),
            this.loadFileFromGitHub(this.dataFiles.diaryEntries),
            this.loadFileFromGitHub(this.dataFiles.quickNotes),
            this.loadFileFromGitHub(this.dataFiles.trackerData),
            this.loadFileFromGitHub(this.dataFiles.genealogy)
        ]);
        
        const data = {
            peppers: results[0].status === 'fulfilled' ? results[0].value || [] : [],
            diaryEntries: results[1].status === 'fulfilled' ? results[1].value || [] : [],
            quickNotes: results[2].status === 'fulfilled' ? results[2].value || '' : '',
            trackerData: results[3].status === 'fulfilled' ? results[3].value || [] : [],
            genealogy: results[4].status === 'fulfilled' ? results[4].value || {} : {},
            lastUpdate: new Date().toISOString()
        };
        
        const loadedFiles = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        console.log(`📡 GitHub load: ${loadedFiles}/${results.length} files loaded`);
        
        return data;
    }
    
    /**
     * Main save method
     */
    async saveData(data) {
        // Always save locally first
        this.saveToLocal(data);
        
        // Try to save to GitHub
        try {
            await this.saveToCloud(data);
        } catch (error) {
            console.error('❌ GitHub save failed, data saved locally only');
        }
    }
    
    /**
     * Main load method
     */
    async loadData() {
        try {
            // Try to load from GitHub first
            const cloudData = await this.loadFromCloud();
            
            // If successful, save locally and return
            if (cloudData && Object.keys(cloudData).length > 1) {
                this.saveToLocal(cloudData);
                return cloudData;
            }
        } catch (error) {
            console.error('❌ GitHub load failed, using local data');
        }
        
        // Fallback to local data
        return this.loadFromLocal();
    }
}

// Compatibility class for existing code
class DatabaseSync extends GitHubSync {
    constructor() {
        super();
        console.log('🔄 DatabaseSync initialized with GitHub backend');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GitHubSync, DatabaseSync };
}
