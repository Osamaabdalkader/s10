// js/eventHandlers.js - معالجات الأحداث المنفصلة
class EventHandlers {
    // معالجة النقر العالمية
    static handleGlobalClick(event) {
        const target = event.target;
        
        // النقر على أزرار التنقل
        if (target.closest('a[onclick]')) {
            const onclick = target.closest('a[onclick]').getAttribute('onclick');
            if (onclick.includes('showPage')) {
                event.preventDefault();
                return;
            }
        }

        // النقر على أزرار داخل المحتوى الديناميكي
        if (target.closest('#dynamic-content')) {
            this.handleDynamicContentClick(event);
        }
    }

    // معالجة التقديم العالمية
    static handleGlobalSubmit(event) {
        if (event.target.tagName === 'FORM') {
            event.preventDefault();
            FormHandlers.handleFormSubmit(event.target);
        }
    }

    // معالجة النقر على المحتوى الديناميكي
    static handleDynamicContentClick(event) {
        const target = event.target;
        
        if (target.tagName === 'BUTTON' && target.onclick) {
            const onclick = target.getAttribute('onclick');
            if (onclick && onclick.includes('showPage')) {
                event.preventDefault();
                return false;
            }
        }
    }
}