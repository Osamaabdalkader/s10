// config.js
const CONFIG = {
    SUPABASE_URL: 'https://rrjocpzsyxefcsztazkd.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyam9jcHpzeXhlZmNzenRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTEzMTgsImV4cCI6MjA3Mzg2NzMxOH0.TvUthkBc_lnDdGlHJdEFUPo4Dl2n2oHyokXZE8_wodw',
    
    PAGE_FILES: {
        'home': 'home.html',
        'publish': 'publish.html',
        'login': 'login.html',
        'register': 'register.html',
        'profile': 'profile.html',
        'post-details': 'post-details.html',
        'network': 'network.html'
    },
    
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    SUCCESS_MESSAGE_DURATION: 3000
};

// تهيئة Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// المتغيرات العالمية
let currentUser = null;
let debugMode = false;