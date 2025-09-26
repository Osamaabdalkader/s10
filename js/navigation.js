// navigation.js - معدل (مع إضافة صفحة الشبكة)
class Navigation {
    static async showPage(pageId, params = {}) {
        console.log(`جاري تحميل الصفحة: ${pageId}`, params);
        
        // إظهار رسالة تحميل
        document.getElementById('dynamic-content').innerHTML = `
            <div class="loading-page">
                <div class="loading-spinner"></div>
                <p>جاري تحميل الصفحة...</p>
            </div>
        `;
        
        try {
            await Utils.loadPageContent(pageId);
            await this.initializePage(pageId, params);
            console.log(`تم تحميل الصفحة بنجاح: ${pageId}`);
        } catch (error) {
            console.error(`فشل في تحميل الصفحة: ${pageId}`, error);
            this.showErrorPage(error, pageId);
        }
    }

    static async initializePage(pageId, params = {}) {
        console.log(`جاري تهيئة الصفحة: ${pageId}`, params);
        
        // إعطاء وقت للعناصر لتصبح جاهزة في DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        switch (pageId) {
            case 'publish':
                this.handlePublishPage();
                break;
            case 'login':
                this.handleLoginPage();
                break;
            case 'register':
                this.handleRegisterPage();
                break;
            case 'profile':
                this.handleProfilePage();
                break;
            case 'home':
                Posts.loadPosts();
                break;
            case 'post-details':
                this.handlePostDetailsPage(params);
                break;
            case 'network':
                this.handleNetworkPage();
                break;
        }
        
        // إعادة ربط الأحداث بعد تهيئة الصفحة
        this.rebindPageEvents(pageId);
    }

    // إعادة ربط الأحداث الخاصة بالصفحة
    static rebindPageEvents(pageId) {
        console.log(`إعادة ربط أحداث الصفحة: ${pageId}`);
        
        // هذه الوظيفة تتعامل مع أي أحداث خاصة تحتاج إلى ربط يدوي
        // الأحداث الرئيسية تتم معالجتها عبر النظام العالمي في App.js
    }

    static handlePublishPage() {
        const publishContent = document.getElementById('publish-content');
        const loginRequired = document.getElementById('login-required-publish');
        
        if (publishContent && loginRequired) {
            if (!currentUser) {
                publishContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                publishContent.style.display = 'block';
                loginRequired.style.display = 'none';
            }
        }
    }

    static handleLoginPage() {
        // تنظيف رسائل الحالة عند تحميل الصفحة
        const statusEl = document.getElementById('login-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleRegisterPage() {
        // تنظيف رسائل الحالة عند تحميل الصفحة
        const statusEl = document.getElementById('register-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleProfilePage() {
        const profileContent = document.getElementById('profile-content');
        const loginRequired = document.getElementById('login-required-profile');
        
        if (profileContent && loginRequired) {
            if (!currentUser) {
                profileContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                profileContent.style.display = 'block';
                loginRequired.style.display = 'none';
                this.loadProfileData();
            }
        }
    }

    static handlePostDetailsPage(params) {
        if (params.postId) {
            PostDetails.loadPostDetails(params.postId);
        } else {
            PostDetails.showError();
        }
    }

    // معالجة صفحة الشبكة
    static handleNetworkPage() {
        const networkContent = document.getElementById('network-content');
        const loginRequired = document.getElementById('login-required-network');
        
        if (networkContent && loginRequired) {
            if (!currentUser) {
                networkContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                networkContent.style.display = 'block';
                loginRequired.style.display = 'none';
                this.loadNetworkData();
            }
        }
    }

    static loadProfileData() {
        if (currentUser) {
            const setName = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            setName('profile-name', currentUser.user_metadata.full_name || 'غير محدد');
            setName('profile-email', currentUser.email || 'غير محدد');
            setName('profile-phone', currentUser.user_metadata.phone || 'غير محدد');
            setName('profile-address', currentUser.user_metadata.address || 'غير محدد');
            setName('profile-created', new Date(currentUser.created_at).toLocaleString('ar-SA'));
        }
    }

    // تحميل بيانات الشبكة
    static async loadNetworkData() {
        try {
            // تحميل رمز الإحالة
            const referralCode = await ReferralSystem.getUserReferralCode();
            if (referralCode) {
                document.getElementById('referral-code-display').textContent = referralCode.code;
            } else {
                // إنشاء رمز إحالة جديد إذا لم يكن موجوداً
                const newCode = await ReferralSystem.createReferralCode();
                document.getElementById('referral-code-display').textContent = newCode.code;
            }

            // تحميل إحصائيات الشبكة
            const stats = await ReferralSystem.getUserNetworkStats();
            if (stats) {
                document.getElementById('direct-referrals-count').textContent = stats.direct_referrals_count;
                document.getElementById('total-network-count').textContent = stats.total_network_count;
                
                // حساب عدد المستويات النشطة
                const activeLevels = [stats.level_1_count, stats.level_2_count, stats.level_3_count, 
                                    stats.level_4_count, stats.level_5_count].filter(count => count > 0).length;
                document.getElementById('network-levels-count').textContent = activeLevels;
            }

            // تحميل الإحالات المباشرة
            await this.loadDirectReferrals();
            
            // تحميل الشجرة الكاملة
            await this.loadNetworkTree();

        } catch (error) {
            console.error('Error loading network data:', error);
            Utils.showStatus('خطأ في تحميل بيانات الشبكة', 'error');
        }
    }

    // تحميل قائمة الإحالات المباشرة
    static async loadDirectReferrals() {
        const referrals = await ReferralSystem.getDirectReferrals();
        const container = document.getElementById('direct-referrals-list');
        
        if (!referrals || referrals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>لا توجد إحالات مباشرة بعد</h3>
                    <p>ابدأ بمشاركة رمز الإحالة الخاص بك لزيادة شبكتك</p>
                </div>
            `;
            return;
        }

        let html = '';
        referrals.forEach(ref => {
            const user = ref.referred_user;
            const name = user.raw_user_meta_data?.full_name || 'مستخدم بدون اسم';
            const initial = name.charAt(0);
            const joinDate = new Date(ref.joined_at).toLocaleDateString('ar-SA');
            
            html += `
                <div class="referral-item">
                    <div class="referral-user-info">
                        <div class="referral-avatar">${initial}</div>
                        <div class="referral-details">
                            <h4>${name}</h4>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <div class="referral-date">${joinDate}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // تحميل الشجرة الشبكية
    static async loadNetworkTree() {
        const network = await ReferralSystem.getFullNetwork();
        const container = document.getElementById('network-tree');
        
        if (!network || network.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sitemap"></i>
                    <h3>الشبكة فارغة حالياً</h3>
                    <p>سيظهر هيكل الشبكة هنا عند وجود إحالات</p>
                </div>
            `;
            return;
        }

        // تجميع المستخدمين حسب العمق
        const levels = {};
        network.forEach(item => {
            if (!levels[item.depth]) {
                levels[item.depth] = [];
            }
            levels[item.depth].push(item);
        });

        let html = '';
        Object.keys(levels).sort().forEach(depth => {
            const users = levels[depth];
            html += `
                <div class="network-level">
                    <div class="level-header">
                        <strong>المستوى ${parseInt(depth) + 1}</strong> 
                        <span>(${users.length} عضو)</span>
                    </div>
                    <div class="level-users">
            `;
            
            users.forEach(user => {
                const userData = user.network_user;
                const name = userData.raw_user_meta_data?.full_name || 'مستخدم بدون اسم';
                const initial = name.charAt(0);
                
                html += `
                    <div class="user-node">
                        <div class="user-avatar">${initial}</div>
                        <div class="user-name">${name}</div>
                        <div class="user-email">${userData.email}</div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        });
        
        container.innerHTML = html;
    }

    static updateNavigation() {
        // تحديث عناصر الهيدر
        const headerElements = {
            'publish-link': currentUser,
            'profile-link': currentUser,
            'network-link': currentUser,
            'logout-link': currentUser,
            'login-link': !currentUser,
            'register-link': !currentUser
        };

        for (const [id, shouldShow] of Object.entries(headerElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = shouldShow ? 'list-item' : 'none';
            }
        }

        // تحديث أيقونات الفوتر
        const footerProfile = document.getElementById('footer-profile-link');
        const footerPublish = document.getElementById('footer-publish-link');
        const footerNetwork = document.getElementById('footer-network-link');
        
        if (footerProfile) {
            footerProfile.style.display = currentUser ? 'flex' : 'none';
        }
        if (footerPublish) {
            footerPublish.style.display = currentUser ? 'flex' : 'none';
        }
        if (footerNetwork) {
            footerNetwork.style.display = currentUser ? 'flex' : 'none';
        }
    }

    static showErrorPage(error, pageId) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="error-page">
                <h1 class="section-title">خطأ في تحميل الصفحة</h1>
                <p>تعذر تحميل الصفحة المطلوبة: ${pageId}</p>
                <p>الخطأ: ${error.message}</p>
                <button onclick="Navigation.showPage('home')">العودة إلى الرئيسية</button>
            </div>
        `;
    }
}