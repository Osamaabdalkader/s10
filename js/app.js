// js/app.js - الكود الرئيسي (محدث مع نظام الإحالة)
class App {
    static async init() {
        console.log('تهيئة التطبيق...');
        
        await this.testConnection();
        await Auth.checkAuth();
        Auth.initAuthListener();
        Navigation.showPage('home');
        
        // إعداد معالجة الأحداث العالمية
        this.setupGlobalEventHandlers();
        
        // تهيئة نظام الإحالة
        this.initReferralSystem();
        
        console.log('تم تهيئة التطبيق بنجاح');
    }

    static async testConnection() {
        try {
            const { data, error } = await supabase.from('marketing').select('count');
            if (error) throw error;
            Utils.showStatus('الاتصال مع قاعدة البيانات ناجح', 'success', 'connection-status');
        } catch (error) {
            Utils.showStatus(`خطأ في الاتصال: ${error.message}`, 'error', 'connection-status');
        }
    }

    // إعداد معالجات الأحداث العالمية
    static setupGlobalEventHandlers() {
        // معالجة النقر على المحتوى الديناميكي
        document.addEventListener('click', (event) => {
            EventHandlers.handleGlobalClick(event);
        });

        // معالجة تقديم النماذج
        document.addEventListener('submit', (event) => {
            EventHandlers.handleGlobalSubmit(event);
        });
    }

    // تهيئة نظام الإحالة
    static initReferralSystem() {
        // إضافة event listener لنسخ رمز الإحالة
        document.addEventListener('click', (event) => {
            if (event.target.id === 'copy-referral-code') {
                this.copyReferralCode();
            }
        });
    }

    // نسخ رمز الإحالة إلى الحافظة
    static async copyReferralCode() {
        const codeElement = document.getElementById('referral-code-display');
        if (!codeElement) return;

        const code = codeElement.textContent;
        try {
            await navigator.clipboard.writeText(code);
            Utils.showStatus('تم نسخ رمز الإحالة إلى الحافظة', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            Utils.showStatus('تم نسخ رمز الإحالة', 'success');
        }
    }

    static toggleDebug() {
        debugMode = !debugMode;
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.style.display = debugMode ? 'block' : 'none';
            if (debugMode) Utils.loadDebugInfo();
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
